# Design System

A portable spec for replicating this site's look in another app. Stack-agnostic:
every token is given as a raw value first. A Tailwind appendix is at the end for
teams on the same stack. Hand this whole file to a coding tool to match the design.

---

## 1. Brand essence

Modern B2B-SaaS, confident but calm. The signature is **electric lime
(`#B1FF33`) on near-black charcoal (`#38353F`)**, set in **Inter**. White is the
default canvas; charcoal anchors the nav, footer, hero sections, and CTA strips;
lime is the single accent — used sparingly for emphasis, active state, CTAs, and
underlines, never as a fill for large areas.

The feel is **airy and orderly**: generous vertical rhythm, soft barely-there
shadows, small radii, no gradients, no glassmorphism. Motion is **restrained** —
short cubic-deceleration fades only, no bounce/elastic/spring. Accessibility is
first-class: every text color is contrast-verified, focus rings are always
visible, all motion respects `prefers-reduced-motion`.

Five rules that carry the look:
1. One accent. Lime does the pointing; everything else is charcoal/grey/white.
2. Dark sections punctuate light ones (hero, nav, footer, CTA = charcoal).
3. Soft, low shadows + small radii. Nothing is glossy or heavily rounded.
4. Type hierarchy is by weight and size, not color. Bold = important.
5. Motion is a quiet assist (fade/slide ≤ 0.5s), never decoration.

---

## 2. Color

```css
:root {
  /* Brand — lime ramp */
  --lime-50:  #F4FFE0;
  --lime-100: #E8FFC1;
  --lime-200: #D6FF94;
  --lime-300: #C3FF67;
  --lime-400: #B1FF33;   /* = lime DEFAULT, the brand color */
  --lime-500: #9EE821;   /* primary button hover */
  --lime-600: #7FBF1A;
  --lime-700: #5F9114;
  --lime-800: #3F620D;   /* accent text on light (AAA) */
  --lime-900: #1F3107;
  --lime:     #B1FF33;

  /* Foundation — charcoal family */
  --charcoal:        #38353F;   /* primary dark surface */
  --charcoal-alt:    #35323D;   /* hover on dark surfaces */
  --charcoal-deeper: #2A2832;
  --charcoal-light:  #4A4753;

  /* Neutrals */
  --ink:     #212529;   /* default body text on light */
  --muted:   #C3C2C5;   /* hairline borders, decorative */
  --surface: #FFFFFF;   /* card / page background */
  --subtle:  #F7F7F7;   /* faint grey fill (callouts, mono badges) */

  /* Semantic TEXT colors — pre-verified for WCAG contrast.
     Use these for text; do NOT tint --ink with opacity. */
  --text-body:           #212529;  /* on white — 15.43:1 AAA */
  --text-muted:          #595C5F;  /* on white —  6.73:1 AA  */
  --text-subtle:         #6F7174;  /* on white —  4.89:1 AA  */
  --text-disabled:       #A6A8A9;  /* 2.39:1 — NON-text only, pair w/ another cue */
  --text-on-dark:        #FFFFFF;  /* on charcoal — 12.01:1 AAA */
  --text-on-dark-muted:  #D7D7D9;  /* on charcoal —  8.35:1 AA  */
  --text-on-dark-subtle: #B9B8BC;  /* on charcoal —  6.09:1 AA  */
  --text-accent:         #3F620D;  /* lime-800 on white —  7.08:1 AAA */
  --text-accent-on-dark: #B1FF33;  /* lime on charcoal —   9.85:1 AAA */
}
```

| Token | Hex | Use |
|---|---|---|
| `lime` / `lime-400` | `#B1FF33` | The brand accent. Primary button bg, active nav, badges, underline, focus ring, lime-tint borders. |
| `lime-500` | `#9EE821` | Primary button **hover** only. |
| `lime-800` | `#3F620D` | Accent/eyebrow text on **light** backgrounds (lime itself fails contrast as text). |
| `charcoal` | `#38353F` | Nav, footer, hero, CTA strips, dark cards, secondary-button fill on hover. |
| `charcoal-alt` | `#35323D` | Hover background for items on charcoal surfaces. |
| `ink` | `#212529` | Body text on white. |
| `muted` | `#C3C2C5` | Borders (usually at 30–40% opacity), dividers, disabled decoration. |
| `subtle` | `#F7F7F7` | Quiet fill: callouts, mono badges, ghost-button hover. |
| `surface` / white | `#FFFFFF` | Default page + card background. |

**Contrast rule:** for text, always pick from the `--text-*` set, matched to the
surface. Never set body text as `lime` on white (fails AA) — use `--text-accent`
(`#3F620D`). On charcoal, lime text is fine (`--text-accent-on-dark`).

