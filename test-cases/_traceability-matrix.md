# Traceability Matrix

Single running index: requirement → test case → automated spec → last CI
result. The Test Designer agent appends rows when it generates test cases;
the Explorer agent fills in "Spec File" when a case gets automated; the
Executor agent's CI summary is what "Last Result" reflects.

| Test Case ID | Requirement Source | Priority | Spec File | Automation Status | Last Result |
|---|---|---|---|---|---|

> Empty until the Test Designer agent (`/design-tests`) adds rows for your
> features. Never hand-fill "Automated" or "Last Result" — those come from
> the Explorer agent and CI respectively.

## How to use this

- **Coverage gaps**: any requirement with no row here has zero test
  coverage — a quick visual audit before a release.
- **Automation debt**: rows with "Not automated" show exactly what's still
  manual, and can be prioritized by the Priority column.
- **Release gate**: before a release, filter to P0 rows and confirm every
  one shows "✅ Pass" as of the latest CI run (see `QA-BIBLE.md` → Release
  Sign-off Criteria).
