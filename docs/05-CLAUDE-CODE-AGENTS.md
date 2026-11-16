# Claude Code: The 4-Agent Setup

This framework maps the pipeline onto four Claude Code **subagents**, each
scoped to exactly one stage so context (and token spend) stays isolated per
job. Definitions live in `.claude/agents/`.

## Why subagents instead of one general-purpose agent

- Each agent gets a minimal, relevant toolset (see the `tools:` frontmatter
  in each file) — the Explorer can't accidentally run `npm test`, the
  Executor can't edit spec files, the Healer can't drive a live browser.
  This keeps blast radius small and keeps each agent's context window
  focused, which is itself a token-efficiency win.
- They compose naturally into slash commands so day-to-day usage doesn't
  require remembering long prompts.

## 1. `test-designer-agent` (`.claude/agents/test-designer-agent.md`)

- **Tools**: `Read`, `Write`, `Edit`, `Glob`, `Grep`, plus MCP snapshot tools
  (used sparingly, only to confirm ambiguous UI behavior).
- **Job**: read `requirements/*.md`, produce structured, prioritized,
  ID'd test cases in `test-cases/*.md` covering happy-path, negative, edge,
  and API cases. Updates `test-cases/_traceability-matrix.md`. Never writes
  automation code. See `docs/07-TEST-CASE-GENERATION.md`.
- **Invoke via**: `/design-tests <requirements-file>` or directly:
  *"write test cases for the checkout requirements doc"*.
- **Output is a draft** — the mandatory human review gate happens after
  this agent, before the Explorer agent runs (see `QA-BIBLE.md` §5).

## 2. `explorer-agent` (`.claude/agents/explorer-agent.md`)

- **Tools**: Playwright MCP browser tools (navigate/snapshot/click/type/etc.), `Write`, `Edit`, `Read`, `Glob`, `Grep`.
- **Job**: one-time flow exploration via AXTree snapshots → deterministic
  `.spec.ts` output, ideally driven by an **approved test case** from
  `test-cases/` (falls back to free-form exploration if none exists yet).
  See `docs/02-MCP-EXPLORATION.md`.
- **Invoke via**: `/generate-scripts CHK-001,CHK-003 checkout.md` (preferred,
  test-case-driven) or `/explore <flow-name> <url-path> "<description>"`
  (free-form) or directly: *"automate CHK-001"*.

## 3. `executor-agent` (`.claude/agents/executor-agent.md`)

- **Tools**: `Bash`, `Read`, `Glob` — no file editing, no MCP.
- **Job**: pick the right `npm run test:*` command, run it, parse
  `reports/test-results.json`, summarize pass/fail and flag any
  `[self-heal]` log lines.
- **Invoke via**: `/run-tests [filter]` or *"run the checkout tests"*.

## 4. `healer-agent` (`.claude/agents/healer-agent.md`)

- **Tools**: `Read`, `Edit`, `Bash`, `Grep`, `Glob` — no MCP, no live
  browser driving (that already happened automatically at runtime inside
  `utils/healing/healer.ts`).
- **Job**: read `healed-locators.json`, find the corresponding spec file(s),
  patch the stale locator inside the existing `heal()` call, re-run to
  confirm, clear the entry.
- **Invoke via**: `/heal-apply` or *"apply the healed locators from the last run"*.

## Slash commands (`.claude/commands/`)

| Command | Delegates to | Purpose |
|---|---|---|
| `/design-tests <requirements-file>` | test-designer-agent | Draft test cases from a requirements doc |
| `/generate-scripts <ids> <test-cases-file>` | explorer-agent | Automate approved test cases into a spec (preferred) |
| `/explore <name> <path> "<desc>"` | explorer-agent | Generate a new spec via MCP, free-form (no test case) |
| `/run-tests [filter]` | executor-agent | Run suite, summarize results |
| `/heal-apply` | healer-agent | Promote runtime fixes into source |

## Typical day-to-day loop

```
# New feature:
/design-tests checkout.md                              # draft test cases from requirements
#  ...review test-cases/checkout.md manually...
/generate-scripts CHK-001,CHK-003 checkout.md           # automate the approved cases

# Every day after that:
npm test                                                # plain CLI, 0 tokens
# ... a locator drifts, Tier-1/Tier-2 heals it automatically at runtime ...
npm run healed:review                                   # see what got healed
/heal-apply                                              # promote fixes into source
```

Notice that on a normal day, **zero Claude Code / MCP usage is required at
all** — `npm test` is just Playwright. AI only enters the loop when you're
building something new (`/explore`) or cleaning up after a heal
(`/heal-apply`).

## Project-level Claude Code config

- `.mcp.json` at the repo root — auto-loaded, gives every Claude Code session
  in this repo access to the Playwright MCP server without extra setup.
- `.claude/settings.local.json` (gitignored) — use this for personal/local
  overrides (e.g., a different `ANTHROPIC_API_KEY` for local Tier-2 testing)
  without touching shared config.
