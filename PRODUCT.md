# Impeccable Design — Project Context

This file is the persistent design brief for the **Testing & Personalization Hub (FX Explorer)**. All design skills (`extract`, `audit`, `critique`, `typeset`, `arrange`, `colorize`, `bolder`, `delight`, `animate`, `clarify`, `distill`, `harden`, `optimize`, `polish`) should read from this file before making changes, and design work should be evaluated against the principles below.

## Design Context

### Users

**Who:** Internal growth stakeholders at the fictional retailer Sample Retail Co across five roles — Product Managers, Engineers, Testing & Personalization specialists, Analytics partners, and Leadership.

**Context of use:** Pulled up mid-conversation. They're trying to answer a specific, in-the-moment question: *"Should we run an FX test on this? How does the process work? What do I own? What templates do I need?"* They are not browsing for inspiration — they are looking up an answer and then moving on.

**Jobs to be done:**
- Decide whether an enhancement qualifies for FX (vs. web experimentation vs. direct release).
- Find their role's responsibilities, deliverables, and engagement points in the 8-phase process.
- Pattern-match against existing example use cases (browse, checkout, account, loyalty, internal tools).
- Grab a template (intake questionnaire, decision criteria, QA checklist, readout) and use it.
- Share a link with a teammate that drops them directly into the relevant view.

**Emotional goals:**
1. **Confidence** — "yes, this is the right call."
2. **Clarity** — "I know exactly what to do next."
3. **Agency** — "I see where I fit; I'm not buried in someone else's process."

### Brand Personality

**Three words: decisive · credible · navigable.**

- **Voice:** direct, governance-flavored, no fluff. Reads like a well-written internal RFC, not marketing copy. Sample phrasings from the codebase that capture the tone:
  - "Ship enhancements with **evidence**, not opinion."
  - "FX is not an approval layer. It is how meaningful enhancements get planned, released, and measured."
  - "The goal is not 'more tests.' The goal is better release decisions, lower rollout risk, cleaner measurement."
- **Tone modulation:** authoritative in framing, plain-spoken in instruction. Never preachy, never breezy. Avoid "delightful," "easy," "magic," "amazing," and similar marketing tells.
- **Stance toward the reader:** treats them as capable professionals who don't need hand-holding but do need their time respected.

### Aesthetic Direction

**Established brand surface:**
- **Palette:** Default lime `#B1FF33` (primary accent), charcoal `#38353F` (dark surface, body authority), white (canvas), subtle gray `#F7F7F7` (section separation), ink `#212529` (body text), muted `#C3C2C5` (low-emphasis dividers).
- **Type:** Inter (Google Fonts), full weight range available.
- **Existing motifs:** lime accent underline beneath section headers, charcoal hero band with lime CTA, eyebrow labels in lime uppercase tracking-widest, monospaced number badges (`01`–`05`) for ordered lists, lime-edged left-border callouts for decision rules.

**Visual tone:** confident but quiet. Currently reads as "competent internal tool." The intended direction over this overhaul is **intentional and distinctive** — still calm, but with sharper hierarchy, more rhythm, and earned moments of personality. The lime should feel *placed*, never sprinkled.

**References (right feel):**
- Stripe docs — clarity, hierarchy, the way technical authority is conveyed by typography and spacing rather than ornament.
- GOV.UK — the discipline of "every pixel earns its place," generous whitespace, no decorative chrome.
- Linear — the way a dark accent surface and a single hot accent color can carry an entire identity.

**Anti-references (wrong feel):**
- Generic SaaS marketing pages — gradient blobs, abstract illustrations of "collaboration," stock-photo people on laptops.
- Corporate intranet aesthetic — flat clip-art icons, busy multi-color palettes, "newsletter" layouts.
- Over-animated interactives — parallax for parallax's sake, every card lifting on hover, scroll-jacking, confetti.

**Mode:** Light mode only. No dark-mode requirement, but tokens should stay in a state that *could* support it later (no hardcoded hex outside the theme).

**Printability constraint:** the templates page must remain printable to PDF cleanly. The `@media print` rule in `src/app/globals.css` should be respected and extended where needed.

### Design Principles

These five principles guide every design decision on this project. When skills produce options, prefer the one that scores best against this list.

1. **Evidence over decoration.** Every visual element must earn its place by aiding a decision the user is trying to make. If it doesn't move them closer to an answer, cut it. This mirrors the product's own thesis — ship with evidence, not opinion.

2. **Respect the role.** Users come with a specific job from a specific perspective. Defaults, entry points, copy, and density should meet a Product Manager differently than an Engineer. Never force one audience to wade through another's content.

3. **Confident, not loud.** Lime is an accent, never a flood. Charcoal carries authority. Whitespace is a tool, not a gap. The site should feel certain of itself without raising its voice.

4. **Shareable by default.** Assume any view will be screenshotted into Slack, deep-linked in a doc, or printed for a meeting. Deep links must survive refresh. Section anchors should be obvious. Hover-only affordances are suspect — they don't survive a screenshot.

5. **Calm motion.** Animation clarifies state changes (tab swaps, progress, accordions, route transitions) — it does not perform. Respect `prefers-reduced-motion`. If you can't justify a motion in one sentence pointing to the state it conveys, remove it.

### Stack & Constraints (do not violate)

