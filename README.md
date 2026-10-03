# Testing & Personalization Hub

A sample product: a hub of tools for a Testing & Personalization team, for the fictional retailer "Sample Retail Co" (lines of business: Online Store, Marketplace, Rewards App). All data is synthetic. Built on **Next.js (App Router) + React 19 + Tailwind CSS v4 + TypeScript**, it brings the team's tools under one roof:

- **Feature Experimentation Explorer** — an interactive companion to the FX enablement document: when to use FX, the 8-phase process, role-based views, example use cases, the concept glossary, reusable templates, and the experiment pre-analysis calculator.
- **Testing & Personalization Backlog** — the RICE-scored test backlog across the Online Store, Marketplace, and Rewards App, filterable and sortable.
- **Intake & Brief Builder** *(coming soon)* — conversational intake → structured brief → Jira. Joining the hub in a later phase.
- **Results & Revenue Explorer** *(planned)* — read out experiment results and tie them to revenue.

The source of truth for FX content lives in `feature_experimentation_enablement_document.md`. The Explorer is a navigable expression of that document — if the app drifts from the doc, the doc wins.

---

## Snapshot / demo mode

This repository runs in *snapshot mode* (a demo mode backed by **synthetic data**)
whenever external service credentials are absent, which is the default (see
`.env.example`). No real company, customer, or experiment data is included:

- **Roadmap** serves a synthetic export of a Jira-style board
  (`src/data/snapshot/roadmap.json`) instead of querying Jira. "Sync" just
  re-reads the snapshot.
- **Results** serves a synthetic revenue dataset
  (`src/data/snapshot/results.json`) instead of reading Supabase. Uploads and
  version changes are disabled.
- **Auth gate** is off: the app loads with no login wall.
- **Intake -> Jira** submit/update are disabled; the AI brief builder still works
  if `ANTHROPIC_API_KEY` is set.

To connect live services, populate the matching variables in
`.env.example` — the snapshot fallbacks switch off automatically once creds are
present. The data layer keeps both paths: `src/app/api/roadmap/route.ts` and
`src/lib/results/db/versions.ts` choose live-vs-snapshot based on whether
credentials exist.

To refresh the snapshot (with live creds configured): start the app and save
`GET /api/roadmap?days=365` → `src/data/snapshot/roadmap.json` and
`GET /api/results/data` → `src/data/snapshot/results.json`.

---

## Routes

| Route | Tool | Purpose |
| --- | --- | --- |
| `/` | Hub | Landing / tool launcher. |
| `/explore` | FX Explorer | The "why FX" pitch and entry point to the FX pages. |
| `/decide` | FX Explorer | Qualification quiz → FX / web experimentation / direct release. |
| `/process` · `/process/[phaseId]` | FX Explorer | Eight-phase visualizer with deep-linkable phases and a role swimlane. |
| `/roles` · `/roles/[roleId]` | FX Explorer | Stakeholder views: Product, Engineering, T&P, Analytics, Leadership. |
| `/use-cases` | FX Explorer | Example scenarios across product surfaces. |
| `/concepts` | FX Explorer | Concept glossary linked to Optimizely docs (supports `#term` deep links). |
| `/templates` | FX Explorer | Copy/download Markdown templates. |
| `/pre-analysis` | FX Explorer | Sample-size / runtime / revenue pre-analysis calculator. |
| `/backlog` | Backlog | RICE-scored test backlog with filters, card/list views, and sort. |
| `/results` | Results | Executive overview: program revenue, forecast pacing, composition, top wins. |
| `/results/explorer` | Results | Team deep-dive: cross-filtering charts, uplift leaderboards, experiment table, CSV export. |
| `/results/experiments/[id]` | Results | Per-experiment detail: uplift by month, variation tables, holdback splits. |
| `/results/data` | Results | Upload the Revenue Workbook (+ optional Source Data); versioned with rollback. |

---

## Results data

The Results tool reads the monthly **Revenue Workbook** (and optional **Source Data**
workbook) uploaded at `/results/data`. Uploads are parsed server-side
(`src/lib/results/parse/`) into a normalized `ResultsDataset`
(`src/lib/results/types.ts`) — that model is the seam where a future
BigQuery/Snowflake ingestion job plugs in (write the same document; the Excel
parser is just one producer). The headline metric everywhere is **"Variation
Revenue Difference"** (incremental uplift vs control), read directly from the
workbook, never recomputed.

- **Storage:** raw files go to private Vercel Blob (`results/uploads/…`); the
  parsed dataset is one JSONB row per upload in the Supabase
  `results_dataset_versions` table (one active version at a time, enforced by a
  partial unique index; activating an older version is the rollback path).
  Without Supabase env the repo falls back to in-memory storage, like intake.
- **`xlsx` dependency:** pinned to the official SheetJS CDN tarball
  (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) because the npm
  registry copy is frozen at 0.18.5 with known CVEs. Dependabot will not bump
  it — check https://cdn.sheetjs.com for new releases manually.
