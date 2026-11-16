---
description: Run the Playwright suite via CLI and summarize results (0-token execution)
argument-hint: [optional path or project filter]
---

Use the executor-agent to run tests via the CLI. Target: $ARGUMENTS (if empty, run the full suite with `npm test`).

After the run:
1. Report pass/fail counts per project.
2. Flag any test where `[self-heal]` appeared in output.
3. Link to `playwright-report/index.html` and any failure artifacts.
4. If self-healing occurred, recommend running `/heal-apply` next.
