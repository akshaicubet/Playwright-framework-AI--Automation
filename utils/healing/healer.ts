import { Page, Locator, test } from '@playwright/test';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { rankMatches, CandidateElement } from './fuzzy-match';
import { LocatorSpec, parseExpression, toExpression, toLocator } from './locator-spec';

const HEALED_MAP_PATH = path.resolve(__dirname, 'healed-locators.json');
const LOCK_PATH = `${HEALED_MAP_PATH}.lock`;
const REPO_ROOT = path.resolve(__dirname, '../..');
const SIMILARITY_THRESHOLD = Number(process.env.HEALING_SIMILARITY_THRESHOLD || 0.8);
const AI_HEALING_ENABLED = process.env.ENABLE_AI_HEALING === 'true';
const HEALING_MODEL = process.env.CLAUDE_HEALING_MODEL || 'claude-haiku-5-5';
/** How many of the top Tier-1 fuzzy matches to try before escalating. */
const MAX_TIER1_ATTEMPTS = 3;

export interface HealedEntry {
  originalDescriptor: string;
  /** Semantic `getBy*(...)` expression — paste into the spec as `page.<newSelector>`. */
  newSelector: string;
  matchedOn: string;
  specFile?: string;
  testTitle?: string;
  healedAt: string;
  tier: 1 | 2;
}

type HealedMap = Record<string, HealedEntry>;

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Parallel workers all write the same JSON map; serialize read-modify-write
 * with a mkdir lock (atomic on every OS) so heals from one worker don't
 * overwrite another's. Locks older than 10s are treated as stale.
 */
function withMapLock(fn: () => void) {
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      fs.mkdirSync(LOCK_PATH);
      try {
        fn();
      } finally {
        fs.rmSync(LOCK_PATH, { recursive: true, force: true });
      }
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      try {
        if (Date.now() - fs.statSync(LOCK_PATH).mtimeMs > 10_000) fs.rmSync(LOCK_PATH, { recursive: true, force: true });
      } catch {
        // lock released between checks — just retry
      }
      sleepSync(25);
    }
  }
  console.error('[self-heal] Could not acquire healed-locators.json lock; heal not recorded.');
}

