# Bug Report: Super Admin › Settings › Industry Type

| | |
|---|---|
| **Application** | Etalon MOS: CCIG Super Admin Console |
| **Environment** | Staging, `https://etalon-staging.cubettech.in` (API `https://etalon-staging-api.cubettech.in`) |
| **Browser** | Chromium (Playwright), 1280×720 |
| **Account** | Super Admin (`superadmin@yopmail.com`) |
| **Tested on** | 2026-11-09. Every bug below was re-verified between 10:43 and 10:48 UTC unless noted otherwise. |
| **Reported by** | QA |

## Summary

| ID | Title | Severity | Priority | Screenshot |
|---|---|---|---|---|
| IND-01 | Blank (whitespace-only) industry name is saved and appears in Create Company dropdown | High | P1 | IND-01a, IND-01b |
| IND-02 | Long description stretches the table and pushes the Actions column off-screen | Medium | P2 | IND-02 |
| IND-03 | "Create Industry" button not disabled while saving; double-click sends two requests | Medium | P2 | (network log) |
| IND-04 | Create Company › Industry dropdown stays filtered after the search box is cleared | Medium | P2 | IND-04 |
| IND-05 | Industry search does not trim leading/trailing spaces | Medium | P2 | IND-05 |
| IND-06 | `_` in Industry search acts as a wildcard and returns every industry | Medium | P2 | IND-06 |
| IND-07 | Create dialog closes on server error (e.g. duplicate name) and discards input | Low | P3 | IND-07 |
| IND-08 | Length validation messages say "less than 80/200" although 80/200 is allowed | Low | P3 | IND-08 |
| IND-09 | Industry list empty state reads "No industry sectors identified." | Low | P3 | IND-05 |
| IND-10 | Create Company › Industry dropdown loads only the first 100 of ~170 industries | Low | P3 | (network log) |
| IND-11 | Create Company › Categorization dropdowns truncate the selected value to one letter ("A…") | Medium | P2 | IND-11 |

Fixed or no longer reproducible as of 10:48 (no ticket needed; retest when released):
- `%` in Industry search returned every industry at 08:52 (`search=%25`). At 10:44 it returns no rows, as expected.
- The Create Company › Industry dropdown search was overwritten by an unfiltered reload at 09:05, so filtering never worked. At 10:46 "Consulting" correctly filters to "Consulting Services".

---

## IND-01: Blank (whitespace-only) industry name is saved and appears in Create Company dropdown

**Severity:** High · **Priority:** P1 · **Module:** Settings › Industry Type → affects Company › Create Company

**Preconditions:** Logged in as Super Admin.

**Steps to reproduce**
1. Go to **Settings › Industry Type** (`/dashboard/settings/industry-type`).
2. Click **ADD INDUSTRY**.
3. In **Industry Name**, enter only spaces (e.g. 5 spaces). Leave Description empty.
4. Click **Create Industry**.
5. Observe the Industry list.
6. Go to **Company › Create Company** and open the **Industry** dropdown.

**Expected result**
- Submission is blocked with "Industry name is required" (the same message shown for an empty field).
- The API rejects an empty/whitespace-only name with `400`/`422`.

**Actual result**
- The client trims the value to empty, but the API still accepts it: `POST /super-admin/industries` → **`201 Created`**.
- A row with no name (and no avatar letter) is added to the Industry list (IND-01a).
- The blank entry appears as an empty, **selectable option** in the Create Company Industry dropdown (IND-01b).
- Trying again now returns `409 Conflict` "Industry already exists", because a blank industry already exists. The API still has no required-field check.

**Evidence**
- `IND-01a-blank-industry-in-list.png`: 8th row is blank.
- `IND-01b-blank-option-in-create-company-dropdown.png`: empty option below "QA AUTO INDUSTRY A".

**Suggested fix:** Validate `name` server-side: trim it, then reject an empty string. Apply the same check on update and to Company Type and Sector.

---

## IND-02: Long description stretches the table and pushes the Actions column off-screen

**Severity:** Medium · **Priority:** P2 · **Module:** Settings › Industry Type (list)

**Preconditions:** At least one industry on the current page has a long description with no spaces (e.g. 200 characters, as allowed by the form).

**Steps to reproduce**
1. Create an industry whose Description is 200 characters without spaces (e.g. `QA desc 200 ddd…d`).
2. Open **Settings › Industry Type** at 1280×720.

**Expected result:** Description text wraps or is truncated with an ellipsis. The **Actions** column (edit/delete) stays visible for every row.

