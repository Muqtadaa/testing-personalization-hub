# DESIGN.md — Testing & Personalization Hub

The system every surface shares: the FX Explorer, the Backlog, and the Intake & Brief Builder. Read this with [PRODUCT.md](PRODUCT.md) (brand, voice, users, principles). **Register: product** — earned familiarity, one consistent component vocabulary across screens. The rule of thumb: *if the same control looks different on two surfaces, one of them is wrong.*

Tokens live in `tailwind.config.js` (loaded into Tailwind v4 via `@config` in `src/app/globals.css`). **Never hardcode hex in components** — use the tokens below.

---

## Color

Restrained palette: charcoal carries authority, lime is the single accent (placed, never sprinkled), neutrals tint slightly warm, and one functional **critical** role for negative states. Light mode only.

| Token | Hex | OKLCH (approx) | Use |
| --- | --- | --- | --- |
| `lime` (DEFAULT / 400) | `#B1FF33` | `oklch(0.93 0.22 128)` | The accent: primary actions, current selection, "positive/feasible" state, accent-underline, eyebrows on dark. Ramp `lime-50…900` exists; `lime-500` = hover, `lime-800` = `accent` text. |
| `charcoal` | `#38353F` | `oklch(0.32 0.01 305)` | Dark surfaces: nav, footer, `PageHeader` hero, primary text headings. `-alt`/`-deeper`/`-light` for layering. |
| `ink` | `#212529` | `oklch(0.27 0.01 286)` | Body text on light (= `text-body`). |
| `muted` | `#C3C2C5` | `oklch(0.81 0.003 300)` | Hairlines and fills only (`border-muted`, `bg-muted`). NOT for text. |
| `subtle` | `#F7F7F7` | `oklch(0.98 0 0)` | Quiet section fills (`bg-subtle`). |
| `surface` | `#FFFFFF` | — | Canvas. Prefer `bg-white`. |
| `critical` | `#B4453A` | `oklch(0.55 0.15 29)` | Solid negative marks (chart bars, strong indicators). 4.55:1 on white. |
| `critical-tint` | `#F7E8E6` | `oklch(0.95 0.015 25)` | Error/alert background. |
| `critical-border` | `#E3B5AF` | `oklch(0.82 0.04 28)` | Hairline on the tint. |
| `critical-text` | `#7A241B` | `oklch(0.40 0.13 30)` | Error text (≥6.9:1 on tint, 8.1:1 on white). |

**The text/fill split (important).** Text grays and fill/hairline grays are intentionally different values and live in different Tailwind scales:

| Semantic | Text utility (`textColor`) | Fill / border utility (`colors`) |
| --- | --- | --- |
| body | `text-body` → `#212529` | — |
| muted | `text-muted` → `#595C5F` (readable) | `bg-muted` / `border-muted` → `#C3C2C5` (hairline) |
| subtle | `text-subtle` → `#6F7174` (readable) | `bg-subtle` → `#F7F7F7` (fill) |

On dark surfaces: `text-on-dark` / `text-on-dark-muted` / `text-on-dark-subtle`, and `text-accent-on-dark` (lime). On light, accent text is `text-accent` (`#3F620D`, AAA) — never raw `text-lime` for text (fails AA).

**Error/negative state pattern:** `border border-critical-border bg-critical-tint text-critical-text` (full border, no side-stripe). "Positive/feasible" = lime; "neutral/slow" = charcoal/muted.

---

## Typography

Inter (via `next/font/google`, `--font-inter`). Fixed rem scale, not fluid. **Always use the semantic scale, not raw `text-sm`/`text-2xl`.**

| Token | Size / line-height / weight | Use |
| --- | --- | --- |
| `text-display` | clamp 36→60px / 1.05 / 700 | Marketing hero only (hub landing, FX overview). The one fluid step. |
| `text-h1` / `-lg` | 30 / 40px · 1.1 · 700 | Page titles (`PageHeader`). |
| `text-h2` / `-lg` | 24 / 30px · 1.2 · 700 | Section headings (`SectionHeader`). |
| `text-h3` | 20px · 1.3 · 700 | Sub-sections. |
| `text-h4` | 16px · 1.4 · 700 | Card / object titles. |
| `text-body-lg` | 18px · 1.6 | Lead / intro paragraphs. |
| `text-body` | 16px · 1.6 | Default body. |
| `text-body-sm` | 14px · 1.55 | Compact body, form controls, table cells, chat. |
| `text-caption` | 12px · 1.4 | Meta, helper text, field labels. |
| `text-eyebrow` | 12px · 1 · 700 · `tracking-eyebrow` (0.18em) | Uppercase kicker (use the `<Eyebrow>` component). |

