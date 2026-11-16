---
description: Automate one or more approved test cases into a Playwright spec file via MCP exploration
argument-hint: [test-case-ids, e.g. CHK-001,CHK-003] [test-cases-file]
---

Use the explorer-agent to automate test case(s) "$1" from `test-cases/$2`.

Follow the "driven by test-cases/" workflow in
@.claude/agents/explorer-agent.md and the rules in
@mcp/exploration-prompt.md:
- Read the case(s)' Preconditions/Steps/Expected Result as ground truth
- AXTree snapshots only, never full HTML
- Semantic locators only (getByRole > getByLabel > getByPlaceholder > getByText > getByTestId)
- Wrap the primary CTA in heal()
- Assert on the actual Expected Result, not just "no error thrown"
- Write to tests/ui/ or tests/api/, add a `// Implements: <ids>` comment
- Update the case's Automation Status and the traceability matrix