**Actual result:** The description doesn't wrap. The table grows to about 2,400px wide and the **Actions** column header and icons are pushed out of view for **all rows on that page**, so records on that page cannot be edited or deleted without horizontal scrolling.

**Evidence:** `IND-02-long-description-hides-actions-column.png`. The "ACTIONS" header is missing, and the description runs off the right edge.

**Suggested fix:** `word-break: break-word` / `overflow-wrap: anywhere` on the description cell plus a max width or line clamp. Keep the Actions column fixed width.

---

## IND-03: "Create Industry" button not disabled while saving; double-click sends two requests

**Severity:** Medium · **Priority:** P2 · **Module:** Settings › Industry Type (Create dialog)

**Steps to reproduce**
1. **Settings › Industry Type › ADD INDUSTRY**.
2. Enter a new unique name (e.g. `QA Auto Double Click`).
3. **Double-click** **Create Industry**.
4. Watch the Network tab.

**Expected result:** The button is disabled, or shows a loading state, after the first click. Exactly one `POST` is sent.

**Actual result:** Two `POST /super-admin/industries` requests are sent: the first returns **`201 Created`**, the second **`409 Conflict`**. Only one record is created, but only because of the server's duplicate check, and the user gets an "Industry already exists" error right after a successful save. On forms without a uniqueness check, this would create duplicates.

**Evidence:** Network log, 2026-11-09 09:05 UTC: `POST …/industries → 201`, then `POST …/industries → 409`. No screenshot, because reproducing it creates a new record.

**Suggested fix:** Disable the submit button and ignore further submits while the request is pending. Apply this to every create/edit dialog.

---

## IND-04: Create Company › Industry dropdown stays filtered after the search box is cleared

**Severity:** Medium · **Priority:** P2 · **Module:** Company › Create Company (step 1, Industry field)

**Steps to reproduce**
1. **Company › Create Company**.
2. Open the **Industry** dropdown.
3. In **Search industries…**, type `Consulting`. The list shows "Consulting Services" (correct).
4. Clear the search box completely (select all + Delete, or Backspace to empty).

**Expected result:** The full industry list is shown again.

**Actual result:** The list keeps showing the results of the last non-empty search ("Consulting Services" only). No request is sent when the box becomes empty. The last request is still `GET /super-admin/industries?limit=100&search=Consulting`.

**Evidence:** `IND-04-dropdown-stays-filtered-after-clearing-search.png`. The search box is empty, but only "CONSULTING SERVICES" is listed.

**Suggested fix:** Refetch without `search` (or restore the cached full list) when the search term becomes empty.

---

## IND-05: Industry search does not trim leading/trailing spaces

**Severity:** Medium · **Priority:** P2 · **Module:** Settings › Industry Type (list search)

**Steps to reproduce**
1. **Settings › Industry Type**.
2. In **Search by name**, type `  waste  ` (two spaces before and after).

**Expected result:** "Waste Management" is listed, the same as for `waste`.

**Actual result:** "No industry sectors identified." The request is sent untrimmed: `GET /super-admin/industries?page=1&limit=10&search=++waste++`. A search of only spaces (`   `) also returns no rows instead of the full list.

**Evidence:** `IND-05-search-not-trimmed-and-IND-09-wrong-empty-text.png`. The spaces aren't visible in the screenshot; the input was `␣␣waste␣␣`.

**Suggested fix:** Trim the term on the client before sending, and on the server. Treat an all-whitespace term as no search.

---

## IND-06: `_` in Industry search acts as a wildcard and returns every industry

**Severity:** Medium · **Priority:** P2 · **Module:** Settings › Industry Type (list search) / API

**Steps to reproduce**
1. **Settings › Industry Type**.
2. In **Search by name**, type `_`.

**Expected result:** Only industries whose name contains a literal underscore are listed. Currently none, so "no results".

**Actual result:** Every industry is returned (all 17 pages). `_` is passed into a SQL `LIKE`/`ILIKE` pattern unescaped, where it matches any single character.

**Evidence:** `IND-06-underscore-wildcard-returns-all.png`.

