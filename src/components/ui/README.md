# UI Primitives

Project-native primitives for the Testing & Personalization Hub. All components consume tokens from `tailwind.config.js` — never hardcode hex values, never inline tracking like `tracking-[0.18em]`, use these instead.

```js
import { Eyebrow, Button, Card, Badge, Callout, SectionHeader, PageHeader, Tabs, Tab } from '../components/ui';
```

## Decision rules

- **Need a small uppercase label above a heading?** → `Eyebrow`.
- **Need a CTA, link-button, or form-submit?** → `Button`.
- **Need a content container with a border / shadow / dark surface?** → `Card`.
- **Need a small inline tag, score, status, or filename pill?** → `Badge`.
- **Need a highlighted block of supporting info (rule, output, metadata)?** → `Callout`.
- **Need a section title with eyebrow + heading + intro?** → `SectionHeader` (in-page). `PageHeader` only for the page-level hero.
- **Need a row of selectable tabs that switch content?** → `Tabs` + `Tab`. Gets ARIA + keyboard navigation for free.

## Components

### `<Eyebrow>`

Small uppercase label. Used above every section heading.

```jsx
<Eyebrow>Operating principle</Eyebrow>            {/* tone="light" — lime-700 on white */}
<Eyebrow tone="dark">For your role</Eyebrow>      {/* lime on charcoal */}
<Eyebrow tone="muted">Goal</Eyebrow>              {/* ink/60 for low-emphasis label */}
```

### `<Button variant size as>`

Variants: `primary` (lime fill, default), `secondary` (charcoal outline on light), `secondary-dark` (lime outline on dark), `ghost` (muted outline on light), `ghost-dark` (white/20 outline on dark).
Sizes: `sm`, `md` (default), `lg`, `xl`.

```jsx
<Button>Submit</Button>
<Button variant="primary" size="lg" as={Link} to="/decide">Run the quiz →</Button>
<Button variant="secondary-dark" size="lg" as={Link} to="/process">Walk the process</Button>
<Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
```

Renders as a `<button>` by default; pass `as={Link}` (or any component) to render a different element while keeping the styling. Always uses `type="button"` for `<button>` unless overridden — prevents accidental form submission.

### `<Card variant padding radius hoverable as>`

Variants: `default` (white bordered + shadow), `dark` (charcoal + white text), `subtle` (gray surface), `bare` (white, no border).
Padding: `none`, `sm` (p-5), `md` (p-6, default), `lg` (p-7 md:p-10).
Radius: `md`, `lg` (default).
`hoverable` adds the appropriate hover treatment for the variant.

```jsx
<Card hoverable>{...}</Card>
<Card variant="dark" hoverable as={Link} to="/roles/product">{...}</Card>
<Card variant="subtle" padding="sm">{...}</Card>
```

### `<Badge variant size>`

Variants: `primary` (lime), `outline` (white + charcoal border), `neutral` (muted), `mono` (filename / code-style).

```jsx
<Badge>FX</Badge>
<Badge variant="outline">Web Exp</Badge>
<Badge variant="mono" size="sm">intake-questionnaire.md</Badge>
```

### `<Callout variant eyebrow title>`

Variants: `subtle` (gray + lime left border, used for rules / decision boxes), `lime-tint` (lime/10 background + lime left border, used for "phase output" or success-style callouts), `plain` (subtle background, no border).

```jsx
<Callout variant="subtle" eyebrow="Simple decision rule" title="Use FX when…">
  <p>The enhancement is important enough that we would want to know whether it worked.</p>
</Callout>

<Callout variant="lime-tint" eyebrow="Phase output">
  <p>{phase.output}</p>
</Callout>
```

### `<SectionHeader eyebrow title intro size tone underline>`

In-page section header (NOT the page hero — use `PageHeader` for that).
Sizes: `h2` (default, 2xl→3xl), `h3` (2xl), `h4` (xl→2xl).
Tone: `light` (default, charcoal title) or `dark` (white title for use on charcoal surface).
`underline` adds the `.accent-underline` lime bar below the heading.

```jsx
<SectionHeader
  eyebrow="Why we use FX"
  title="Five reasons to put an enhancement through FX"
  underline
/>

<SectionHeader
  eyebrow="For your role"
  title="Start where you fit"
  intro="Each stakeholder owns a different part of the workflow."
  underline
/>
```

### `<PageHeader eyebrow title intro dark>`

Page-level hero header. Used at the top of routed pages (Decide, Process, Roles, UseCases, Templates). `dark` renders on a charcoal band; default light renders on white. The Home page has its own custom hero — it does not use this primitive.

### `<Tabs value onChange label orientation layout>` + `<Tab value variant panelId>`

Compound, ARIA-compliant tabs. The `Tabs` wrapper handles `role="tablist"`, keyboard navigation (Arrow keys + Home/End), and focus management. The `Tab` button gets `role="tab"`, `aria-selected`, `aria-controls`, and roving `tabIndex`.

Tab variants:
- `pill` — single-line label, fully rounded, charcoal-fill when active. (Roles role selector.)
- `card` — left-aligned, supports rich child content (eyebrow + label). Active state inverts to charcoal bg. (Process phase tabs.)
- `card-lg` — same as `card` with bigger padding and 2px border, for prominent surface selectors. (UseCases surface tabs.)
- `vertical` — full-width, lime-tint active state, designed for sidebars. (Templates left rail.)

Pass `layout` to override the default flex/grid layout — e.g., the 8-column phase grid in Process.

```jsx
const [active, setActive] = useState(0);

<Tabs value={active} onChange={setActive} label="Role views">
  {roles.map((r, i) => (
    <Tab key={r.id} value={i} variant="pill">
      {r.name}
    </Tab>
  ))}
</Tabs>

{/* Rich content tab */}
<Tabs
  value={active}
  onChange={setActive}
  label="Process phases"
  layout="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2"
>
  {phases.map((p, i) => (
    <Tab key={p.id} value={i} variant="card">
      {({ active }) => (
        <>
          <Eyebrow tone={active ? 'dark' : 'light'}>Phase {p.id}</Eyebrow>
          <div className={`text-sm font-bold mt-1 leading-tight ${active ? 'text-white' : 'text-charcoal'}`}>
            {p.short}
          </div>
        </>
      )}
    </Tab>
  ))}
</Tabs>
```

The child of a `Tab` can be a render-prop function that receives `{ active }` so callers can style nested elements based on selection state.

## Tokens (defined in `tailwind.config.js`)

- `tracking-eyebrow` — canonical eyebrow letter-spacing (`0.18em`). Replaces the mix of `tracking-widest`, `tracking-[0.18em]`, `tracking-[0.22em]`, and `tracking-wider` that lived inline.
- `z-nav` / `z-dropdown` / `z-modal` — z-index scale, ready for sticky nav + modal layering.
- Color palette (`lime`, `charcoal`, `ink`, `muted`, `surface`, `subtle`) — already established. Never hardcode hex.
- Shadows: `shadow-card`, `shadow-cardHover` — used by `Card` automatically.

## Accessibility baseline

- Buttons have `focus-visible:ring-2 ring-lime ring-offset-2`.
- Tabs implement the WAI-ARIA tab pattern (tablist, tab, aria-selected, arrow-key nav, roving tabIndex).
- All interactive primitives default to `type="button"` (no accidental form submission).
- The `.accent-underline` rule lives in `src/app/globals.css` and is honored by both `PageHeader` and `SectionHeader`.

Contrast and semantic HTML should still be audited per page. The primitives above are deliberately conservative — they give new surfaces a solid floor.
