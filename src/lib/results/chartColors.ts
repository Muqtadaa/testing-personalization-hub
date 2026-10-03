// Chart palette for Recharts SVG fills/strokes. Tailwind can't generate classes
// from runtime values and SVG attributes can't consume utility classes, so the
// brand token hexes from tailwind.config.js are mirrored here — keep the two
// files in sync if the palette ever changes.

export const chart = {
  // Brand
  lime: "#B1FF33",
  lime500: "#9EE821",
  lime600: "#7FBF1A",
  lime700: "#5F9114",
  lime800: "#3F620D",
  charcoal: "#38353F",
  charcoalLight: "#4A4753",
  ink: "#212529",
  mutedText: "#595C5F",
  subtleText: "#6F7174",
  hairline: "#E5E4E7", // light grid lines
  surface: "#FFFFFF",
  subtleBg: "#F7F7F7",
  critical: "#B4453A",
  criticalText: "#7A241B",
} as const;

// Program series (stacked composition chart + program legends).
export const programColors = {
  optimizations: chart.charcoal,
  personalizations: chart.lime600,
  recommendations: chart.lime,
} as const;

// Uplift: positive = lime-anchored (brand "positive"), negative = critical.
export const upliftColors = {
  positive: chart.lime600,
  negative: chart.critical,
} as const;

// Forecast pacing series.
export const forecastColors = {
  actual: chart.lime600,
  forecast: chart.charcoal,
  prior1: "#A6A8A9",
  prior2: "#C9C8CC",
} as const;

// Experiment type accents (badges + donut).
export const typeColors = {
  optimization: chart.charcoal,
  personalization: chart.lime600,
  other: "#A6A8A9",
} as const;
