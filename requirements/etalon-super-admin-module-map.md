# Etalon MOS — Super Admin Console: Module Map

Source: live exploration of `https://etalon-staging.cubettech.in/super-admin` on 2026-11-10
(read-only — nothing created, edited or deleted), cross-checked against
*Etalon – Cubet SOW v1* (§4.2.1, §4.3, §4.4 Step 1).

## Access

| Item | Detail |
|---|---|
| Login URL | `/super-admin` — email + password form (not Azure SSO) |
| Post-login landing | `/dashboard/home` |
| Header | Notifications bell, profile menu (My Profile, Change Password, Sign Out) |
| Sidebar | Dashboard · Company · Settings ▸ (Industry Type, Company Type, Sectors) · Bench Mark ▸ (Financial, Operational) · collapse toggle |
| Tenant console URL | `https://<company-subdomain>.etalon-staging.cubettech.in` (shown in Create Company step 5). The bare host `/` and `/login` redirect to `/not-found`. |

## 1. Dashboard — `/dashboard/home`
"Platform Overview — Monitor tenant growth and overall system health."
- KPI cards: **Total Companies** (+N this week), **Active Users**, **Inactive Users** (pending activation), **Most Common Type** (top industry).
- Charts: **User Growth** (monthly new registrations), **Company Type Distribution**.
- **Recently Onboarded** — latest 5 tenants with status + created date, "View all" → Company.
- **Pending Activation** — companies with incomplete setup ("No incomplete tenants" empty state), "View all" → Company.

## 2. Company (Tenant management) — `/dashboard/company`
**List**
- Search ("Search companies, industry…"), **Create Company** button.
- Columns: Company · Type · Industry · Sector · Status (sortable) · SSO (Enabled/Disabled) · Created (sortable) · Active/Inactive (toggle switch) · Actions.
- Row actions: **email icon** (likely resend invite to primary contact — unconfirmed) and **pencil** (edit).
- Pagination with page-size selector (default 10).

**Create / Edit wizard** — `/dashboard/company/create[?step=N&id=<uuid>]` (edit reuses the create route)

| Step | Name | Fields / behaviour |
|---|---|---|
| 1 | Company Profile | *Basic Identity*: Organization Name\*, Address\*. *Categorization*: Company Type\*, Sector\*, Industry\*, Country\* (Type/Sector/Industry are **disabled on edit**). *Web & Details*: Financial Year Start Month, Website URL, Brief Description. *Primary Contact*: First Name\*, Last Name\*, Email Address\*. |
| 2 | Hierarchy Level | Phase 1 **Config Levels** — Level Definition Tree (root "Company", ADD SUB-LEVEL, delete, Expand/Collapse All). Phase 2 **Create Production Flow** — build the org tree using the defined levels; each node has Name + CODE. |
| 3 | Company Roles | Add role by name (e.g. Supervisor); "Current Organization Roles" list (default **Admin**). |
| 4 | SSO Config | "Set up SSO" (Required): Azure Client ID, Azure Tenant ID, Company Domain. |
| 5 | Branding & Review | Review summary (profile, contact, website `https://<subdomain>.etalon-staging.cubettech.in`), status chips (Hierarchy, Roles, SSO/Auth, Branding), Logo upload (PNG/SVG/JPEG, max 2 MB), Primary Brand Color (6 presets + custom hex), live Brand Preview. **Save Organization**. |

Navigation: Previous / Continue, clickable "Setup Progress" stepper, Back to Companies.

## 3. Settings (master data)
All three share the same pattern: search, add (dialog), table with Edit/Delete actions, pagination.

| Page | Route | Add dialog fields | Seed values seen |
|---|---|---|---|
| Industry Type | `/dashboard/settings/industry-type` | Industry Name\* (max 80), Description (optional, max 200) | Waste Management, Thermal Coal, Consulting Services, Insurance – Diversified… |
| Company Type | `/dashboard/settings/company-type` | Type Name, Description | Sole Proprietorship, Partnership, Corporation, Government, Non-Profit, Enterprise, SME, Startup |
| Sectors | `/dashboard/settings/sectors` | Sector Name, Description | Real Estate, Utilities, Materials, Industrials, Communication Services, Technology, Consumer Staples, Consumer Discretionary, Energy, Financials… |

These feed the Company Type / Sector / Industry dropdowns in Create Company step 1.

## 4. Bench Mark (reference data upload)
| Page | Route | Notes |
|---|---|---|
| Financial Benchmarking | `/dashboard/benchmark/upload/financial` | Upload history (File Name, Row Count, Status, Message, Uploaded By, Uploaded At); **IMPORT** → "Upload CSV" dialog (Download CSV Template, choose/drag `.csv` only, START IMPORT disabled until file chosen). Template = public-company financials: Exchange, Ticker, Company Name, Country, Sector, Industry, Market Cap, Revenue, EBITDA, Net Income, ratios (Current, Quick, D/E…), size band. Typical file ≈ 27k rows. |
| Operational Benchmarking | `/dashboard/benchmark/upload/operational` | Same upload UI; typical file ≈ 1.7k rows. |

This data powers the tenant-side Benchmark module (SOW §4.2.4).

## Observations / candidate defects (to confirm)
1. **Tenant root URL 404** — `etalon-staging.cubettech.in/` and `/login` → `/not-found`; `GET /user/auth/sso-credentials/etalon-staging` returns 400. Expected if tenants live only on subdomains, but there's no friendly landing page.
2. **Super Admin auth is email/password**, SOW §4.2.2/§5.1 specify Azure AD SSO (may be intended for tenants only — confirm).
3. **Notifications bell** does nothing on click.
4. **Row action buttons have no accessible name/tooltip** (email + edit icons) — a11y issue; also forces brittle locators.
5. **Company table at 1280px viewport** — the Company name column scrolls out of view.
6. **Deep-linking `?step=N&id=`** shows empty review data ("—", SSO "Pending") even for configured tenants; data only loads when entering via the pencil icon.
7. **List pages are slow** — "Loading data…" persisted 5–12 s on Settings/Benchmark pages.
8. **Stale QA data** in Industry Type ("QA Auto …" rows incl. `<b>Bold</b>` and 200-char descriptions) — clean up or isolate test data.
9. Console: missing `Description`/`aria-describedby` on DialogContent; password inputs lack `autocomplete`.

## Not yet explored
- Organisation (Company) Admin console — needs a tenant subdomain and a login (SOW says Azure SSO).
- Edit/Delete dialogs on Settings rows, Active/Inactive toggle effect, email action, My Profile / Change Password pages (skipped to avoid changing data).
