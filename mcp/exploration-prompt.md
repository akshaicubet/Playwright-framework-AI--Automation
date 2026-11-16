# Agent 1 — Exploration Prompt (MCP, Token-Light)

Use this prompt (or the `/explore` command in `.claude/commands/`) when driving
Claude through Playwright MCP to explore a flow **once** and generate a
deterministic spec file. MCP is disconnected after this step — it is never
used at test-run time.

---

## System behavior rules for the exploration agent

1. **Use the accessibility tree, not raw HTML.** When calling MCP snapshot
   tools, always prefer `browser_snapshot` (AXTree) over any full-DOM dump.
   This cuts token usage by 80–90% versus reading `page.content()`.
2. **Explore once, then stop.** Walk the flow end-to-end interactively
   (navigate, click, fill, assert), then immediately write out a `.spec.ts`
   file. Do not re-explore the same flow repeatedly.
3. **Never hand-write brittle selectors.** Only use, in this priority order:
   1. `page.getByRole(role, { name })`
   2. `page.getByLabel(text)`
   3. `page.getByPlaceholder(text)`
   4. `page.getByText(text, { exact: true })`
   5. `page.getByTestId(testId)` (if the app has `data-testid` attributes)
   - Never emit `nth-child`, auto-generated CSS classes, or XPath.
4. **Wrap risky/dynamic actions in `heal()`.** For elements likely to change
   (buttons inside frequently-redesigned components, dynamic modals), use the
   `heal()` fixture from `fixtures/healing-fixture.ts` instead of a bare
   locator call. For stable, simple elements (page headings, static nav),
   a plain locator is fine — don't over-wrap.
5. **Assert meaningfully.** Every generated test must assert on the actual
   outcome of the flow (URL change, visible heading, toast message, API
   response) — not just "element exists".
6. **Output format.** Write the finished file directly into `tests/ui/` or
   `tests/api/` following the naming convention `<flow-name>.spec.ts` /
   `<resource-name>.api.spec.ts`. Do not leave exploration transcripts in the
   repo — only the finished deterministic test.

---

## Prompt template

```
You are exploring the "<FLOW NAME>" flow at <BASE_URL> using Playwright MCP.

Goal: <describe user journey, e.g. "Add an item to cart and complete checkout as a guest">

Steps:
1. Use browser_snapshot (AXTree) after every navigation — never request full HTML.
2. Interact with the page to complete the flow described above.
3. Note the accessible role + name (or label/testid) of every element you interact with.
4. Once the flow is complete, generate a Playwright TypeScript spec file that:
   - Imports { test, expect } from '../../fixtures/healing-fixture'
   - Uses only semantic locators (see priority order above)
   - Wraps at least the primary submit/CTA action in heal()
   - Includes meaningful assertions on the final state
5. Save the file to tests/ui/<flow-name>.spec.ts
6. Disconnect / stop using MCP tools. Do not keep the browser session open.
```

## Example invocation (Claude Code CLI)

```bash
claude "Explore the checkout flow at $BASE_URL using the playwright MCP server,
then generate tests/ui/checkout.spec.ts following mcp/exploration-prompt.md rules."
```
