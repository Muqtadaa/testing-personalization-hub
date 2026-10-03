# Testing & Personalization Hub

A sample product: a hub of tools for a Testing & Personalization (experimentation) team. It is set in a fictional retailer, "Sample Retail Co", with three lines of business: Online Store, Marketplace and Rewards App. All bundled data is synthetic.

Built on **Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript**. It brings four tools under one roof:

| Tool | What it does |
| --- | --- |
| **FX Explorer** | An interactive companion to the Feature Experimentation (FX) enablement document: when to use FX, the 8-phase process, role-based views, example use cases, a concept glossary, templates, a qualification quiz and a pre-analysis calculator. |
| **Roadmap** (`/backlog`) | A Jira-driven roadmap board with RICE scoring, board / table / Gantt views, projected delivery dates and an AI review of ticket quality. |
| **Intake & Brief Builder** (`/intake`) | A conversational intake that turns a rough idea into a structured brief, scores it with RICE, and files it in Jira. It can also review and improve existing tickets and ideate SVG mockups. |
| **Results & Revenue Explorer** (`/results`) | Reads experiment results from an uploaded Excel revenue workbook into a versioned dataset, with an executive overview, a cross-filtering explorer and per-experiment detail. |

The source of truth for FX content is `feature_experimentation_enablement_document.md`. The FX Explorer is a navigable expression of that document; if the app drifts from the document, the document wins.

---

## Quick start

```bash
npm install
npm run dev    # http://localhost:3000
```

With no environment variables set, the app runs in **snapshot mode** (below) and everything except the AI features works. Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint src
```

> `npm install` fetches `xlsx` from the official SheetJS CDN (`https://cdn.sheetjs.com`). If your network blocks that host, installation fails.

---

## Snapshot / demo mode

When service credentials are absent, which is the default, the app serves bundled **synthetic** data instead of calling external services:

- **Roadmap** serves `src/data/snapshot/roadmap.json`, a synthetic export of a Jira-style board (30 tickets, keys `HUB-1` to `HUB-30`), instead of querying Jira. "Sync" just re-reads the snapshot.
- **Results** serves `src/data/snapshot/results.json`, a synthetic revenue dataset (40 experiments across 2023 to 2026), instead of reading Supabase. Uploads and version changes are disabled.
- **Auth gate** is off: the app loads with no login wall.
- **Intake** submit and update to Jira are disabled. Drafts live in memory. The AI brief builder uses a stub provider unless `ANTHROPIC_API_KEY` is set.

The snapshot fallbacks switch off automatically once the matching credentials are present. The live-versus-snapshot choice is made in `src/app/api/roadmap/route.ts` and `src/lib/results/db/versions.ts`.

To refresh the snapshots from live services, start the app with credentials and save `GET /api/roadmap?days=365` to `src/data/snapshot/roadmap.json` and `GET /api/results/data` to `src/data/snapshot/results.json`. Review the output for real names, emails and URLs before committing it to a public repository.

---

## Configuration

Every variable is optional. Copy `.env.example` to `.env.local` and fill in only what you need. `.env.example` is the full reference.