Decorative numerals (the `01–05` markers, large stat numbers) are intentionally raw sizes — they are display figures, not document hierarchy. Code/JSON blocks use `font-mono text-xs`.

---

## Components — the shared vocabulary

All in `src/components/ui/` (barrel `index.js`). Prefer these over inline markup. They work in both `.jsx` and `.tsx`; the form primitives are typed `.tsx`.

| Component | Variants / props | Use |
| --- | --- | --- |
| `PageHeader` | `dark`, `eyebrow`, `title`, `intro` | Top of every tool page. `dark` = charcoal hero with lime accent-underline (the hub standard). |
| `SectionHeader` | `size` h2/h3/h4, `tone`, `eyebrow`, `intro`, `underline`, `align` | In-page section headings. |
| `Eyebrow` | `tone` light/dark/muted, `as` | Uppercase kicker label. Use this, not the `.eyebrow` class or inline `text-eyebrow`. |
| `Button` | `variant` primary/secondary/secondary-dark/ghost/ghost-dark, `size` sm/md/lg/xl, `as` | All buttons and button-styled links (`as="a"`). primary = lime; secondary = charcoal outline. |
| `Card` | `variant` default/dark/subtle/bare, `padding` none/sm/md/lg, `radius` md/lg, `hoverable` | Surfaces. Default = `bg-white border-muted/30 shadow-card rounded-lg`. Never nest cards. |
| `Badge` | `variant` primary/outline/neutral/mono, `size` sm/md | Short status/label chips. |
| `Callout` | `variant` lime-tint/subtle/plain, `eyebrow`, `title` | Decision rules, phase outputs, assumptions. The lime left-edge is an intentional brand motif (see PRODUCT.md). |
| `Input` / `Select` / `Textarea` | `error`, all native attrs (typed) | The form-control vocabulary: `rounded-md border-muted/40 text-body-sm`, lime focus ring, `error` → critical border. |
| `Field` | `label`, `htmlFor`, `helper`, `error`, `required` | Label + control + helper/error wrapper. Pair with the controls above. |
| `Tabs` / `Tab` | `variant` pill/card/card-lg/vertical | Tabbed navigation with full keyboard support. |
| `ExternalLink`, `DocRefPanel`, `GlossaryTerm`, `ConceptCard`, `Attribution` | — | FX doc-integration primitives. |

Every interactive control ships default / hover / focus / disabled (+ error where relevant). Don't hand-roll a button, input, or eyebrow when a primitive exists.

---

## Conventions

- **Focus:** `focus-visible:ring-2 ring-lime ring-offset-2` (primitives bake this in; the `.focus-ring` class is the equivalent for bespoke elements). Load-bearing for a11y — never remove.
- **Cards:** one border weight (`border-muted/30`), `shadow-card`, `rounded-lg`. `shadow-cardHover` + `border-lime/40` on hover only when interactive.
- **Eyebrow:** the `<Eyebrow>` component is canonical. Inline `text-eyebrow uppercase tracking-eyebrow` is acceptable only inside dense bespoke layouts.
- **Spacing rhythm:** page sections `py-12` (tool content) to `py-16/20` (landing). Vary deliberately; avoid uniform padding everywhere.
- **No hardcoded hex in components.** No side-stripe borders except the documented lime `Callout` motif. No gradient text. Cards are not the default wrapper — use them when they're the right affordance.

## Motion

Tokens + keyframes in `globals.css`, all gated behind `@media (prefers-reduced-motion: no-preference)`. Easing is cubic deceleration only (`--ease-out-quart` / `--ease-out-quint`) — no bounce/elastic. 150–250ms for state transitions. `animate-fade-up` / `animate-fade-in` for reveals, `animate-page-enter` (staggered) for `PageHeader`, `ready-pulse` / `deep-link-pulse` / `tooltip-in` for specific affordances, `typing-dot` / `spinner` for the Intake chat. Motion conveys state, never decorates.

## Accessibility (WCAG 2.1 AA floor)

- Text colors above are contrast-verified; `text-muted`/`text-subtle` are the readable grays (not `muted`/`subtle` fills). `text-accent` for lime-as-text, never `text-lime`.
- Visible focus on every interactive element, on both light and charcoal surfaces.
- `prefers-reduced-motion: reduce` zeroes animations/transitions globally.
- Templates print cleanly via the `@media print` block.

## Token mechanism note

This project loads tokens via Tailwind v4's `@config` directive pointing at the v3-style `tailwind.config.js` — deliberately, because the text/fill color split can't be expressed with v4's single `@theme` color namespace. The Intake tool originally used v4 `@theme` with `tbody/tmuted/tsubtle` names; it has been normalized onto this system and those aliases removed.