**Opacity-tint conventions** (the only place raw colors get alpha):
- `lime @ 10%` → highlighted/callout background fill on light.
- `lime @ 40%` → soft accent borders (e.g. card hover border, dark secondary btn).
- `muted @ 30–40%` → default hairline borders on light.
- `white @ 85–90%` → primary text on charcoal when not pure white.
- `white @ 20%` → ghost-button border on dark.

No gradients anywhere. No dark-mode variant — "dark" is achieved per-section by
placing content on a charcoal surface, not by a global theme toggle.

---

## 3. Typography

**Typeface:** Inter (with system fallbacks). Load weights 400, 500, 600, 700, 800.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             Oxygen, Ubuntu, sans-serif;
```

Body defaults: background `#FFFFFF`, color `#212529`,
`-webkit-font-smoothing: antialiased`, `scroll-behavior: smooth`.

### Type scale (named, semantic)

Each style is **size / line-height / letter-spacing / weight**. Use the name for
intent — don't pick raw px ad hoc.

| Name | Size | Line-height | Letter-spacing | Weight | Use |
|---|---|---|---|---|---|
| `display` | `clamp(2.25rem, 4vw + 1rem, 3.75rem)` (36→60px, fluid) | 1.05 | −0.02em | 700 | Home hero headline only |
| `h1` | 1.875rem (30px) | 1.1 | −0.015em | 700 | Page title |
| `h1-lg` | 2.5rem (40px) | 1.1 | −0.015em | 700 | Large page title |
| `h2` | 1.5rem (24px) | 1.2 | −0.01em | 700 | Section heading |
| `h2-lg` | 1.875rem (30px) | 1.2 | −0.01em | 700 | Large section heading |
| `h3` | 1.25rem (20px) | 1.3 | — | 700 | Sub-section |
| `h4` | 1rem (16px) | 1.4 | — | 700 | Card / object title |
| `body-lg` | 1.125rem (18px) | 1.6 | — | 400 | Lead / intro paragraph |
| `body` | 1rem (16px) | 1.6 | — | 400 | Default body |
| `body-sm` | 0.875rem (14px) | 1.55 | — | 400 | Compact body, nav links |
| `caption` | 0.75rem (12px) | 1.4 | — | 400 | Supporting / meta text |
| `eyebrow` | 0.75rem (12px) | 1 | **0.18em** | 700 | Uppercase kicker label |

**Eyebrow rule:** always `text-transform: uppercase`, tracking `0.18em`, weight
700, 12px. Color it with `--text-accent` on light, `--text-accent-on-dark` on
charcoal, or `--muted` for a quiet variant. This is the canonical small label —
don't invent other uppercase styles.

Hierarchy is conveyed by **size + weight** (700 for all headings, 400 for body),
not by color. Keep headings `--ink` / `--text-on-dark`.

---

## 4. Spacing & layout

- **Container:** `max-width: 1280px` (Tailwind `7xl`), centered (`margin-inline:
  auto`), horizontal gutter `1.5rem` (24px, `px-6`) at all breakpoints. Every
  top-level section uses this same container.
- **App shell:** `min-height: 100vh; display: flex; flex-direction: column;`
  background white, text ink. Sticky nav on top, `flex: 1` main, footer at bottom.
- **Section vertical rhythm** (the breathing room that defines the airy feel):
  | Context | Padding-y |
  |---|---|
  | Nav bar | 1rem (`py-4`) |
  | Standard content section | 4rem → 5rem (`py-16 md:py-20`) |
  | Hero / page header | 5rem → 7rem (`py-20 md:py-28`) |
  | CTA strip | 3.5rem (`py-14`) |
  | Inside sections | `mt-12`, gaps `gap-5` / `gap-10 md:gap-16` |
- **Card padding scale:** sm `1.25rem` (20px), md `1.5rem` (24px),
  lg `1.75rem → 2.5rem` (`p-7 md:p-10`).
- **Spacing unit:** 4px base scale (0.25rem steps) — standard 4/8/12/16/20/24…px.
- **Grid patterns:** content grids go `1 → 2 → 3` cols
  (`grid md:grid-cols-2 lg:grid-cols-3 gap-5`); dense index grids up to
  `2 → 4 → 8` cols with `gap-2`.
- **Breakpoints:** `sm 640px`, `md 768px`, `lg 1024px` (mobile-first). `md` is
  the primary desktop switch (nav collapses below it).
- **Z-index scale:** nav `30`, dropdown/popover `40`, modal/overlay `50`.

