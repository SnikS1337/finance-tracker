# Personal Finance Tracker

A fast, private, offline-first personal finance tracker. All data is stored locally in the browser
(`localStorage`) — nothing is sent anywhere. Built as an installable PWA so it works offline and can be
added to your home screen.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build a production bundle into dist/
npm run preview   # preview the production build locally
npm test          # run the unit test suite (vitest)
```

Open the printed local URL (usually `http://localhost:5173`) in your browser.

## Deploying

`npm run build` produces a static site in `dist/` that can be deployed to any static host (Netlify,
Vercel, GitHub Pages, Cloudflare Pages, a plain S3 bucket, etc.) — there is no backend.

Because this is a client-side-routed SPA (React Router), configure your host to serve `index.html` for
unknown paths (a "SPA fallback" / rewrite rule) so that a direct visit or refresh on `/transactions`,
`/analytics`, or `/settings` works. Most static hosts have a one-line setting for this (e.g. Netlify's
`_redirects` with `/* /index.html 200`, Vercel's default SPA handling, or GitHub Pages' `404.html` trick).
`npm run preview` and `npm run dev` already handle this automatically, so it only matters once deployed.

## Architecture

- **`src/lib/storage.ts`** — the only module that touches `localStorage`. Everything else (hooks, UI)
  goes through it, so swapping to a remote backend later only means reimplementing this one file.
- **`src/lib/calculations.ts`** — pure functions for every financial calculation (totals, averages,
  medians, category breakdowns, budget progress, etc.). These are unit-tested in
  `src/lib/__tests__/calculations.test.ts`.
- **`src/lib/date-utils.ts`** — timezone-safe calendar date handling. Transaction dates are plain
  `yyyy-MM-dd` strings with no timezone component, always parsed/formatted as local dates.
- **`src/hooks/`** — one hook per data domain (`useTransactions`, `useCategories`, `useBudgets`,
  `useSettings`), each wrapping the storage layer with React state.
- **`src/context/AppDataContext.tsx`** — instantiates those hooks once at the app root so every page
  reads and writes the same in-memory state (rather than each page holding its own stale copy).
- **`src/components/`** — organized by feature (`transactions/`, `categories/`, `budgets/`,
  `dashboard/`, `analytics/`, `settings/`, `layout/`) plus a small `ui/` folder of primitives (Button,
  Card, Sheet, Toast, etc.).

## Notable decisions

- **Currency**: VND only, stored as whole integers (VND has no subunit in everyday use) — this sidesteps
  floating-point rounding issues entirely.
- **UI primitives**: hand-built on top of Radix UI primitives (Dialog, Dropdown Menu) rather than a
  component library, to keep the bundle small and avoid a build-time dependency on a components CLI.
- **Charts**: Recharts, chosen for its React-native API and reasonable bundle size.
- **PNG reports**: rendered from a real (hidden) DOM node via `html-to-image`, so the exported image
  always matches what's on screen.
- **PWA**: `vite-plugin-pwa` with `autoUpdate` registration. The bundled icon is an SVG; swap in real
  PNG icons under `public/icons/` for stricter platform install requirements if needed.
- **Budgets** are always monthly (the only period that makes sense for a recurring budget) and are
  either "overall" or scoped to one category.
- **Deleting a category that's still in use** requires reassigning its transactions to another category
  of the same type first — there is no silent orphaning or cascading delete of transactions.

## Testing

`npm test` runs the calculation unit tests, which cover: income/expense/balance totals, average vs.
median daily spend (including how zero-spend days factor in), category percentage breakdowns,
highest/lowest spending day, period-over-period percentage change (including the undefined-when-previous-
is-zero case), and budget status thresholds (normal / approaching / exceeded).
