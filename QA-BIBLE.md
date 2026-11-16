# QA Bible

**The single source of truth for how quality is defined, planned, built,
executed, and gated on this project.** If a process question isn't answered
elsewhere, it's answered here. If this document conflicts with tribal
knowledge, this document wins — update it, don't route around it.

---

## 1. Purpose & scope

This defines the full QA process for the project, built around the AI-assisted
pipeline in this repo (`requirements/ → test-cases/ → tests/ → CI`). It
covers strategy, roles, workflow, standards, environments, defect handling,
metrics, and release gating. It applies to functional UI testing, API
testing, and the automation layer that supports both; it does not replace
dedicated performance, security, or accessibility audit programs, though it
defines where they hook in.

---

## 2. Test strategy

### 2.1 Test pyramid on this project

```
        ▲  Fewer, slower, higher-confidence
        │
        │   E2E UI flows (Playwright, tests/ui/)
        │   ──────────────────────────────────
        │   API contract & integration tests (tests/api/)
        │   ──────────────────────────────────
        │   Unit tests (owned by engineering, outside this repo's scope)
        │
        ▼  More, faster, narrower
```

- **Unit tests** are engineering's responsibility, run in the app repo, not
  this one. QA does not duplicate unit-level coverage here.
- **API tests** (`tests/api/`) are the primary regression workhorse — fast,
  stable, no browser overhead. Prefer catching a bug here over in a UI test
  whenever the bug is reachable via API.
- **E2E UI tests** (`tests/ui/`) are reserved for real user journeys that
  must be verified through the actual interface (checkout, auth, critical
  navigation) — not for every possible input permutation, which belongs in
  API tests or is simply over-testing.

### 2.2 What gets automated vs. stays manual

| Automate | Keep manual / exploratory |
|---|---|
| Anything in the regression suite (runs every release) | First-look exploratory testing of a brand-new feature before requirements stabilize |
| P0/P1 critical user journeys | Visual/design polish review |
| API contract validation | Usability judgment calls |
| Repetitive negative/edge cases | One-off investigation of a bug report |

### 2.3 Risk-based prioritization

Test effort is allocated by business impact, not by "what's easy to
automate":

- **P0** — payment, auth, data loss/corruption, legal/compliance. Must have
  automated coverage before release; must pass on every CI run.
- **P1** — high-traffic, high-visibility flows. Automated coverage expected;
  a temporary manual check is acceptable only with an explicit, dated
  exception.
- **P2** — secondary functionality. Automated where practical.
- **P3** — cosmetic, rare edge cases. Automated opportunistically; manual
  spot-checks acceptable.

---

## 3. The pipeline (how work actually flows)

Full technical detail lives in `docs/07-TEST-CASE-GENERATION.md` and
`docs/01-ARCHITECTURE.md`. Summary:

```
Requirements  →  Test Cases (AI draft)  →  [HUMAN REVIEW GATE]  →  Automated Scripts  →  CI Execution  →  Self-Healing  →  Reporting
```

| Stage | Tool/Agent | Token cost | Owner |
|---|---|---|---|
| Requirements intake | Human (PM/BA writes or shares PRD) | — | Product |
| Test case generation | `test-designer-agent` (`/design-tests`) | Light | AI, reviewed by QA |
| **Review gate** | Human | — | **QA lead — mandatory** |
| Script generation | `explorer-agent` (`/generate-scripts`) | Light (AXTree) | AI, reviewed by QA |
| Execution | `executor-agent` / plain CLI | Zero | CI / anyone |
| Self-healing | `utils/healing/healer.ts` (Tier-1/2) | Zero → Minimal | Automatic |
| Healing promotion | `healer-agent` (`/heal-apply`) | Minimal | QA |
| Reporting | Playwright HTML/JUnit/JSON reporters | — | Everyone |

---

## 4. Roles & responsibilities

| Role | Responsibilities |
|---|---|
| **Product/BA** | Owns `requirements/` content quality — clear acceptance criteria in, better test cases out. Garbage requirements produce garbage test cases; this is a real dependency, not a formality. |
| **QA Lead / Engineer** | Reviews AI-generated test cases (mandatory gate), reviews AI-generated scripts before merge, owns `test-cases/_traceability-matrix.md` accuracy, triages self-healing events, owns release sign-off checklist. |
| **Developers** | Fix defects found by the suite, keep `data-testid`/labels/ARIA roles stable and semantic (this is what makes locators resilient in the first place — see §7), review PRs touching `tests/`. |
| **Anyone** | Can run `npm test` locally at any time — no special permissions or AI access needed to execute the suite. |

---

## 5. Review gates (non-negotiable checkpoints)

AI accelerates drafting; humans own approval. Two mandatory gates:

1. **After test case generation, before scripting.** Open the generated
   `test-cases/<feature>.md`, check: does this actually reflect the
   requirement? Any `[ASSUMPTION: ...]` tags that need resolving? Is
   priority (P0-P3) sane? Missing an obviously important negative/edge
   case? Fix in the file directly before running `/generate-scripts`.
2. **After script generation, before merge.** Review the generated
   `.spec.ts` in the normal PR process like any other code — does the
   assertion actually check business intent, not just "page didn't
   crash"? Is it wrapped in `heal()` where it should be? This is a standard
   code review, not a special AI-review process — treat AI-authored test
   code exactly like human-authored test code.