**Notes:** `%` had the same problem at 08:52 and was fixed by 10:44, so `_` (and `\`) appear to have been missed in that fix. The input is parameterized (`' OR '1'='1` returns no rows), so this is not SQL injection. Please check that every search endpoint, especially tenant-scoped ones, escapes `%`, `_` and `\`.

---

## IND-07: Create dialog closes on server error (e.g. duplicate name) and discards input

**Severity:** Low · **Priority:** P3 · **Module:** Settings › Industry Type (Create dialog)

**Steps to reproduce**
1. **Settings › Industry Type › ADD INDUSTRY**.
2. Enter an existing name, e.g. `Waste Management`, and optionally a description.
3. Click **Create Industry**.

**Expected result:** The dialog stays open with the entered values, and the error is shown on the Industry Name field (or as a toast), so the user can correct the name.

**Actual result:** The API correctly returns `409 Conflict` and a toast "Industry already exists" appears, but **the dialog closes and everything typed is lost**. The 409 also logs 2 errors to the browser console.

**Evidence:** `IND-07-dialog-closes-on-duplicate-error.png`. The toast is visible and the dialog is gone.

---

## IND-08: Length validation messages say "less than 80/200" although 80/200 is allowed

**Severity:** Low · **Priority:** P3 · **Module:** Settings › Industry Type (Create/Edit dialog)

**Steps to reproduce**
1. **ADD INDUSTRY**, and enter an 81-character name. Click **Create Industry**.
2. Repeat with a 201-character Description.

**Expected result:** "Name must be 80 characters or fewer" / "Description must be 200 characters or fewer".

**Actual result:** "Name must be less than 80 characters" / "Description must be less than 200 characters". However, exactly 80 and exactly 200 characters are accepted, so the message contradicts the actual rule and the 80/80 counter.

**Evidence:** `IND-08-length-validation-message-wording.png` (counter 81/80).

---

## IND-09: Industry list empty state reads "No industry sectors identified."

**Severity:** Low · **Priority:** P3 · **Module:** Settings › Industry Type (list)

**Steps to reproduce:** **Settings › Industry Type**, then search for a term with no matches (e.g. `zzzz`).

**Expected result:** An industry-specific message, e.g. "No industries found."

**Actual result:** "No industry sectors identified." This mixes up Industry and Sector, which are separate master lists.

**Evidence:** `IND-05-search-not-trimmed-and-IND-09-wrong-empty-text.png`.

---

## IND-10: Create Company › Industry dropdown loads only the first 100 of ~170 industries

**Severity:** Low · **Priority:** P3 · **Module:** Company › Create Company (step 1, Industry field)

**Steps to reproduce**
1. **Company › Create Company**, and open the **Industry** dropdown without typing.
2. Scroll to the bottom of the list.

**Expected result:** All industries can be reached by scrolling (pagination or infinite scroll), or the dropdown clearly says to search for more.

**Actual result:** The request is `GET /super-admin/industries?limit=100`. The list ends at the 100th newest industry, and the remaining ~70, including frequently used ones such as "Consulting Services", can only be found by searching. Every new industry pushes another existing one out of the scrollable list.

**Evidence:** Network log (`limit=100`). No screenshot, because the list is too long to capture usefully.

---

## IND-11: Create Company › Categorization dropdowns truncate the selected value to one letter

**Severity:** Medium · **Priority:** P2 · **Module:** Company › Create Company (step 1, Categorization)

**Found:** 2026-11-09 11:49 UTC, while verifying the new industry "AI Testing".

**Steps to reproduce**
1. **Company › Create Company** at 1280×720.
2. Open the **Industry** dropdown, search `AI Test`, and select **AI Testing**.
3. Look at the Industry field, and at the Company Type, Sector and Country fields.

**Expected result:** The selected value ("AI Testing") is readable in the field, or truncated with enough characters to recognise it plus a tooltip.

**Actual result:** The field shows only **"A…"**. All four Categorization dropdowns (Company Type, Sector, Industry, Country) are so narrow that both placeholders ("S…") and selected values are cut to a single character, so the user cannot confirm what they picked before continuing.

**Evidence:** `IND-11-categorization-dropdowns-truncate-selected-value.png`. The Industry field reads "A…".

**Suggested fix:** Give the Categorization fields a sensible minimum width (or a one-per-row layout at this breakpoint), and add a `title`/tooltip with the full value.

---

## Test data left on staging

These records were created during testing. Please confirm whether to delete them, since they currently push real industries out of the dropdown's first 100 (IND-10):

`AI Testing` (description "Test purpose", created on request at 11:48 UTC) · `(blank name)` · `QA Auto Industry A` · `QA Auto Industry B` · `QA Auto 80 XXXX…X` · `QA Auto Desc Limit` · `QA Auto R&D / Oil-Gas (Test) #1` · `QA Auto <b>Bold</b>` · `QA Auto Double Click`

Keep the blank record until IND-01 is fixed and verified, because it reproduces the bug.