function loadHealedMap(): HealedMap {
  try {
    return JSON.parse(fs.readFileSync(HEALED_MAP_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveHealedMap(map: HealedMap) {
  const tmp = `${HEALED_MAP_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(map, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmp, HEALED_MAP_PATH);
}

/**
 * Pulls a lightweight list of interactive elements currently on the page.
 * Kept intentionally small (role, id, name, testid, aria-label, label,
 * placeholder, visible text) — this is the "AXTree-style" light payload,
 * never full HTML.
 */
async function getInteractiveCandidates(page: Page): Promise<CandidateElement[]> {
  return page.evaluate(() => {
    const implicitRole = (el: Element): string | null => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'button') return 'button';
      if (tag === 'a') return el.hasAttribute('href') ? 'link' : null;
      if (tag === 'textarea') return 'textbox';
      if (tag === 'select') return (el as HTMLSelectElement).multiple ? 'listbox' : 'combobox';
      if (tag === 'input') {
        const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
        const byType: Record<string, string> = {
          checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button', reset: 'button',
          range: 'slider', number: 'spinbutton', search: 'searchbox',
        };
        return byType[type] ?? (type === 'hidden' || type === 'file' ? null : 'textbox');
      }
      return null;
    };

    const selector =
      'button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="menuitem"], [role="option"]';
    const clean = (s: string | null | undefined) => (s ? s.replace(/\s+/g, ' ').trim().slice(0, 80) : null);

    return Array.from(document.querySelectorAll(selector))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, 150) // cap payload size
      .map((el) => {
        const attr = (n: string) => el.getAttribute(n);
        const labels = (el as HTMLInputElement).labels;
        return {
          tag: el.tagName.toLowerCase(),
          role: attr('role') || implicitRole(el),
          id: attr('id'),
          name: attr('name'),
          testId: attr('data-testid'),
          ariaLabel: clean(attr('aria-label')),
          label: labels && labels.length ? clean(labels[0].textContent) : null,
          placeholder: clean(attr('placeholder')),
          text: clean(el.textContent),
        };
      });
  });
}

/**
 * Turns a matched candidate into semantic locator options, in QA-BIBLE
 * priority order: getByRole > getByLabel > getByPlaceholder > getByText > getByTestId.
 */
function semanticSpecsFor(c: CandidateElement): LocatorSpec[] {
  const specs: LocatorSpec[] = [];
  const accessibleName = c.ariaLabel || c.label || c.text;
  if (c.role && accessibleName) specs.push({ method: 'getByRole', arg: c.role, name: accessibleName, exact: true });
  if (c.label) specs.push({ method: 'getByLabel', arg: c.label, exact: true });
  if (c.placeholder) specs.push({ method: 'getByPlaceholder', arg: c.placeholder, exact: true });
  if (c.text && !['input', 'select', 'textarea'].includes(c.tag)) specs.push({ method: 'getByText', arg: c.text, exact: true });
  if (c.testId) specs.push({ method: 'getByTestId', arg: c.testId });
  return specs;
}

/** Returns the first spec that resolves to exactly one element on the page. */
async function firstUniqueSpec(page: Page, specs: LocatorSpec[]): Promise<LocatorSpec | null> {
  for (const spec of specs) {
    if ((await toLocator(page, spec).count()) === 1) return spec;
  }
  return null;
}

let anthropic: Anthropic | null = null;

/**
 * Tier 2: sends only a tiny HTML snippet (nearest form/main container) to a
 * small Claude model, asking for a single locator expression back. Costs a
 * handful of tokens — never the full page DOM. The reply is parsed into a
 * LocatorSpec and rejected unless it is a plain `getBy*(...)` call.
 */
async function aiHeal(page: Page, descriptor: string, actionType: string): Promise<LocatorSpec | null> {
  if (!AI_HEALING_ENABLED) return null;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[self-heal] ENABLE_AI_HEALING is true but ANTHROPIC_API_KEY is not set; skipping Tier-2.');
    return null;
  }

  const microDom = await page.evaluate(() => {
    const container = document.querySelector('form') || document.querySelector('main') || document.body;
    return container.outerHTML.slice(0, 2000); // hard cap ~2000 chars
  });

  const prompt = `A Playwright locator failed for a "${actionType}" action.
Original descriptor: "${descriptor}"
Here is the relevant HTML snippet (parent container only):
${microDom}

Reply with ONLY one Playwright locator call that best matches the original intent, using one of:
getByRole('<role>', { name: '<name>' }), getByLabel('<text>'), getByPlaceholder('<text>'), getByText('<text>'), getByTestId('<id>').
No "page." prefix, no chaining, no CSS or XPath, no explanation, no markdown.`;

  try {
    anthropic ??= new Anthropic();
    const res = await anthropic.messages.create({
      model: HEALING_MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
    });
    if (res.stop_reason === 'refusal') {
      console.warn('[self-heal] Tier-2 model declined the request.');
      return null;
    }
    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
    const spec = parseExpression(text);
    if (!spec) console.warn(`[self-heal] Tier-2 reply was not a plain getBy* locator, ignoring: ${text.slice(0, 200)}`);
    return spec;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[self-heal] Tier-2 healing: ANTHROPIC_API_KEY was rejected.');
    } else if (err instanceof Anthropic.RateLimitError) {
      console.error('[self-heal] Tier-2 healing: rate limited.');
    } else if (err instanceof Anthropic.APIError) {
      console.error(`[self-heal] Tier-2 healing API error ${err.status}:`, err.message);
    } else {
      console.error('[self-heal] Tier-2 AI healing request failed:', err);
    }
    return null;
  }
}

export interface HealOptions {
  /** Human-readable description of what we were trying to find, e.g. "Submit button" */
  descriptor: string;
  actionType: 'click' | 'fill' | 'check' | 'select' | 'hover';
  value?: string; // for fill/select
}

/**
 * Wraps a Playwright action with 2-tier self-healing.
 * Usage: await heal(page, () => page.getByRole('button', {name: 'Submit'}), { descriptor: 'Submit button', actionType: 'click' })
 */
export async function heal(
  page: Page,
  getLocator: () => Locator,
  options: HealOptions
): Promise<void> {
  const { descriptor, actionType, value } = options;

  const attemptAction = async (locator: Locator) => {
    switch (actionType) {
      case 'click':
        return locator.click({ timeout: 5000 });
      case 'fill':
        return locator.fill(value ?? '', { timeout: 5000 });
      case 'check':
        return locator.check({ timeout: 5000 });
      case 'select':
        return locator.selectOption(value ?? '', { timeout: 5000 });
      case 'hover':
        return locator.hover({ timeout: 5000 });
    }
  };

  try {
    await attemptAction(getLocator());
    return; // happy path — original locator worked, 0 tokens spent
  } catch (originalError) {
    console.warn(`[self-heal] Locator failed for "${descriptor}". Attempting Tier-1 fuzzy match...`);

    // ---- Tier 1: deterministic fuzzy DOM match (0 tokens) ----
    const candidates = await getInteractiveCandidates(page);
    const matches = rankMatches(descriptor, candidates, SIMILARITY_THRESHOLD).slice(0, MAX_TIER1_ATTEMPTS);

    for (const match of matches) {
      const spec = await firstUniqueSpec(page, semanticSpecsFor(match.candidate));
      if (!spec) continue; // no unambiguous semantic locator for this element
      const expression = toExpression(spec);
      console.warn(`[self-heal] Tier-1 match (${(match.score * 100).toFixed(0)}% on ${match.matchedOn}): ${expression}`);
      try {
        await attemptAction(toLocator(page, spec));
        recordHeal(descriptor, expression, match.matchedOn, 1);
        return;
      } catch {
        console.warn('[self-heal] Tier-1 candidate failed the actual action, trying next...');
      }
    }

    // ---- Tier 2: micro-context AI healing (minimal tokens) ----
    console.warn('[self-heal] Escalating to Tier-2 AI healing (micro-DOM)...');
    const aiSpec = await aiHeal(page, descriptor, actionType);

    if (aiSpec) {
      try {
        await attemptAction(toLocator(page, aiSpec));
        recordHeal(descriptor, toExpression(aiSpec), 'ai-tier2', 2);
        return;
      } catch (tier2Error) {
        console.error('[self-heal] Tier-2 AI suggestion also failed:', tier2Error);
      }
    }

    // Both tiers exhausted — surface the original error so CI fails loudly.
    throw originalError;
  }
}

function currentTest(): { specFile?: string; testTitle?: string } {
  try {
    const info = test.info();
    return { specFile: path.relative(REPO_ROOT, info.file).split(path.sep).join('/'), testTitle: info.titlePath.slice(1).join(' › ') };
  } catch {
    return {}; // heal() called outside a running test
  }
}

function recordHeal(descriptor: string, newSelector: string, matchedOn: string, tier: 1 | 2) {
  const { specFile, testTitle } = currentTest();
  // Keyed per spec file so the same descriptor in two specs doesn't collide.
  const key = specFile ? `${specFile} :: ${descriptor}` : descriptor;
  withMapLock(() => {
    const map = loadHealedMap();
    map[key] = {
      originalDescriptor: descriptor,
      newSelector,
      matchedOn,
      specFile,
      testTitle,
      healedAt: new Date().toISOString(),
      tier,
    };
    saveHealedMap(map);
  });
  console.warn(
    `[self-heal] Healed "${descriptor}" -> page.${newSelector} (Tier ${tier}). Run /heal-apply to make this permanent.`
  );
}
