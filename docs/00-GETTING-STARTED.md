# 00 — Getting Started (for someone who has never touched this project)

This is the doc to read first if you've never used Playwright, MCP, or
Claude Code before. It assumes nothing. Every other doc in `docs/` assumes
you've done this one.

## What this project actually is, in plain terms

It's an automated way to test a website (or API) by writing code that opens
a browser, clicks buttons, fills forms, and checks the result is correct —
instead of a human doing it by hand every time. AI (Claude) is used in two
narrow places: to *write* the first draft of a test by watching you describe
a flow, and to *fix* a test automatically if the website's UI changes
slightly. AI is **not** used to run the tests day-to-day — that part is
instant, free, and 100% repeatable, done by a tool called Playwright.

## Prerequisites (install these first, one time)

1. **Node.js** (version 18 or newer) — this runs the JavaScript/TypeScript
   tooling. Check if you have it:
   ```bash
   node -v
   ```
   If that fails or shows a version below 18, download it from
   https://nodejs.org (LTS version).

2. **VS Code** (or any code editor) — https://code.visualstudio.com

3. **Git** — to download/manage the project. Check with:
   ```bash
   git -v
   ```

4. *(Optional, only needed if you want AI to write/heal tests)* **Claude
   Code** — install per Anthropic's docs at
   https://docs.claude.com/en/docs/claude-code. Not required just to run
   the example tests.

## Step 1 — Get the project onto your computer

If you received a `.zip`: unzip it anywhere, e.g. `Documents/playwright-ai-framework`.

If it's in Git: `git clone <repo-url>` then `cd playwright-ai-framework`.

## Step 2 — Open it in VS Code

```bash
cd playwright-ai-framework
code .
```
(Or: open VS Code → File → Open Folder → select the project folder.)

Opening it in VS Code alone does **not** make it runnable yet — think of VS
Code as just the text editor here. You still need Steps 3–4 below,
run from VS Code's built-in terminal (menu: Terminal → New Terminal) or any
regular terminal app.

## Step 3 — Install everything the project needs

```bash
npm install
```
This reads `package.json` and downloads all required libraries into a
`node_modules/` folder (this folder is intentionally not included in the
zip/repo — it's regenerated locally, and is gitignored).

```bash
npx playwright install --with-deps
```
This downloads the actual browser binaries (Chromium, Firefox, WebKit) that
Playwright controls. Only needs to be done once per machine (or when
Playwright is upgraded).

## Step 4 — Set up your environment file

The project needs to know which website to test and what login to use. It
never hardcodes this in test files — it reads it from a `.env` file that you
create locally (and which is never committed to Git, for security).

```bash
cp .env.example .env.local
```
Now open `.env.local` in VS Code and fill in real values — at minimum
`BASE_URL` (the website you're testing). Leave `ANTHROPIC_API_KEY` blank if
you're not using the AI-healing feature yet; the tests still work without
it.

## Step 5 — Run the example tests

```bash
npm test
```
This runs the sample tests included in `tests/ui/` and `tests/api/` against
whatever `BASE_URL`/`API_BASE_URL` you set. On a real project you'll replace
these examples with your own — right now they're just there so you can
confirm everything is wired up correctly. It's expected that the examples
may fail against `example.com` placeholders in `.env.example` — that's
normal; point `BASE_URL` at a real test site to see them pass, or just
confirm the command runs without a setup/config error.

## Step 6 — Look at the results

```bash
npm run report
```
This opens an interactive HTML report in your browser: which tests passed
or failed, with screenshots and video recordings attached for any failure.
This is the main "dashboard" you'll use daily.

## Step 7 — Understand the folders (2-minute tour)

| Folder | What's in it | Do I ever edit it? |
|---|---|---|
| `tests/ui/` | Browser tests (clicks, forms, navigation) | Yes — this is where your real tests live |
| `tests/api/` | API tests (no browser) | Yes — same idea, for backend endpoints |
| `utils/healing/` | Self-healing logic | Rarely — it just works in the background |
| `docs/` | All documentation (you're reading it now) | No — reference only |
| `.claude/` | AI agent definitions (only relevant if using Claude Code) | Rarely |
| `.github/workflows/` | The CI/CD pipeline (auto-runs tests on every code push) | Occasionally, to tune it |
| `playwright-report/`, `test-results/`, `reports/` | Generated automatically each run | Never — don't edit, don't commit |

## Step 8 — Write your first real test (no AI needed)

You don't need Claude Code to get value from this project. Playwright has
its own recorder — point, click, and it writes the code for you:

```bash
npm run codegen
```
This opens a browser + a code-generation window side by side. Click around
your site; watch the test code appear. Copy the generated code into a new
file under `tests/ui/your-flow-name.spec.ts`, clean it up to match the style
in `tests/ui/example-login.spec.ts` (semantic locators, real assertions),
and run it with `npm test`.

## Step 9 — (Optional) Use AI to speed this up

If you have Claude Code installed and an Anthropic API key:

```bash
claude
```
Then, inside the Claude Code session, type:
```
/explore signup /signup "create a new account with email and password"
```
This drives a real browser through the signup flow and writes the test file
for you. Full details in `docs/02-MCP-EXPLORATION.md`.

## Where to go next

- Want to understand *why* it's built this way? → `docs/01-ARCHITECTURE.md`
- Writing your own tests and want the AI to help? → `docs/02-MCP-EXPLORATION.md`
- A test broke after a UI change and you're curious why it still passed? → `docs/03-SELF-HEALING.md`
- Need all the CLI commands / want CI running? → `docs/04-CLI-USAGE.md`
- Curious about the Claude Code agent setup? → `docs/05-CLAUDE-CODE-AGENTS.md`
- Testing a backend API instead of a UI? → `docs/06-API-TESTING.md`
- Cloning this for a brand-new project? → `SETUP-CHECKLIST.md`

## Common beginner mistakes

- **Running `npm test` before `npm install`** → you'll get "command not
  found" or module errors. Always `npm install` first after cloning.
- **Forgetting `npx playwright install --with-deps`** → tests fail with
  "browser not found" errors. This is separate from `npm install`.
- **Editing `.env.example` instead of `.env.local`** → your real credentials
  should never go in `.env.example` (it's committed to Git and meant to stay
  a template). Always copy it first.
- **Committing `.env.local` or `playwright-report/`** → these are
  intentionally in `.gitignore`. If `git status` shows them as untracked
  changes you want to commit, stop — check `.gitignore` is being respected.
