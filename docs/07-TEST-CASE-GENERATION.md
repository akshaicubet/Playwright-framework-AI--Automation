# Test Case Generation — Requirements → Test Cases → Scripts

This is the extended pipeline: two more stages sit *in front of* the
original Explorer/Executor/Healer flow.

```
0. requirements/*.md          (you write or paste in: PRDs, user stories, API specs)
        │
        ▼  test-designer-agent   (/design-tests)
1. test-cases/*.md            (structured, ID'd, prioritized — a DRAFT)
        │
        ▼  ★ HUMAN REVIEW GATE ★  (QA lead skims/edits before automating)
        │
        ▼  explorer-agent        (/generate-scripts CHK-001,CHK-003 checkout.md)
2. tests/ui/*.spec.ts          (deterministic Playwright code, traced back to case IDs)
        │
        ▼  executor-agent        (/run-tests, or plain `npm test`)
3. CI run — 0 tokens, parallel, reported in playwright-report/
        │  (on locator failure)
        ▼
4. Tier-1 → Tier-2 self-healing (see docs/03-SELF-HEALING.md)
        │
        ▼  healer-agent          (/heal-apply)
5. Fixes promoted back into tests/ui/*.spec.ts
```

`test-cases/_traceability-matrix.md` is updated at stages 1 and 2, so at any
point you can answer "what's covered, what's automated, what's still
manual" from one file.

## Where to run each stage

All of it runs inside **Claude Code**, in VS Code's terminal or the Claude
Code panel — not in claude.ai's browser interface. The reason: stages 1, 2,
and 5 need to *write files into your repo* and stage 2 needs *live MCP
browser access*; stage 3 needs to *run bash*. Browser-based claude.ai has
none of these — it can't persist a file into your project or execute
`npx playwright test`. Keeping everything inside Claude Code / VS Code means
requirements, test cases, scripts, reports, and traceability all live in one
repo, one source of truth, exactly as intended.

(claude.ai in the browser is still useful *before* stage 0 — e.g. drafting
or refining a PRD conversationally with someone non-technical — just paste
the finished doc into `requirements/` afterward to feed the pipeline.)

## Step by step, concretely

```bash
# 1. Drop your requirements doc in place
cp my-prd.md requirements/checkout.md

# 2. Open Claude Code in this repo
claude

# 3. Generate test cases from it (draft)
/design-tests checkout.md

# 4. >>> STOP AND REVIEW <<<
#    Open test-cases/checkout.md, read through the generated cases,
#    edit/delete/add anything wrong or missing. This is the one manual
#    checkpoint in the pipeline — see QA-BIBLE.md "Review Gates".

# 5. Automate the approved cases
/generate-scripts CHK-001,CHK-003,CHK-004 checkout.md

# 6. Run them
npm test
# or, inside Claude Code:
/run-tests checkout

# 7. If anything self-healed, promote the fix
npm run healed:review
/heal-apply
```

## Why the human review gate matters

AI-generated test cases are a strong first draft, not ground truth — they
can miss business context that isn't in the requirements doc, misjudge
priority, or make an incorrect `[ASSUMPTION: ...]` about ambiguous behavior
(the Test Designer agent flags these explicitly — search for that tag after
running `/design-tests`). Treat step 4 as non-optional; skipping it means
your test suite reflects what the AI *guessed* the product should do, not
what it actually does. Full rationale in `QA-BIBLE.md`.
