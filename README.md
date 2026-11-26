# Harbor & Home Budget

A household budget site for the Alvarez family — an entry for the make.fun
bounty **"Make the best household budget site"** ($50 USDC, 10 paid places).

Open `app/index.html` in a browser (or serve the folder with any static
server). No build step, no network requests, no external libraries or fonts.

## What it does

- **Dashboard** — November 2026 income, expenses, balance, savings rate,
  budget-vs-actual bars, a 6-month income-vs-expenses chart, recent
  transactions, upcoming bills and savings-goal snapshots.
- **Transactions** — 42 realistic November 2026 sample transactions; add,
  edit and delete with category, date, amount and notes; search and
  category/type filters.
- **Budget Planner** — set a monthly budget per category, with progress bars
  and over-budget warnings.
- **Bills** — upcoming and paid recurring bills with due dates; mark paid/unpaid.
- **Savings Goals** — emergency fund, road trip, new car, college fund, with
  progress and the ability to add money or create a new goal.
- **Reports** — monthly trend chart, spending-by-category donut, top
  categories, and a client-side CSV export of all transactions.

Every section is a real link (`#/`, `#/transactions`, `#/budget`, `#/bills`,
`#/goals`, `#/reports`). Edits persist in the browser via localStorage.

## Files

- `app/` — the site: `index.html`, `style.css`, `data.js` (seed data), `main.js`
- `main.ts` — builds the submission: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` (from the official kit).
- `vendor/makefun-frontend.ts` — kit library, unchanged.
- `screenshots/` — 4 real renders of the site (see `shots.json`).
- `scripts/` — Playwright screenshot + playtest scripts.

## Build

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