- **Next.js 16 App Router + React 19 + Tailwind v4 + TypeScript** (the multi-tool "Testing & Personalization Hub"). Routes live in `src/app/*`, one folder per route. FX content pages and the Roadmap are `.jsx`; the Intake and Results tools and the typed form primitives are `.tsx` (tsconfig `allowJs`). No other framework swap.
- Tokens live in `tailwind.config.js`, loaded into Tailwind v4 via `@config` in `src/app/globals.css` (preserves the text/fill color split). **Never hardcode hex in components.** See DESIGN.md for the full system.
- No heavy animation libraries unless a skill explicitly justifies the dependency cost. CSS transitions + small handcrafted motion, gated behind `prefers-reduced-motion`.
- No shadcn/ui wholesale — project-native primitives in `src/components/ui/` are the shared vocabulary across every surface (see DESIGN.md).
- FX content lives in `src/data/` — copy edits go there, never inline in page components. (The Intake, Roadmap and Results tools are server-backed by Supabase, Anthropic and Jira, with bundled synthetic snapshots as the no-credentials fallback; their data is dynamic, not in `src/data/` apart from `src/data/snapshot/`.)

### Accessibility Floor

Target **WCAG 2.1 AA** across the site. Known risks to verify in `audit`:
- Lime `#B1FF33` on white has very low contrast — must not be used for text below 18pt/bold without a darker variant (`lime-700` exists in the palette for this).
- Process tabs, Decide quiz inputs, and Templates accordions need proper semantic roles and keyboard support.
- Focus-visible rings must work against both white and charcoal surfaces.
- All motion gated behind `prefers-reduced-motion: no-preference`.

---

## Optimizely Doc Integration Layer

A curated companion layer that stitches Optimizely's official Feature Experimentation documentation into the site without duplicating it.

### Architecture

- **`src/data/optimizelyRefs.js`** — single source of truth for every outbound link. 29 canonical refs covering Core Concepts, Create Flags, Run Flag Rules, Configure, Best Practice, and Reference docs. If a URL changes, edit one file.
- **`src/data/concepts.js`** — 23-term glossary with `oneLineDef`, `summary`, `sourceRef` (into `optimizelyRefs`), `appearsInPhases`, `appearsInRoles`.
- **`src/data/phases.js` / `roles.js` / `templates.js`** — each item has a `docs` / `references` array of `optimizelyRefs` keys (2–6 per item) that surface in a `DocRefPanel`.

### New UI Primitives (`src/components/ui/`)

- **`ExternalLink`** — every outbound link. `target="_blank"`, `rel="noreferrer noopener"`, 11px inline icon, sr-only "(opens in a new tab)", `currentColor` underline that adapts to light/dark surfaces.
- **`DocRefPanel`** — reusable "Optimizely docs for this {phase/role/template}" block. Composes `Card` + `Eyebrow` + `ExternalLink`. Kind dots (lime / charcoal / muted) communicate Concept / How-to / Reference at a glance.
- **`GlossaryTerm`** — inline tooltip popover anchored to a `<button>` trigger. Hover-on-pointer + focus-on-keyboard + tap-on-touch. Viewport-aware: flips to `top` placement when bottom space < 220px. Tap zone widened via invisible pseudo-element (`before:-inset-y-2`).
- **`Attribution`** — small "Concept summaries adapted from docs.developers.optimizely.com" line with trademark notice. Used at the top and bottom of `/concepts`.
- **`ConceptCard`** — one glossary entry. Term at `text-h2`, one-line def at `text-body-sm` muted, full summary at `text-body` ink, primary "Read on Optimizely docs" link with lime left-bar, and clickable "Appears in" pills that navigate back to `/process/<id>` or `/roles/<id>`.

### New Routes & Surfaces

- **`/concepts`** — full glossary page. Dark hero + count strip (`23 TERMS · 1 SOURCE`) + Attribution + filter input (with `/` keyboard shortcut + kbd hint visible on `md+`) + 3-column ConceptCard grid + live region for screen-reader filter announcements + "Clear filter" empty-state button. Deep links via `/concepts#<id>` with a single-pass lime pulse on the target card.
- **Home page** — "Concepts & vocabulary" promoted out of the role list into a distinct `bg-subtle` callout block with `✶` mark, `REFERENCE LAYER` eyebrow, and dark-on-hover treatment. Reads as a different surface, not a sixth role.
- **Process / Roles / Templates detail views** — each renders a `DocRefPanel` near the bottom of its phase/role/template content.

### Motion Primitives (`src/app/globals.css`)

All gated behind `motion-safe:` (reduced-motion users see static state):

- **`.animate-tooltip-in`** — 160ms fade + 4px translateY-from-top entrance on `GlossaryTerm` popover.
- **`.animate-deep-link-pulse`** — 1.4s single-iteration `box-shadow` pulse when a `ConceptCard` is rendered with `highlighted={true}` (i.e. arriving via `/concepts#bucketing`). Single-shot only — does not loop.
- **`ExternalLink` icon hover** — `transform: translate(0.5px, -1px)` on `group-hover`, signaling off-site direction.

### Constraints Worth Knowing

- Optimizely is migrating some "how-to" pages from `docs.developers.optimizely.com` to `support.optimizely.com`. A few URLs in `optimizelyRefs.js` currently 301-redirect; browsers follow transparently, but a future link-rot sweep should point them directly at the support article ID.
- `GlossaryTerm` is JSX-only — it wraps inline text in JSX-authored copy (e.g. PageHeader intro on Process). Data-authored strings in `src/data/` do NOT get auto-wrapped. This is intentional: string scanning is brittle and would create misfires.
- The glossary has no fuzzy-search dependency. Filter is a plain `.toLowerCase().includes()` across term + oneLineDef + summary. Fine at 23 entries; revisit if the glossary doubles.
