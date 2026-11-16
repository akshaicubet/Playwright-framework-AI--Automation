# Architecture — Hybrid Deterministic Execution + Token-Light AI Fallback

## The problem this solves

Pure "AI drives the browser every run" automation is expensive and slow —
every click, every assertion, every page load becomes an LLM call. This
framework instead treats AI as a **discovery and repair tool**, not a
runtime dependency. The actual test run is 100% deterministic Playwright
code, costing zero tokens, and AI is only invoked:

1. **Once**, to explore a new flow and write the test (Explorer agent).
2. **Rarely**, only when a locator breaks and deterministic fuzzy matching
   can't recover it (Healer, Tier-2).

## The stages

```
0. Test case design (docs → structured cases, human-reviewed)
        ▼
1. Exploration (MCP)        →  2. Code Gen (.spec.ts)  →  3. CLI Execution (0 tokens)
                                                                    │ locator fails
                                                                    ▼
                                                    4. Tier-1 Healing (0 tokens)
                                                                    │ unresolved
                                                                    ▼
                                                    5. Tier-2 AI Healing (minimal tokens)
```

Stage 0 (test case design from `requirements/` docs, with a mandatory human
review gate) is covered in `docs/07-TEST-CASE-GENERATION.md` and
`QA-BIBLE.md`. The rest of this document focuses on stages 1-5, the original
token-optimization core of the pipeline.

### 1. Exploration (Playwright MCP)

- Configured to return **accessibility tree (AXTree) snapshots**, not full
  HTML DOM. AXTree gives element roles (`button`, `textbox`, `combobox`) and
  accessible names/labels at ~80–90% less token cost than raw HTML.
- Claude drives the browser once, end-to-end, through the target flow.
- MCP is then **disconnected** — it plays no role at test-run time.

### 2. Code generation

- Output is a standard `.spec.ts` file using Playwright's built-in test
  runner — no custom DSL, no runtime AI dependency to execute it.
- Locators are restricted to semantic, user-facing selectors (see
  `docs/02-MCP-EXPLORATION.md`).

### 3. Test execution (CLI)

- `npx playwright test` runs entirely locally/in CI. Zero AI involvement,
  zero tokens, full parallelism across browsers and shards.

### 4. Tier-1 healing (deterministic, 0 tokens)

- When a locator throws, the `heal()` wrapper (`utils/healing/healer.ts`)
  scans currently-interactive elements on the page (buttons, inputs, links,
  ARIA roles) and runs Levenshtein-based fuzzy string matching against the
  failed locator's descriptor (`id`, `name`, `data-testid`, `aria-label`,
  visible text).
- If similarity ≥ threshold (default 80%, configurable via
  `HEALING_SIMILARITY_THRESHOLD`), it retries the action against the new
  element and records the fix in `utils/healing/healed-locators.json`.
- **No LLM call happens at this stage.** This is pure string math and DOM
  querying, so it costs nothing and is instantaneous.

### 5. Tier-2 AI healing (minimal tokens, last resort)

- Only triggered if Tier-1 fuzzy matching can't find a confident match.
- Instead of sending the whole page, we extract a **micro-DOM snippet**
  (the nearest `<form>`/`<main>` container, capped at ~2000 characters) and
  ask a small, cheap model (`claude-haiku-5-5` by default) for a single
  Playwright locator expression back. No conversation, no explanation — just
  the locator string.
- This keeps a "worst case" healing call to roughly the token cost of a short
  paragraph, not a whole page.

## Why this beats "AI runs every test"

| | AI-drives-every-run | This framework |
|---|---|---|
| Cost per run | High (LLM call per action) | ~0 (deterministic code) |
| Speed | Slow (network round-trips) | Fast (native Playwright) |
| Determinism | Low (LLM can behave differently run to run) | High |
| Parallelism | Hard (LLM calls don't parallelize cheaply) | Native (workers/shards) |
| Maintenance | "Just re-run AI" | Self-healing + explicit promotion to source |

## Design principles to keep as the project grows

1. **AI writes tests, code runs tests.** Never let a CI run depend on a live
   LLM call for its core execution path — only for the healing escape hatch.
2. **Escalate gradually.** Always try the free/cheap option first (plain
   locator → Tier-1 fuzzy → Tier-2 AI) and fail loudly if all tiers exhaust.
3. **Healing is a safety net, not a permanent fix.** Runtime healing keeps
   CI green short-term; the Healer agent's job is to promote the fix back
   into source so the next run doesn't need to heal at all.
4. **Keep AI payloads small on purpose.** AXTree over HTML, micro-DOM over
   full-DOM, cheap model over large model for healing — every stage is
   deliberately budget-conscious.