| Group | Variables | Enables |
| --- | --- | --- |
| Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Live AI in Intake (briefs, ideation) and roadmap ticket review. |
| Jira connection | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_DRY_RUN` | Live roadmap feed and Intake submit/update. `JIRA_BASE_URL`, `JIRA_EMAIL` and `JIRA_API_TOKEN` must all be set. |
| Jira identifiers | `JIRA_CLOUD_ID`, `JIRA_PROJECT_KEY` (default `HUB`), `JIRA_PROJECT_ID`, `JIRA_ISSUE_TYPE_ID`, `JIRA_SERVICE_ACCOUNT_ID`, `JIRA_FIELD_*`, `JIRA_OPT_*` | Match the app to your Jira site. Defaults are neutral placeholders; see `src/lib/intake/config/jira-env.ts`. |
| Sign-in allowlist | `ALLOWED_EMAIL_DOMAINS` (default `example.com`) | Comma-separated email domains allowed to sign in and use Intake. |
| Supabase (server) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Results dataset store, Intake drafts and app config. |
| Supabase (public) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Email one-time-code login wall. If either is missing the gate stays open. |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | Retention of Intake screenshots and SVG mockups, and of Results workbook uploads. |

### Supabase tables

The repository does not include SQL migrations. The code expects these tables when Supabase is configured:

- `intakes`: Intake drafts and submitted briefs.
- `app_config`: editable Intake configuration (read and written from `/intake/admin/config`).
- `jira_metadata_snapshot`: cached Jira field and option metadata.
- `ticket_reviews`: cached Roadmap ticket reviews (otherwise an in-process cache is used).
- `results_dataset_versions`: one row per Results upload, with the parsed dataset as JSONB. Exactly one row is active at a time, enforced by a partial unique index; activating an older version is the rollback path.

### Authentication

`src/proxy.ts` runs `src/lib/supabase/proxy.ts` on every request. When the public Supabase variables are set, unauthenticated or off-domain users are redirected to `/login` (email one-time code); `/login` and `/api/auth/*` stay open. When they are not set, the gate fails open.

---

## Routes

| Route | Tool | Purpose |
| --- | --- | --- |
| `/` | Hub | Landing page and tool launcher. |
| `/explore` | FX Explorer | The "why FX" pitch and entry point to the FX pages. |
| `/decide` | FX Explorer | Qualification quiz: FX, web experimentation or direct release. |
| `/process` · `/process/[phaseId]` | FX Explorer | Eight-phase visualizer with deep-linkable phases and a role swimlane. |
| `/roles` · `/roles/[roleId]` | FX Explorer | Stakeholder views: Product, Engineering, T&P, Analytics, Leadership. |
| `/use-cases` | FX Explorer | Example scenarios across product surfaces. |
| `/concepts` | FX Explorer | Concept glossary linked to Optimizely docs (supports `#term` deep links). |
| `/templates` | FX Explorer | Copy or download Markdown templates. |
| `/pre-analysis` | FX Explorer | Sample-size, runtime and revenue pre-analysis calculator. |
| `/backlog` | Roadmap | Jira roadmap: board, table and Gantt views, filters, RICE and projected delivery. |
| `/intake` | Intake | Start a brief; chat, then review and submit. |
| `/intake/drafts` · `/intake/review/[id]` · `/intake/confirm/[id]` | Intake | Saved drafts, brief review and submission confirmation. |
| `/intake/improve/[issueKey]` | Intake | Improve the brief on an existing Jira ticket. |
| `/intake/admin/config` | Intake | Edit the intake configuration (lines of business, journeys, per-brand and program context). |
| `/results` | Results | Executive overview: program revenue, forecast pacing, composition, top wins. |
| `/results/explorer` | Results | Cross-filtering charts, uplift leaderboards, experiment table, CSV export. |
| `/results/experiments/[id]` | Results | Per-experiment detail: uplift by month, variation tables, holdback splits. |
| `/results/data` | Results | Upload the Revenue Workbook (and optional Source Data); versioned with rollback. |
| `/login` | Auth | Email one-time-code sign-in (only active when Supabase auth is configured). |

API routes live under `src/app/api/`: `auth`, `intake` (including `jira/submit`, `jira/update`, `jira/metadata`, `improve`, attachments and ideation), `roadmap` (including `review`) and `results` (`data`, `upload`, `versions`).

---

## Roadmap

The Roadmap reads tickets from a Jira project (key `HUB` by default) and normalizes them (`src/lib/roadmap/normalize.ts`) into an eight-stage model (`src/lib/roadmap/stages.ts`): Intake, Backlog, Prioritized, Design, Dev and Live form the delivery pipeline; Done and Blocked are terminal states shown for recent activity. `src/lib/roadmap/project.ts` projects launch dates from stage and RICE data and flags at-risk items. `src/lib/roadmap/review/` asks the LLM to check each ticket for missing RICE fields and brief quality; a stored review is reused until the ticket's `updated` timestamp changes.

## Intake & Brief Builder

`src/lib/intake/` holds the intake engine: a conversation (`intake/engine.ts`) driven by prompts and business context (`llm/prompts.ts`, `config/context-content.ts`), brief generation (`brief/`), RICE scoring (`rice/score.ts`), and Jira mapping, submission and update (`jira/`). The LLM provider is pluggable (`llm/provider.ts`): Anthropic when `ANTHROPIC_API_KEY` is set, otherwise a stub (`llm/mock.ts`). Business context and the line-of-business and journey lists are stored in the `app_config` table, editable at `/intake/admin/config`, and default to the fictional Sample Retail Co in `config/defaults.ts`.

## Results data

The Results tool reads the monthly **Revenue Workbook** (and optional **Source Data** workbook) uploaded at `/results/data`. Uploads are parsed server-side (`src/lib/results/parse/`) into a normalized `ResultsDataset` (`src/lib/results/types.ts`). That model is the seam where a future warehouse ingestion job could plug in: write the same document, and the Excel parser is just one producer. The headline metric everywhere is **"Variation Revenue Difference"** (incremental uplift versus control), read directly from the workbook and never recomputed.

- **Storage:** raw files go to private Vercel Blob (`results/uploads/...`); the parsed dataset is stored as described under Supabase tables. Without Supabase configured, the app serves the bundled snapshot read-only.
- **`xlsx` dependency:** pinned to the official SheetJS CDN tarball (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) because the npm registry copy is frozen at 0.18.5 with known CVEs. Dependabot will not bump it; check https://cdn.sheetjs.com for new releases manually.
- **Known data nuance:** if the monthly sheets' labeled program totals disagree with the Summary sheet, the parser surfaces warnings in the upload report. Executive annual figures use the Summary sheet values.

---

## Deploy (Vercel)

Push to a Git repository and import it in Vercel; Next.js is auto-detected (`vercel.json` sets the framework). Vercel Web Analytics is wired up through `@vercel/analytics/next` in the root layout.

For a demo deploy, set no environment variables (snapshot mode), or set only `ANTHROPIC_API_KEY` to keep the Intake AI features live.

---

## Project structure

```
.
├── feature_experimentation_enablement_document.md   # FX source content
├── PRODUCT.md  DESIGN.md  DESIGN_SYSTEM.md          # product brief and design system docs
├── .impeccable.md                                   # design context for design tooling
├── .env.example                                     # every environment variable, documented
├── next.config.ts  tsconfig.json  postcss.config.mjs  eslint.config.mjs
├── tailwind.config.js                               # design tokens, loaded by globals.css via @config
├── public/                                          # logo.svg, favicon.svg
└── src/
    ├── proxy.ts                                     # app-wide auth gate (Next.js proxy)
    ├── app/
    │   ├── layout.tsx  globals.css  page.tsx  not-found.jsx
    │   ├── explore/ decide/ pre-analysis/ process/ roles/ use-cases/ concepts/ templates/   # FX Explorer
    │   ├── backlog/                                 # Roadmap
    │   ├── intake/                                  # Intake & Brief Builder (+ admin, drafts, review, confirm, improve)
    │   ├── results/                                 # Results & Revenue Explorer
    │   ├── login/
    │   └── api/                                     # auth, intake, roadmap, results
    ├── components/
    │   ├── HubNav.jsx  Footer.jsx  AuthMenu.jsx
    │   ├── ui/                                      # design-system primitives (see ui/README.md)
    │   ├── roadmap/                                 # board, table, Gantt, filters
    │   └── results/                                 # charts, tables, data manager
    ├── data/                                        # editable FX content
    │   ├── phases.js roles.js useCases.js decisionTree.js
    │   ├── concepts.js optimizelyRefs.js templates.js
    │   └── snapshot/                                # synthetic demo data (roadmap.json, results.json)
    └── lib/
        ├── preAnalysis.js                           # pre-analysis math
        ├── auth/  supabase/                         # allowlist, display names, Supabase clients
        ├── intake/                                  # engine, LLM, brief, RICE, Jira
        ├── roadmap/                                 # normalize, stages, projection, review
        └── results/                                 # parser, derive, types, db
```

---

## Adding a new tool to the hub

1. **Route**: add `src/app/<tool>/page.jsx` (or `.tsx`). Mark it `'use client'` only if it uses hooks or browser APIs; otherwise leave it a Server Component. Keep heavy logic in `src/lib/<tool>/`.
2. **Data**: put static content in `src/data/<tool>.js`. Server-backed tools read their data through an API route under `src/app/api/<tool>/`.
3. **Nav and launcher**: add the tool to `tools` in `src/components/HubNav.jsx` and a tile in `src/app/page.tsx`.

---

## Design system and tokens

Tailwind v4 loads the project's tokens from `tailwind.config.js` through the `@config` directive in `src/app/globals.css`. This preserves the WCAG-tuned color split where text grays differ from hairline and fill grays:

| Token | Text utility | Fill/border utility |
| --- | --- | --- |
| `muted` | `text-muted` → `#595C5F` (readable) | `bg-muted` / `border-muted` → `#C3C2C5` (hairline) |
| `subtle` | `text-subtle` → `#6F7174` | `bg-subtle` → `#F7F7F7` |

Plus a semantic type scale (`text-display`, `text-h1`/`-lg`, `text-h2`, `text-body`/`-sm`/`-lg`, `text-eyebrow`, and so on). The default palette is `lime #B1FF33` (accent), `charcoal #38353F` (dark surfaces) and `ink #212529` (body), set in **Inter** loaded through `next/font/google` (exposed as `--font-inter`). Change these values in `tailwind.config.js` to re-skin the product.

See [DESIGN.md](DESIGN.md) for the working design rules, [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for a portable spec, [PRODUCT.md](PRODUCT.md) for users, voice and principles, and [src/components/ui/README.md](src/components/ui/README.md) for the primitives.

---

## Editing content

FX content is decoupled from layout in `src/data/`:

- Use cases: `src/data/useCases.js`
- Decision-tree questions and signals: `src/data/decisionTree.js`
- Phase ownership: `src/data/phases.js` (`phases` and `roleInvolvement`)
- Role provides/gets: `src/data/roles.js`
- Templates: `src/data/templates.js`
- Concepts: `src/data/concepts.js` (and `optimizelyRefs.js` for outbound links)

Intake business context lives in `src/lib/intake/config/context-content.ts` and `defaults.ts`.

---

## Notes on third-party names

This sample uses Optimizely Feature Experimentation as its experimentation platform, and its public documentation is linked from `/concepts` and the process pages. Optimizely, Jira, Supabase, Vercel and Anthropic are trademarks of their respective owners; "Sample Retail Co" and all bundled people, tickets and revenue figures are fictional.
