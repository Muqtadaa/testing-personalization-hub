/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Default brand palette
        lime: {
          DEFAULT: '#B1FF33',
          50: '#F4FFE0',
          100: '#E8FFC1',
          200: '#D6FF94',
          300: '#C3FF67',
          400: '#B1FF33',
          500: '#9EE821',
          600: '#7FBF1A',
          700: '#5F9114',
          800: '#3F620D',
          900: '#1F3107',
        },
        charcoal: {
          DEFAULT: '#38353F',
          alt: '#35323D',
          deeper: '#2A2832',
          light: '#4A4753',
        },
        ink: '#212529',
        muted: '#C3C2C5',
        surface: '#FFFFFF',
        subtle: '#F7F7F7',
        // Critical / negative — the one semantic state the lime+charcoal palette
        // lacks. Tuned for AA on white and on its own tint. Use: `bg-critical`
        // (solid marks/bars), `bg-critical-tint` + `border-critical-border` +
        // `text-critical-text` (alerts/error states). Lime carries "positive".
        critical: {
          DEFAULT: '#B4453A', // 4.55:1 on white — solid fills, chart bars
          tint: '#F7E8E6', // alert / row background
          border: '#E3B5AF', // hairline on tint
          text: '#7A241B', // 8.1:1 on white, 6.9:1 on tint — error text
        },
      },
      fontFamily: {
        // Inter is loaded via next/font/google in src/app/layout.tsx and exposed
        // as the --font-inter CSS variable. Reference the variable so the loaded
        // (self-hosted, swap) font drives every `font-sans` / `font-display` use.
        sans: [
          'var(--font-inter)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'sans-serif',
        ],
        display: [
          'var(--font-inter)',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        cardHover: '0 8px 24px rgba(56, 53, 63, 0.12)',
      },
      letterSpacing: {
        // Canonical eyebrow tracking — replaces the mix of widest / [0.18em] / [0.22em] / wider
        eyebrow: '0.18em',
      },
      zIndex: {
        nav: '30',
        dropdown: '40',
        modal: '50',
      },
      // Semantic typography scale — pair size + line-height + letter-spacing + weight.
      // Composes with Tailwind defaults (text-xs/sm/base/lg/xl/2xl/3xl etc remain available).
      // Prefer semantic tokens (text-h2, text-body) over raw size utilities in components.
      fontSize: {
        // Marketing-style display headline (Home hero only). Fluid: 36px → 60px.
        display: [
          'clamp(2.25rem, 4vw + 1rem, 3.75rem)',
          { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        // Page-level heading (used by PageHeader and standalone page titles)
        h1: ['1.875rem', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '700' }], // 30px
        'h1-lg': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '700' }], // 40px
        // In-page section heading (SectionHeader size="h2")
        h2: ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }], // 24px
        'h2-lg': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }], // 30px
        // Sub-section heading
        h3: ['1.25rem', { lineHeight: '1.3', fontWeight: '700' }], // 20px
        // Card / object title — body-size with weight
        h4: ['1rem', { lineHeight: '1.4', fontWeight: '700' }], // 16px
        // Lead paragraph / intro text
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }], // 18px
        // Default body
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }], // 16px
        // Compact body
        'body-sm': ['0.875rem', { lineHeight: '1.55', fontWeight: '400' }], // 14px
        // Caption / supporting text
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }], // 12px
        // Eyebrow — uppercase label (consumer adds `uppercase` and an Eyebrow color)
        eyebrow: ['0.75rem', { lineHeight: '1', letterSpacing: '0.18em', fontWeight: '700' }], // 12px
      },
      // Semantic text colors — every entry below is verified to meet WCAG AA 4.5:1 on its intended surface.
      // Migrate from text-ink/<opacity> utilities (which were doing semantic work without semantic names
      // and frequently failed AA) to these tokens.
      textColor: {
        // For body text on light surfaces
        body: '#212529', // ink — 15.43:1 on white (AAA)
        muted: '#595C5F', // 6.73:1 on white — supporting text
        subtle: '#6F7174', // 4.89:1 on white — minimum that passes AA
        disabled: '#A6A8A9', // 2.39:1 — decoration only; not for text. Pair with non-color cue.
        // For text on dark surfaces (charcoal #38353F)
        'on-dark': '#FFFFFF', // 12.01:1 on charcoal
        'on-dark-muted': '#D7D7D9', // 8.35:1 on charcoal
        'on-dark-subtle': '#B9B8BC', // 6.09:1 on charcoal
        // Accent text — replaces lime-700 (3.79:1, fails AA) for eyebrows and small accents
        accent: '#3F620D', // lime-800 — 7.08:1 on white (AAA)
        'accent-on-dark': '#B1FF33', // lime — 9.85:1 on charcoal
      },
    },
  },
  plugins: [],
};
