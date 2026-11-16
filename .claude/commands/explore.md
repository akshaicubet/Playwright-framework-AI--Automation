---
description: Explore a flow via Playwright MCP and generate a deterministic spec file
argument-hint: [flow-name] [url-path] [description]
---

Use the explorer-agent to explore the flow "$1" starting at path "$2".

Flow description: $3

Follow the rules in @mcp/exploration-prompt.md exactly:
- AXTree snapshots only, never full HTML
- Semantic locators only (getByRole > getByLabel > getByPlaceholder > getByText > getByTestId)
- Wrap the primary CTA in heal()
- Real assertions on outcome
- Write the result to tests/ui/$1.spec.ts and stop
