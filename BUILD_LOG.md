# Build log — Harbor & Home Budget

**Bounty:** Make the best household budget site (`best-household-budget-site-20261126-1457`),
$50 USDC, 10 paid places at $5 each. Deadline 2026-11-29 23:57 JST.
**Built:** 2026-11-26 by a subagent. **Status: complete, NOT submitted, no repo created.**

## What was built

"Harbor & Home Budget" — a household budget site for the fictional Alvarez
family, November 2026, all figures in USD ($). Warm modern design (deep green
+ terracotta on cream), responsive with a bottom-scrolling nav on phones.
Static files under `app/`, no build step, no network requests, no external
libraries or fonts; charts are hand-drawn inline SVG.

- **Dashboard** (`#/`): income $8,138.25, expenses $4,710.18, left over
  $3,428.07, savings rate 42%; 6-month income-vs-expenses bar chart;
  budget-vs-actual bars; recent transactions; upcoming bills; goal snapshots.
- **Transactions** (`#/transactions`): 42 realistic Nov 2026 sample
  transactions; add/edit/delete (modal form with category, date, amount,
  note); search + category/type filters.
- **Budget Planner** (`#/budget`): editable monthly budget per category,
  progress bars, over-budget warnings (Housing and Groceries are over in
  the sample month — the warning UI is exercised for real).
- **Bills** (`#/bills`): 10 recurring bills with due dates; mark paid/unpaid.
- **Savings Goals** (`#/goals`): emergency fund, road trip, new car, college
  fund; add money / create a new goal.
- **Reports** (`#/reports`): spending-by-category donut, monthly trend table,
  top categories, client-side CSV export (43-line CSV verified).

All edits persist in localStorage (`harbor-home-budget-v1`). Hash routing
makes every section a real link.

## Files

- `app/index.html`, `app/style.css`, `app/data.js` (seed data), `app/main.js`
- `main.ts` — copied from the kit starter, unchanged logic (copies `app/` +
  `screenshots/` to output, writes `dossier.json` via `buildDossier`)
- `vendor/makefun-frontend.ts` — copied from the kit UNCHANGED;
  sha256 `4c8da1c8e76490b3a847670f49137d3ec23953e3c988fe6a6cb320fce5739240`, 85,533 bytes
- `LICENSE` (MIT, © armpro666-tech), `README.md`, `shots.json`, `.gitignore`
  (excludes `out/`, `node_modules/`)
- `scripts/shots.mjs`, `scripts/playtest.mjs` (Playwright, installed locally
  in `scripts/node_modules/`)

## Screenshots (real Playwright renders, JPEG q85)

| File | View | Size |
|---|---|---|
| `screenshots/1-dashboard.jpg` | `#/` 1280×800 | 108,162 bytes |
| `screenshots/2-transactions.jpg` | `#/transactions` 1280×800 | 117,571 bytes |
| `screenshots/3-reports.jpg` | `#/reports` 1280×800 | 109,966 bytes |
| `screenshots/4-phone.jpg` | `#/` 390×844 phone | 45,729 bytes |

All ≤ 262,144 bytes. All four were read visually and confirmed to show the
real site (stat cards, charts, tables, phone layout).

## Verification (2026-11-26)

- **Playwright playtest** (`node scripts/playtest.mjs`): 22/22 checks PASS —
  dashboard figures, all 6 nav links + hash routing, search (4 "Whole Foods"
  rows), add → edit ($15.00) → delete a transaction, budget save persisted
  (Groceries → $800 in localStorage), bill toggle, goal contribution
  ($7,850 → $7,900), CSV export download (43 lines, correct header).
  **0 console errors, 0 failed/external requests.**
- **Screenshots script**: 0 console errors, 0 failed/external requests.
- **Build** (`MAKEFUN_OUTPUT_DIR=out node main.ts`): `out/` contains `app/`,
  `screenshots/`, `dossier.json` (558,689 bytes, under the 1.5 MiB cap).
  Ran three times (`out`, `out1`, `out2`) — all byte-identical: deterministic.
- **Note:** ES-module scripts are blocked by CORS under `file://`, so the
  test scripts serve `app/` over a local HTTP server (same as the kit's own
  `serve.ts` approach; the kit starter itself uses ES modules). The site
  itself makes no network requests.

## Not done (out of scope for this task)

No GitHub repo created, nothing submitted, no wallet touched. Next steps for
the parent agent: create a public repo under `armpro666-tech`, push this
entry, and submit via the make.fun flow.
