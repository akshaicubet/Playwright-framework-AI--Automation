# Self-Healing Locators (Tier-1 + Tier-2)

## Using it in a test

```ts
import { test, expect } from '../../fixtures/healing-fixture';

test('checkout', async ({ page, heal }) => {
  await heal(() => page.getByRole('button', { name: 'Place Order' }), {
    descriptor: 'Place Order button',
    actionType: 'click',
  });
});
```

`heal()` tries the locator you gave it first — if it works, **nothing else
happens, zero overhead**. Healing logic only activates on actual failure.

Supported `actionType`s: `click`, `fill`, `check`, `select`, `hover`. For
`fill`/`select`, pass `value` in the options object.

## Tier 1 — Deterministic fuzzy match (0 tokens)

When the given locator throws:

1. The page's currently visible interactive elements
   (`button, a, input, select, textarea, [role=...]`) are collected into a
   lightweight list — tag, role (explicit or implicit), id, name,
   `data-testid`, `aria-label`, associated `<label>` text, placeholder,
   trimmed visible text. Capped at 150 elements to bound cost.
2. `utils/healing/fuzzy-match.ts` runs normalized Levenshtein similarity
   between your `descriptor` string and each candidate's attributes. Role
   words in the descriptor ("button", "field", "link", ...) are also
   stripped before comparing, so `"Sign In button"` matches text `"Sign In"`.
3. For each of the top 3 matches scoring ≥ `HEALING_SIMILARITY_THRESHOLD`
   (default `0.8`, set in `.env`), a **semantic** locator is built in
   QA-BIBLE priority order (`getByRole` > `getByLabel` > `getByPlaceholder`
   > `getByText` > `getByTestId`). The first one that resolves to exactly
   one element is used to retry the action.
4. On success, the fix is recorded in `utils/healing/healed-locators.json`
   with `tier: 1`. The recorded `newSelector` is that semantic expression,
   so it can be pasted straight into the spec.

This entire tier is pure string comparison and DOM querying — **no network
call, no LLM, effectively free and instant.**

## Tier 2 — Micro-context AI healing (minimal tokens)

Only reached if Tier-1 finds no confident match.

1. A small HTML snippet is extracted — the nearest `<form>` or `<main>`
   container (falls back to `<body>`), hard-capped at ~2000 characters. This
   is never the full page.
2. A single-shot prompt is sent to `claude-haiku-5-5` (configurable
   via `CLAUDE_HEALING_MODEL`) asking for **one Playwright locator
   expression back, nothing else** — no explanation, no markdown fencing.
3. The reply is parsed, never `eval`'d: only a single plain
   `getByRole/getByLabel/getByPlaceholder/getByText/getByTestId(...)` call is
   accepted (see `utils/healing/locator-spec.ts`). Anything else (chained
   calls, CSS, XPath, arbitrary code) is rejected. The action is then
   retried; on success it is recorded with `tier: 2`.
4. If Tier-2 also fails, the original error is re-thrown so CI fails loudly
   — the framework never silently skips a broken assertion.

Enable/disable with `ENABLE_AI_HEALING=true|false` and set
`ANTHROPIC_API_KEY` in your `.env`. If the key is missing, Tier-2 is
automatically skipped (fails straight to the original error) — the suite
still runs, it just won't self-heal beyond Tier-1.

## Reviewing and promoting healed locators

Healing is a **runtime safety net**, not a permanent fix. After a run:

```bash
npm run healed:review
```

This prints every entry in `healed-locators.json` with the spec file,
test title, tier, matched attribute, and new selector. Entries are keyed
`<spec file> :: <descriptor>`, for example:

```json
{
  "tests/ui/login.spec.ts :: Sign In button": {
    "originalDescriptor": "Sign In button",
    "newSelector": "getByRole('button', { name: 'Log in', exact: true })",
    "matchedOn": "text",
    "specFile": "tests/ui/login.spec.ts",
    "testTitle": "Login flow › user can log in with valid credentials",
    "healedAt": "2026-10-30T10:00:00.000Z",
    "tier": 1
  }
}
```

Parallel workers write this file under a lock, so heals from different
workers in the same run are all kept. Then either:

- Manually edit the relevant `.spec.ts` file's `heal(() => page.XXX, ...)`
  call to use the new locator directly, or
- In Claude Code, run `/heal-apply` to let the **Healer subagent**
  (`.claude/agents/healer-agent.md`) do this for you — it greps for the
  stale descriptor, patches the file, re-runs that one test to confirm, and
  clears the entry.

Clear the whole map (e.g., after a full triage pass) with:

```bash
npm run healed:clear
```

## Tuning

| Env var | Default | Effect |
|---|---|---|
| `HEALING_SIMILARITY_THRESHOLD` | `0.80` | Raise for stricter Tier-1 matching (fewer false positives, more Tier-2 escalations). Lower to catch bigger renames but risk mismatches. |
| `ENABLE_AI_HEALING` | `true` | Set `false` to disable Tier-2 entirely (Tier-1-only mode, fully free). |
| `CLAUDE_HEALING_MODEL` | `claude-haiku-5-5` | Swap for a different model if you want stronger Tier-2 matching at higher cost. |

## Why not just re-explore with MCP every time something breaks?

Ordinary locator drift (a button relabeled, an id regenerated) doesn't
justify a full MCP exploration pass — that's a heavier, more deliberate
action reserved for genuinely new flows or major redesigns. Self-healing
handles the common case instantly and near-for-free; reserve
`/explore` for when the Healer agent reports it truly can't find anything
resembling the original element.
