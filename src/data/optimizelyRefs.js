// Single source of truth for every outbound link to Optimizely Feature Experimentation docs.
// If a URL needs to change (Optimizely is migrating some how-to pages from docs.developers
// to support.optimizely.com), update it here and every consumer follows.
//
// kind:
//   'concept'   — Core Concepts page, safe to quote/summarize on the Concepts page
//   'howto'     — procedural page, summarize lightly and link
//   'reference' — SDK / REST / Agent / Edge reference; link only, never inline content
//
// note: Optimizely is gradually moving conceptual / "how to use the app" content from
// docs.developers.optimizely.com to support.optimizely.com. URLs in this file were
// verified live; if a link starts redirecting, check the support article ID hasn't moved
// and update here in one place.

const DEV_BASE = 'https://docs.developers.optimizely.com/feature-experimentation/docs';
const SUPPORT = 'https://support.optimizely.com/hc/en-us/articles';

export const optimizelyRefs = {
  // ── Core Concepts ────────────────────────────────────────────────────────
  bucketing: {
    title: 'How bucketing works',
    url: `${DEV_BASE}/how-bucketing-works-feature-experimentation`,
    blurb: 'Deterministic assignment via MurmurHash into 10,000 buckets — same user, same variation, every time.',
    kind: 'concept',
  },
  impressionsDecisions: {
    title: 'Impressions and decisions',
    url: `${SUPPORT}/38932560874765-What-are-impressions-and-decisions-in-Feature-Experimentation`,
    blurb: 'What gets counted, when, and how billing and reporting see your traffic.',
    kind: 'concept',
  },
  ruleInteractions: {
    title: 'Interactions between flag rules',
    url: `${DEV_BASE}/interactions-between-flag-rules`,
    blurb: 'How targeted rollouts, A/B tests, and holdouts evaluate together on the same flag.',
    kind: 'concept',
  },
  faqs: {
    title: 'Feature Experimentation FAQs',
    url: `${SUPPORT}/38936054583053-Feature-Experimentation-FAQs`,
    blurb: 'Common questions across the platform — bucketing edge cases, rule precedence, billing.',
    kind: 'concept',
  },

  // ── Create Flags (how-to) ────────────────────────────────────────────────
  createFlags: {
    title: 'Create feature flags',
    url: `${DEV_BASE}/create-feature-flags`,
    blurb: 'Naming, ownership, and the basic flag lifecycle inside the Optimizely project.',
    kind: 'howto',
  },
  createVariables: {
    title: 'Create flag variables',
    url: `${DEV_BASE}/create-flag-variables`,
    blurb: 'Define typed parameters (string, boolean, JSON, number) a variation can read at runtime.',
    kind: 'howto',
  },
  createVariations: {
    title: 'Create flag variations',
    url: `${DEV_BASE}/create-flag-variations`,
    blurb: 'Add the variations a flag will serve and what each one represents.',
    kind: 'howto',
  },
  handleUserIds: {
    title: 'Handle user IDs',
    url: `${DEV_BASE}/handle-user-ids`,
    blurb: 'Pick a stable user identifier so bucketing is consistent across sessions and devices.',
    kind: 'howto',
  },
  targetAudiences: {
    title: 'Target audiences',
    url: `${SUPPORT}/38683417490957-Target-audiences-in-Feature-Experimentation`,
    blurb: 'Define audience conditions on attributes so a flag rule only evaluates for the right users.',
    kind: 'howto',
  },
  trackEvents: {
    title: 'Track user events',
    url: `${DEV_BASE}/track-events`,
    blurb: 'Send events that power primary metrics, guardrails, and segmentation.',
    kind: 'howto',
  },

  // ── Run Flag Rules ───────────────────────────────────────────────────────
  runAbTests: {
    title: 'Run A/B tests',
    url: `${DEV_BASE}/run-a-b-tests`,
    blurb: 'How A/B tests work and how to configure them — variations, traffic allocation, primary metric.',
    kind: 'howto',
  },
  runFlagDeliveries: {
    title: 'Run flag deliveries (rollouts)',
    url: `${DEV_BASE}/run-flag-deliveries`,
    blurb: 'Targeted rollout: ramp a flag from 1% → 100% on a defined audience without a control comparison.',
    kind: 'howto',
  },
  runMab: {
    title: 'Run a multi-armed bandit',
    url: `${DEV_BASE}/run-a-mab-optimization`,
    blurb: 'Auto-shift traffic toward the winning variation while a test is still running.',
    kind: 'howto',
  },
  runContextualMab: {
    title: 'Run contextual multi-armed bandit',
    url: `${DEV_BASE}/run-contextual-multi-armed-bandits`,
    blurb: 'A MAB that also factors in user attributes when assigning traffic.',
    kind: 'howto',
  },
  analyzeResults: {
    title: 'Analyze results',
    url: `${SUPPORT}/38941449370893-Analyze-results-in-Feature-Experimentation`,
    blurb: 'Read the Optimizely results view — lift, significance, segments, data freshness.',
    kind: 'howto',
  },
  qaTroubleshoot: {
    title: 'QA and troubleshoot',
    url: `${SUPPORT}/38940479543181-QA-and-troubleshoot-Feature-Experimentation`,
    blurb: 'Force variations, validate event firing, debug audience evaluation before launch.',
    kind: 'howto',
  },
  mutualExclusion: {
    title: 'Use mutual exclusion',
    url: `${DEV_BASE}/use-mutual-exclusion`,
    blurb: 'Prevent users from being in two conflicting tests at the same time.',
    kind: 'howto',
  },

  // ── Configure ────────────────────────────────────────────────────────────
  environments: {
    title: 'Manage environments',
    url: `${SUPPORT}/38930570069645-Manage-environments-in-Feature-Experimentation`,
    blurb: 'Separate development, staging, and production datafiles and rule sets.',
    kind: 'howto',
  },
  scheduledChanges: {
    title: 'Scheduled changes',
    url: `${DEV_BASE}/scheduled-changes`,
    blurb: 'Queue a flag-rule change to apply at a specific future time without manual intervention.',
    kind: 'howto',
  },
  changeApprovals: {
    title: 'Change approvals',
    url: `${SUPPORT}/38931075240205-Change-approvals`,
    blurb: 'Require sign-off before a flag-rule change is published to an environment.',
    kind: 'howto',
  },

  // ── Best Practice ────────────────────────────────────────────────────────
  implementationChecklist: {
    title: 'Implementation checklist',
    url: `${DEV_BASE}/implementation-checklist`,
    blurb: 'The canonical list Optimizely recommends running through before launch.',
    kind: 'howto',
  },
  twoStageTesting: {
    title: 'Two- and three-stage testing',
    url: `${SUPPORT}/38941297614477-Two-and-three-stage-testing-in-Feature-Experimentation`,
    blurb: 'Split delivery into staged exposure — internal → small rollout → A/B → broad rollout.',
    kind: 'concept',
  },
  globalHoldouts: {
    title: 'Global holdouts',
    url: `${SUPPORT}/38941939408269-Global-holdouts`,
    blurb: 'Reserve a fixed percentage of users from all experiments to measure long-run portfolio impact.',
    kind: 'concept',
  },
  idePlugins: {
    title: 'IDE plug-ins',
    url: `${DEV_BASE}/ide-plugins`,
    blurb: 'VS Code / JetBrains plug-ins that surface flag references and decision calls inline.',
    kind: 'howto',
  },

  // ── Reference (link only) ────────────────────────────────────────────────
  quickstarts: {
    title: 'Quickstarts',
    url: `${DEV_BASE}/quickstarts`,
    blurb: 'Per-SDK get-started guides — install, initialize, decide, track in a few steps.',
    kind: 'reference',
  },
  sdkReference: {
    title: 'SDK reference guides',
    url: `${DEV_BASE}/sdk-reference-guides`,
    blurb: 'Full reference for all 13 SDKs: methods, parameters, return types, notification listeners.',
    kind: 'reference',
  },
  restApi: {
    title: 'REST API reference',
    url: 'https://docs.developers.optimizely.com/feature-experimentation/reference/getting-started',
    blurb: 'Programmatically manage flags, audiences, experiments, and projects.',
    kind: 'reference',
  },
  statsEngine: {
    title: 'Optimizely Stats Engine',
    url: 'https://www.optimizely.com/insights/optimizely-stats-engine/',
    blurb: 'How Optimizely computes lift, confidence intervals, and statistical significance.',
    kind: 'reference',
  },

  // ── Introduction ────────────────────────────────────────────────────────
  introduction: {
    title: 'Feature Experimentation introduction',
    url: `${DEV_BASE}/introduction`,
    blurb: "Optimizely's top-of-funnel overview of what Feature Experimentation is and what it enables.",
    kind: 'concept',
  },
};