- **Known data nuance:** the monthly sheets' labeled program totals disagree
  with the Summary sheet for 2024 (the Summary applies a realization
  adjustment). The parser surfaces this as warnings in the upload report;
  leadership-facing annual figures use the Summary sheet values.

---

## Run locally

```bash
npm install
npm run dev    # http://localhost:3000
```

## Build for production

```bash
npm run build
npm run start  # serve the production build
```

## Deploy (Vercel)

Push to a Git repo and import in Vercel. Next.js is auto-detected. Vercel Web Analytics is wired up via `@vercel/analytics/next` in the root layout.

For a **demo deploy**, set no environment variables at all (it runs
in snapshot mode out of the box), or set just `ANTHROPIC_API_KEY` to keep the
Intake AI features live. See [Snapshot / demo mode](#snapshot--demo-mode)
and `.env.example`.

---

## Project structure

```
.
├── feature_experimentation_enablement_document.md   # FX source content
├── next.config.ts
├── tsconfig.json                                     # allowJs: true (JSX pages port incrementally)
├── postcss.config.mjs                                # @tailwindcss/postcss
├── tailwind.config.js                                # design tokens, loaded by globals.css via @config
└── src/
    ├── app/
    │   ├── layout.tsx                                # root: Inter font, HubNav, Footer, Analytics
    │   ├── globals.css                               # @import "tailwindcss" + @config + base/animations
    │   ├── page.tsx                                  # hub landing / launcher
    │   ├── not-found.jsx
    │   ├── explore/ decide/ pre-analysis/            # FX pages (one folder per route)
    │   ├── process/[[...phaseId]]/
    │   ├── roles/[[...roleId]]/
    │   ├── use-cases/ concepts/ templates/
    │   └── backlog/                                  # Backlog tool
    ├── components/
    │   ├── HubNav.jsx                                # two-tier nav (tools + FX sub-nav)
    │   ├── Footer.jsx
    │   └── ui/                                       # design-system primitives
    ├── data/                                         # all editable content
    │   ├── phases.js roles.js useCases.js decisionTree.js
    │   ├── concepts.js optimizelyRefs.js templates.js
    │   └── backlog.js                                # RICE backlog (regenerated from the workbook)
    └── lib/
        └── preAnalysis.js                            # pre-analysis math
```

---

## Adding a new tool to the hub

The pattern (generalized from how Pre-Analysis and the Backlog were brought in):

1. **Route** — add `src/app/<tool>/page.jsx`. Mark it `'use client'` only if it uses hooks/browser APIs; otherwise leave it a Server Component. Keep heavy logic in `src/lib/<tool>.js`.
2. **Data** — put content in `src/data/<tool>.js`.
3. **Nav + launcher** — add the tool to `tools` in `src/components/HubNav.jsx` and a tile in `src/app/page.tsx`.

---

## Design system & tokens

Tailwind v4 loads the project's tokens from the legacy `tailwind.config.js` via the `@config` directive in `globals.css`. This intentionally preserves the WCAG-tuned color split where text grays differ from hairline/fill grays:

| Token | Text utility | Fill/border utility |
| --- | --- | --- |
| `muted` | `text-muted` → `#595C5F` (readable) | `bg-muted` / `border-muted` → `#C3C2C5` (hairline) |
| `subtle` | `text-subtle` → `#6F7174` | `bg-subtle` → `#F7F7F7` |

Plus a semantic type scale (`text-display`, `text-h1`/`-lg`, `text-h2`, `text-body`/`-sm`/`-lg`, `text-eyebrow`, …).

Brand palette: `lime #B1FF33` (accent), `charcoal #38353F` (dark surfaces), `ink #212529` (body). Typography is **Inter**, loaded via `next/font/google` (exposed as `--font-inter`).

> **Note for Phase 2 (Intake):** Intake currently defines the same tokens via Tailwind v4 `@theme` in its own `globals.css`. When Intake is merged in, reconcile the two mechanisms (either adopt `@config` there too, or move this project onto `@theme`). The token *values* already match, so it's a mechanism reconciliation, not a visual one.

---

## Editing content

Content is decoupled from layout in `src/data/`:

- Use cases → `src/data/useCases.js`
- Decision-tree questions/signals → `src/data/decisionTree.js`
- Phase ownership → `src/data/phases.js` (`phases` + `roleInvolvement`)
- Role provides/gets → `src/data/roles.js`
- Templates → `src/data/templates.js`
- Concepts → `src/data/concepts.js` (+ `optimizelyRefs.js`)

### Regenerating the backlog

`src/data/backlog.js` is generated from the RICE workbook (`Test_Backlog_RICE - <date>.xlsx`). It's currently a **manual export** — don't hand-edit rows; re-export from the workbook so RICE scores and quality flags stay in sync. (Automating this is a future enhancement now that the hub has a server runtime.)
