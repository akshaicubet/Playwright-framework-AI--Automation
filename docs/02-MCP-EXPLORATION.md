# MCP Exploration (Agent 1)

## Setup

The framework ships with two MCP config files pointing at the same server:

- `.mcp.json` — auto-loaded by Claude Code when you run `claude` inside this
  repo.
- `mcp/mcp-config.json` — reference copy with extra flags (trace saving,
  custom output dir) for standalone MCP usage outside Claude Code.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@0.0.83", "--headless", "--isolated", "--viewport-size=1280,720"]
    }
  }
}
```

Requires Node 18+. `npx` will fetch `@playwright/mcp` on first run — no
manual install needed.

## Why accessibility-tree snapshots

Playwright MCP's `browser_snapshot` tool returns a structured accessibility
tree: roles, accessible names, states (checked/expanded/disabled) — not raw
HTML. A typical page's full HTML can run 5,000–20,000+ tokens; the
equivalent AXTree snapshot is usually a few hundred to ~2,000 tokens. Always
prefer `browser_snapshot` over any tool that returns `page.content()` or
similar.

## Running an exploration

Interactive:

```bash
claude
> /explore checkout /checkout "Add an item to cart and complete guest checkout"
```

Non-interactive (scripted):

```bash
claude -p "Explore the checkout flow at $BASE_URL using the playwright MCP \
server, then generate tests/ui/checkout.spec.ts following the rules in \
mcp/exploration-prompt.md" --mcp-config .mcp.json
```

The full rule set the agent follows lives in
[`mcp/exploration-prompt.md`](../mcp/exploration-prompt.md) — read it if you
want to tune locator priority, when to wrap actions in `heal()`, or output
file naming.

## What "good" output looks like

- One `.spec.ts` file per flow, semantic locators only, one or two
  `heal()`-wrapped critical actions, and a real assertion of success.
- No leftover exploration transcript or scratch files committed to the repo.
- MCP is not referenced anywhere inside the generated test file — the test
  itself has zero MCP/AI dependency, it's plain Playwright.

## Extending exploration to new flows

1. Identify the flow and its entry URL path.
2. Run `/explore <flow-name> <url-path> "<description>"`.
3. Review the generated file — rename anything non-obvious, double check
   assertions match real business intent (not just "page didn't crash").
4. Run it once locally (`npx playwright test tests/ui/<flow-name>.spec.ts`)
   before committing.
5. Commit the `.spec.ts` file. You will not need to re-explore this flow
   again unless the UI is substantially redesigned — ordinary locator drift
   is handled by self-healing (see `03-SELF-HEALING.md`), not re-exploration.