A test case or spec that skips its gate is **not considered part of the
trusted suite** — flag it in the traceability matrix rather than silently
including it in release gating.

---

## 6. Environments

| Environment | Purpose | Data | Runs |
|---|---|---|---|
| Local | Developer/QA iteration | Local/sandboxed | Manual, on demand |
| Staging (`.env.staging`) | Pre-release validation | Synthetic/seeded test data, never real PII | Full suite on every PR + nightly |
| Production (smoke only) | Post-deploy sanity check | Real data — read-only/non-destructive checks only | P0 smoke subset only, immediately after deploy |

Never point destructive tests (account creation, payment, deletion flows) at
production. Production coverage is smoke-level only: "is it up, does login
work, does the homepage render."

---

## 7. Standards & conventions

These make automation resilient, not just for AI-generated tests but all
tests in the suite:

- **Locators**: semantic only — `getByRole`, `getByLabel`,
  `getByPlaceholder`, `getByText`, `getByTestId`. Never XPath, never
  auto-generated/positional CSS (`nth-child`, etc). This is a shared
  contract with engineering: stable `aria-label`s and `data-testid`s are a
  product-quality investment, not a QA-only concern.
- **Assertions**: must verify actual business outcome (URL, visible
  confirmation, correct data), never just "the action didn't throw."
- **Test independence**: every test must be runnable in isolation and in
  parallel — no test may depend on another test's leftover state. Use API
  calls (`utils/api-client.ts`) to seed state directly rather than chaining
  through UI flows from a prior test.
- **Naming**: `tests/ui/<flow-name>.spec.ts`, `tests/api/<resource>.api.spec.ts`,
  matching the feature name used in `requirements/` and `test-cases/`.
- **Traceability**: every automated spec should be traceable to at least one
  test case ID (comment: `// Implements: CHK-001`). Specs with no
  traceability are technical debt — flag and backfill.

---

## 8. Self-healing policy

Full mechanics: `docs/03-SELF-HEALING.md`. Policy summary for QA process
purposes:

- Tier-1 (deterministic fuzzy match) firing is **not a defect** — it's the
  system working as designed against minor, cosmetic UI drift.
- Tier-2 (AI fallback) firing **should be reviewed** — it indicates a bigger
  change than fuzzy matching alone caught. Treat every Tier-2 heal as a
  prompt to ask "did the UI genuinely change intentionally, or did this
  paper over a real regression?"
- A CI run that passes *only* because of healing is still green, but the
  healed locator must be promoted to source (`/heal-apply`) within the same
  sprint — an unresolved entry in `healed-locators.json` is tracked debt,
  not a closed loop.

---

## 9. Defect management

1. A failing test that is **not** a known/accepted flake or in-progress
   healing is a defect. File it in the team's tracker with: test case ID,
   spec file + line, HTML report link, trace/video from `test-results/`.
2. Reproduce locally before triage where possible: `npx playwright test
   <file> --headed --debug`.
3. Link the defect ticket ID back into `test-cases/_traceability-matrix.md`
   as a note against the relevant case, so history isn't lost.
4. Flaky (intermittently failing without a real underlying bug) tests are
   themselves a defect against the *test*, not the product — fix the test's
   independence/timing, don't just add retries and move on. `retries: 2` in
   CI (see `playwright.config.ts`) is a safety net for genuine
   infrastructure flakiness, not a substitute for a correct test.

---

## 10. Metrics that matter (and ones to ignore)

**Track:**
- P0 coverage (% of P0 test cases with a passing automated spec) — this is
  the primary release-readiness signal.
- Traceability completeness (% of test cases with `Linked Spec` filled in).
- Tier-2 healing frequency over time — a rising trend suggests the app's UI
  is churning faster than tests are being maintained, a real signal worth
  discussing in planning.
- Flake rate (tests that fail then pass on retry without a code change).

**Don't chase as a target:**
- Raw test count. More tests isn't better; well-targeted P0/P1 coverage is.
- 100% automation. Some things are legitimately better as manual/exploratory
  checks (see §2.2) — automating them anyway wastes maintenance effort for
  no quality gain.

---

## 11. Release sign-off criteria

Before a release is approved:

- [ ] All P0 test cases in `test-cases/_traceability-matrix.md` show
      `Linked Spec` filled and `Last Result: ✅ Pass` on the latest CI run
      against staging.
- [ ] No open Tier-2 self-healing entries older than the current sprint in
      `utils/healing/healed-locators.json`.
- [ ] No open P0/P1 defects linked in the traceability matrix without an
      explicit, documented exception signed off by the QA lead.
- [ ] CI pipeline (`.github/workflows/playwright.yml`) is green on the
      release branch across all browser/shard combinations.
- [ ] Post-deploy smoke subset (see §6) is ready to run immediately after
      the production deploy.

A release does not require 100% of P2/P3 cases passing — document any known
P2/P3 gaps in the release notes rather than blocking on them.

---

## 12. Continuous improvement

- Review this document at the start of each quarter (or after any process
  incident — e.g. a P0 bug shipped despite "passing" tests) and update it.
  Treat gaps found here the same as a defect: file them, fix the process,
  don't just patch around it once.
- If a review gate (§5) is consistently getting rubber-stamped without real
  scrutiny, that's a process failure to raise, not something to quietly
  tighten AI prompts around.
- New team members: start at `docs/00-GETTING-STARTED.md` for the tooling,
  then this document for the process they're now part of.
