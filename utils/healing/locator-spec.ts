import { Page, Locator } from '@playwright/test';

/**
 * A semantic Playwright locator described as data rather than code.
 * Both healing tiers produce one of these, so a healed locator can be
 * (a) executed without eval() and (b) recorded as a copy-pasteable
 * `getBy*(...)` expression that respects the QA-BIBLE locator rules.
 */
export type LocatorMethod = 'getByRole' | 'getByLabel' | 'getByPlaceholder' | 'getByText' | 'getByTestId';

export interface LocatorSpec {
  method: LocatorMethod;
  /** Role for getByRole, otherwise the text / test id. */
  arg: string;
  /** Accessible name (getByRole only). */
  name?: string;
  exact?: boolean;
}

const METHODS: LocatorMethod[] = ['getByRole', 'getByLabel', 'getByPlaceholder', 'getByText', 'getByTestId'];

function quote(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function unquote(body: string): string {
  return body.replace(/\\(.)/g, '$1');
}

export function toExpression(spec: LocatorSpec): string {
  const opts: string[] = [];
  if (spec.method === 'getByRole' && spec.name !== undefined) opts.push(`name: ${quote(spec.name)}`);
  if (spec.exact) opts.push('exact: true');
  const optStr = opts.length ? `, { ${opts.join(', ')} }` : '';
  return `${spec.method}(${quote(spec.arg)}${optStr})`;
}

export function toLocator(page: Page, spec: LocatorSpec): Locator {
  const exact = spec.exact ? { exact: true } : undefined;
  switch (spec.method) {
    case 'getByRole':
      return page.getByRole(spec.arg as Parameters<Page['getByRole']>[0], {
        ...(spec.name !== undefined ? { name: spec.name } : {}),
        ...exact,
      });
    case 'getByLabel':
      return page.getByLabel(spec.arg, exact);
    case 'getByPlaceholder':
      return page.getByPlaceholder(spec.arg, exact);
    case 'getByText':
      return page.getByText(spec.arg, exact);
    case 'getByTestId':
      return page.getByTestId(spec.arg);
  }
}

const STRING = String.raw`(['"])((?:\\.|(?!\2).)*)\2`;
const EXPR_RE = new RegExp(String.raw`^(\w+)\(\s*${STRING}\s*(?:,\s*\{([^}]*)\}\s*)?\)$`);
const NAME_RE = /name\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/;
const EXACT_RE = /exact\s*:\s*true/;

/**
 * Parses a single `getBy*(...)` expression (as returned by the Tier-2 model)
 * into a LocatorSpec. Anything else — chained calls, CSS, XPath, arbitrary
 * code — returns null and is rejected, so model output is never executed.
 */
export function parseExpression(raw: string): LocatorSpec | null {
  const cleaned = raw
    .trim()
    .replace(/^```\w*\s*|\s*```$/g, '')
    .replace(/^`|`$/g, '')
    .replace(/^(await\s+)?page\./, '')
    .replace(/;$/, '')
    .trim();

  const m = EXPR_RE.exec(cleaned);
  if (!m || !METHODS.includes(m[1] as LocatorMethod)) return null;

  const spec: LocatorSpec = { method: m[1] as LocatorMethod, arg: unquote(m[3]) };
  const opts = m[4];
  if (opts) {
    const nameMatch = NAME_RE.exec(opts);
    if (nameMatch && spec.method === 'getByRole') spec.name = unquote(nameMatch[2]);
    if (EXACT_RE.test(opts)) spec.exact = true;
  }
  return spec;
}