---

## 5. Radius & elevation

**Corner radius** (small and soft — nothing pill-shaped except the underline cap):
- `4px` — buttons (sm/md), badges, small controls.
- `6px` — cards, large buttons, tabs, inputs (the default "rounded-md").
- `8px` — large containers ("rounded-lg").

**Shadows** (the only two; deliberately faint):
```css
--shadow-card:       0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-card-hover: 0 8px 24px rgba(56, 53, 63, 0.12);
```
Resting cards use `--shadow-card`. Hoverable cards transition to
`--shadow-card-hover` (note the charcoal-tinted shadow color, not pure black).
No other elevation levels — don't add glow, inset, or stacked shadows.

**Focus ring** (consistent on every interactive element — keep it, it's load-bearing
for accessibility):
```css
outline: none;
box-shadow: 0 0 0 2px #B1FF33;            /* 2px lime ring */
/* with a 2px offset gap to the element:  ring-offset-2 */
```
On charcoal surfaces, the offset gap should match the surface (`#38353F`) so the
lime ring reads cleanly: ring `#B1FF33`, offset color `#38353F`.

---

## 6. Motion

Philosophy (from the source, verbatim intent): **"cubic deceleration curves
only. No bounce, no elastic, no spring."** Motion is a quiet assist, short and
calm.

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
```

Durations live in **0.16s – 0.5s**. Default UI transition (hover/state) ≈ 150ms
`ease`. Use `--ease-out-quart` for entrances.

**All keyframe animation is gated behind
`@media (prefers-reduced-motion: no-preference)`**, and a global
`prefers-reduced-motion: reduce` block forces every animation/transition to
`0.01ms` and disables smooth scroll. Replicate both — animations opt-in, reduced
motion fully honored.

```css
@media (prefers-reduced-motion: no-preference) {
  /* Entrance: fade + 12px rise */
  @keyframes fade-up   { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fade-in   { from { opacity:0 } to { opacity:1 } }
  /* Tooltip: 4px slide-down */
  @keyframes tooltip-in{ from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
  /* Attention ring (calm, single or slow loop) */
  @keyframes deep-link-pulse {
    0%   { box-shadow: 0 0 0 0   rgba(177,255,51,0.7) }
    60%  { box-shadow: 0 0 0 10px rgba(177,255,51,0)  }
    100% { box-shadow: 0 0 0 0   rgba(177,255,51,0)   }
  }
  @keyframes ready-pulse {
    0%,100% { box-shadow: 0 0 0 0   rgba(177,255,51,0.55) }
    50%     { box-shadow: 0 0 0 10px rgba(177,255,51,0)   }
  }

  .animate-fade-up        { animation: fade-up 0.35s var(--ease-out-quart) both; }
  .animate-fade-in        { animation: fade-in 0.22s var(--ease-out-quart) both; }
  .animate-tooltip-in     { animation: tooltip-in 0.16s var(--ease-out-quart) both; }
  .animate-deep-link-pulse{ animation: deep-link-pulse 1.4s var(--ease-out-quart) 1 both; }
  .ready-pulse            { animation: ready-pulse 2.6s ease-in-out infinite; }

  /* Staggered page-header entrance: children fade-up at 0 / 80 / 160ms */
  .animate-page-enter > *               { animation: fade-up 0.5s var(--ease-out-quart) both; }
  .animate-page-enter > *:nth-child(1)  { animation-delay: 0ms;   }
  .animate-page-enter > *:nth-child(2)  { animation-delay: 80ms;  }
  .animate-page-enter > *:nth-child(3)  { animation-delay: 160ms; }
}

/* Accordion to height:auto via the grid-rows trick */
.accordion       { display:grid; grid-template-rows:0fr; transition: grid-template-rows 0.25s var(--ease-out-quart); }
.accordion.is-open { grid-template-rows:1fr; }
.accordion > .accordion-inner { overflow:hidden; }

@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Patterns: page headers stagger-fade their eyebrow→title→intro; revealed panels
`fade-up`; tooltips `tooltip-in`; a freshly deep-linked card gets ONE slow
`deep-link-pulse`; a "ready" CTA gets a slow infinite `ready-pulse`. Hover
state changes are simple ~150ms color/shadow transitions.

---

## 7. Component recipes

Stack-neutral specs. "Resting → hover" describes the state change; all
interactive elements also get the §5 focus ring.

### Button
Base: `inline-flex; align-items:center; justify-content:center; gap:0.5rem;
font-weight:600; transition: ~150ms;` disabled → `opacity:0.30; cursor:not-allowed`.

Sizes:
| Size | Padding | Font | Radius |
|---|---|---|---|
| sm | 1rem × 0.625rem (`px-4 py-2.5`) | 14px | 4px |
| md | 1.25rem × 0.625rem (`px-5 py-2.5`) | 14px | 4px |
| lg | 1.5rem × 0.75rem (`px-6 py-3`) | 16px | 6px |
| xl | 2rem × 1rem (`px-8 py-4`) | 16px | 6px |

Variants:
| Variant | Resting | Hover |
|---|---|---|
| primary | bg `#B1FF33`, text `#38353F`, `--shadow-card` | bg `#9EE821` |
| secondary | transparent, `2px` border `#38353F`, text `#38353F` | bg `#38353F`, text `#FFF` |
| secondary-dark | transparent, `1px` border `lime@40%`, text `#FFF` | bg `#35323D` |
| ghost | transparent, `1px` border `--muted`, text `#38353F` | bg `#F7F7F7` |
| ghost-dark | transparent, `1px` border `white@20%`, text `white@90%` | bg `#35323D` |

### Card
Base: chosen radius (6px default), padding from §4 scale.
| Variant | Style |
|---|---|
| default | bg white, `1px` border `muted@30%`, `--shadow-card`, text ink |
| dark | bg `#38353F`, text white |
| subtle | bg `#F7F7F7`, `1px` border `muted@30%`, text ink |
| bare | bg white, text ink, no border/shadow |

Hoverable (opt-in): default → `--shadow-card-hover` + border becomes `lime@40%`;
dark → bg `#35323D`. Transition ~150ms. No translate/scale on hover.

### Badge / pill
Base: `inline-flex; align-items:center; gap:0.25rem; border-radius:4px`.
Sizes: sm `10px / px-2 py-0.5`, md `12px / px-2.5 py-1`.
| Variant | Style |
|---|---|
| primary | bg `#B1FF33`, text `#38353F`, **bold uppercase, tracking 0.18em** |
| outline | bg white, text `#38353F`, `1px` border `#38353F`, bold uppercase 0.18em |
| neutral | bg `muted@40%`, text ink, `1px` border `--muted`, bold uppercase 0.18em |
| mono | bg `#F7F7F7`, text muted, `1px` border `muted@30%`, **monospace, normal tracking** |

### Tabs
| Variant | Base | Active | Inactive |
|---|---|---|---|
| pill | `px-5 py-3` radius 6, `2px` border, weight 600, 14px | bg `#38353F`, text `#B1FF33`, border `#38353F` | bg white, text `#38353F`, border `muted@40%`, hover border → lime |
| card | `p-3` radius 6, `1px` border | border `#B1FF33`, bg `#38353F`, text white, `--shadow-card` | border `muted@30%`, bg white, hover border `lime@50%` |
| card-lg | `p-4` radius 6, `2px` border | (same as card) | (same as card) |
| vertical | full-width `p-4` radius 6, `2px` border | border `#B1FF33`, bg `lime@10%` | border `muted@30%`, bg white, hover border `lime@40%` |

### Eyebrow
The `eyebrow` type style (§3): 12px, uppercase, tracking 0.18em, weight 700.
Tones: light → `#3F620D`, dark → `#B1FF33`, muted → `#C3C2C5`.

### Callout
| Variant | Style |
|---|---|
| lime-tint | bg `lime@10%`, **left border 4px `#B1FF33`**, right corners rounded, padding 1rem |
| subtle | bg `#F7F7F7`, left border 4px `#B1FF33`, right corners rounded, padding 1.25rem |
| plain | bg `#F7F7F7`, radius 6px, padding 1rem |

The 4px-left-lime-border is a signature — reuse it for quotes, notes, inline alerts.

### Nav (sticky header)
Sticky top, bg `#38353F`, bottom border `1px #35323D`, `z-index:30`. Inner =
the §4 container with `py-4`. Logo lockup left (generic SVG mark on `#35323D` chip +
product name). Desktop links right, collapse below `md` to a hamburger.
Link: `px-4 py-2`, 14px, weight 500, radius 6px, transition.
- inactive: text `white@85%`; hover → text `#B1FF33`, bg `#35323D`.
- active: bg `#B1FF33`, text `#38353F`.
- focus ring offset color = `#38353F`.
Mobile menu (open): top border `#35323D`, `px-4 py-3`, vertical stack `gap-1`.

### Icons
Inline SVG only — no icon font/library. `viewBox="0 0 24 24"`, `fill="none"`,
`stroke="currentColor"`, `stroke-width="2"`, round line caps/joins, always
`aria-hidden="true"` (adjacent text carries meaning). Render sizes ≈ 11, 14, 20,
24px. They inherit color from text.

---

## 8. Signature motifs (the things that make it *look like this*)

1. **Lime accent-underline under page titles** — a placed flag, not a hint:
   ```css
   .accent-underline::after{
     content:''; display:block; width:72px; height:6px;
     background:#B1FF33; margin-top:14px; border-radius:3px;
   }
   ```
2. **4px lime left-border** on callouts/quotes/notes (right corners rounded).
3. **Charcoal sections punctuating white** — nav, footer, hero, CTA are all
   `#38353F`; this rhythm of dark↔light blocks is core to the identity.
4. **Subtle hover lift** — cards go from faint `--shadow-card` to a slightly
   larger charcoal-tinted `--shadow-card-hover` + lime-tint border. No movement.
5. **Lime-tinted highlight box** — `lime@10%` background for emphasis blocks,
   keeping the accent present without a solid lime fill.
6. **Single-accent discipline** — if you're reaching for a second accent color,
   stop; use weight, size, or a charcoal/grey instead.
7. **Quiet attention pulses** — ring expansion in `rgba(177,255,51,…)` to land
   the eye (deep-linked card, ready CTA), slow and low-opacity.

---

## 9. Appendix — Tailwind reference (same-stack teams)

Source stack: React 18 + Vite + Tailwind 3.4 (no UI library). Drop this into
`tailwind.config.js` → `theme.extend`:

```js
colors: {
  lime: { DEFAULT:'#B1FF33', 50:'#F4FFE0',100:'#E8FFC1',200:'#D6FF94',
          300:'#C3FF67',400:'#B1FF33',500:'#9EE821',600:'#7FBF1A',
          700:'#5F9114',800:'#3F620D',900:'#1F3107' },
  charcoal: { DEFAULT:'#38353F', alt:'#35323D', deeper:'#2A2832', light:'#4A4753' },
  ink:'#212529', muted:'#C3C2C5', surface:'#FFFFFF', subtle:'#F7F7F7',
},
fontFamily: {
  sans:['Inter','-apple-system','BlinkMacSystemFont','Segoe UI','Roboto','Oxygen','Ubuntu','sans-serif'],
  display:['Inter','-apple-system','BlinkMacSystemFont','sans-serif'],
},
boxShadow: {
  card:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  cardHover:'0 8px 24px rgba(56, 53, 63, 0.12)',
},
letterSpacing: { eyebrow:'0.18em' },
zIndex: { nav:'30', dropdown:'40', modal:'50' },
fontSize: {
  display:['clamp(2.25rem, 4vw + 1rem, 3.75rem)',{lineHeight:'1.05',letterSpacing:'-0.02em',fontWeight:'700'}],
  h1:['1.875rem',{lineHeight:'1.1',letterSpacing:'-0.015em',fontWeight:'700'}],
  'h1-lg':['2.5rem',{lineHeight:'1.1',letterSpacing:'-0.015em',fontWeight:'700'}],
  h2:['1.5rem',{lineHeight:'1.2',letterSpacing:'-0.01em',fontWeight:'700'}],
  'h2-lg':['1.875rem',{lineHeight:'1.2',letterSpacing:'-0.01em',fontWeight:'700'}],
  h3:['1.25rem',{lineHeight:'1.3',fontWeight:'700'}],
  h4:['1rem',{lineHeight:'1.4',fontWeight:'700'}],
  'body-lg':['1.125rem',{lineHeight:'1.6',fontWeight:'400'}],
  body:['1rem',{lineHeight:'1.6',fontWeight:'400'}],
  'body-sm':['0.875rem',{lineHeight:'1.55',fontWeight:'400'}],
  caption:['0.75rem',{lineHeight:'1.4',fontWeight:'400'}],
  eyebrow:['0.75rem',{lineHeight:'1',letterSpacing:'0.18em',fontWeight:'700'}],
},
textColor: {
  body:'#212529', muted:'#595C5F', subtle:'#6F7174', disabled:'#A6A8A9',
  'on-dark':'#FFFFFF', 'on-dark-muted':'#D7D7D9', 'on-dark-subtle':'#B9B8BC',
  accent:'#3F620D', 'accent-on-dark':'#B1FF33',
},
```

Then add the `:root` custom properties, easing tokens, keyframes, and the
`.accent-underline` / `.animate-*` / `.accordion` / reduced-motion utilities
from §2 and §6 to your global stylesheet.

> Note: `textColor.muted` (`#595C5F`, the AA-safe *text* grey) intentionally
> differs from the `muted` palette color (`#C3C2C5`, used for borders). Keep both.
