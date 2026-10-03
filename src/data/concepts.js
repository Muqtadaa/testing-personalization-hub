// Glossary of Feature Experimentation terms — assembled from Optimizely's
// Core Concepts pages and Best Practice prose. Each entry references a
// canonical doc page in optimizelyRefs and carries the shape needed by:
//   - ConceptCard (term + summary + sourceRef + relatedTerms + appearances)
//   - GlossaryTerm tooltip (oneLineDef + sourceRef)
//   - cross-page deep links via /concepts#<id>
//
// Summaries are short paraphrases — not verbatim quotes. The Concepts page
// renders a single attribution line linking back to docs.developers.optimizely.com.

export const concepts = [
  {
    id: 'feature-flag',
    term: 'Feature flag',
    oneLineDef:
      'A named on/off (or multi-value) gate around a piece of code, controlled at runtime without a redeploy.',
    summary:
      'A feature flag is the unit of control in Feature Experimentation. Code asks "what should I do for this user?" and the SDK answers based on the flag rules currently configured. The flag separates deploying code from releasing the experience — you can ship variation logic to production weeks before exposing it to anyone, and turn it off without another deploy if something goes wrong.',
    sourceRef: 'createFlags',
    relatedTerms: ['variation', 'variable', 'flag-delivery', 'kill-switch'],
    appearsInPhases: [1, 3, 4, 8],
    appearsInRoles: ['product', 'engineering', 'testing-personalization'],
  },
  {
    id: 'variation',
    term: 'Variation',
    oneLineDef:
      'One branch a flag can serve — typically "control" plus one or more alternatives.',
    summary:
      'A flag with two or more variations is what makes it a test. Every variation represents a distinct experience the SDK can decide to serve. The control is usually the existing behavior; the alternatives are the changes you want to evaluate. Traffic allocation determines what share of eligible users see each variation.',
    sourceRef: 'createVariations',
    relatedTerms: ['feature-flag', 'variable', 'traffic-allocation', 'ab-test'],
    appearsInPhases: [2, 3, 4, 5],
    appearsInRoles: ['engineering', 'testing-personalization'],
  },
  {
    id: 'variable',
    term: 'Flag variable',
    oneLineDef:
      'A typed parameter (string, boolean, JSON, number) that a variation exposes for the code to read.',
    summary:
      'Where a variation is which branch of code runs, a variable is what that branch reads. Variables let you change copy, prices, thresholds, or feature toggles inside a variation without changing application code. Each variation can ship a different value for the same variable, so the SDK can deliver "blue button" vs "green button" without two implementations.',
    sourceRef: 'createVariables',
    relatedTerms: ['feature-flag', 'variation'],
    appearsInPhases: [3, 4],
    appearsInRoles: ['engineering'],
  },
  {
    id: 'audience',
    term: 'Audience',
    oneLineDef:
      'A condition on user attributes that decides whether a flag rule is allowed to evaluate for a given user.',
    summary:
      'Audiences let a flag rule target only the users you care about — a country, a risk tier, a logged-in cohort, a referral source. Optimizely evaluates audience conditions before bucketing, so a user outside the audience never enters the test. You define audiences from the attributes your application sends with each decision call.',
    sourceRef: 'targetAudiences',
    relatedTerms: ['traffic-allocation', 'flag-delivery', 'mutual-exclusion'],
    appearsInPhases: [2, 3, 5],
    appearsInRoles: ['product', 'testing-personalization'],
  },
  {
    id: 'traffic-allocation',
    term: 'Traffic allocation',
    oneLineDef:
      'The share of eligible users a flag rule actually exposes, and how those users split across variations.',
    summary:
      'Traffic allocation has two dimensions: how much of the qualifying audience enters the experiment, and how that traffic divides across variations. You might allocate 20% of qualifying users to a test (the rest see whatever the next rule serves) and split that 20% as 50/50 across control and variation. Allocation controls risk and statistical power simultaneously.',
    sourceRef: 'runAbTests',
    relatedTerms: ['audience', 'variation', 'bucketing', 'impression'],
    appearsInPhases: [2, 5, 6],
    appearsInRoles: ['testing-personalization', 'engineering'],
  },
  {
    id: 'bucketing',
    term: 'Bucketing',
    oneLineDef:
      'Deterministic assignment of a user to a variation, computed from a hash so the same user always gets the same answer.',
    summary:
      "Optimizely hashes the user ID together with the experiment's identifier (using MurmurHash) into one of 10,000 buckets, then maps buckets to variations according to the configured traffic split. Because the math is deterministic, every SDK in every environment produces the same decision for the same user — no central lookup needed, and no risk of one device showing control while another shows variation.",
    sourceRef: 'bucketing',
    relatedTerms: ['traffic-allocation', 'variation', 'feature-flag'],
    appearsInPhases: [3, 4, 5],
    appearsInRoles: ['engineering', 'testing-personalization'],
  },
  {
    id: 'impression',
    term: 'Impression',
    oneLineDef:
      'A logged event saying "this user was actually exposed to this variation," recorded the moment the SDK returns a decision.',
    summary:
      'Impressions are what populate the Optimizely results view and what billing counts. They fire when your code calls a decision method and the SDK resolves a variation — not when you create the flag, and not when a user merely qualifies for an audience. If decision calls never happen, the experiment has no data, even if everything else is configured correctly.',
    sourceRef: 'impressionsDecisions',
    relatedTerms: ['decision', 'event', 'traffic-allocation'],
    appearsInPhases: [4, 5, 6, 7],
    appearsInRoles: ['engineering', 'analytics', 'testing-personalization'],
  },
  {
    id: 'decision',
    term: 'Decision',
    oneLineDef:
      'The SDK call that asks "what variation should this user see?" — returns the variation and (usually) logs an impression.',
    summary:
      'A decision is what your code requests at the moment it needs to know how to render. Most SDK methods that return a variation also log an impression as a side effect, which is why decision call placement matters — call it once when the user actually encounters the feature, not on every page load and not before the feature can be seen.',
    sourceRef: 'impressionsDecisions',
    relatedTerms: ['impression', 'feature-flag', 'variation'],
    appearsInPhases: [4, 5],
    appearsInRoles: ['engineering'],
  },
  {
    id: 'event',
    term: 'Event',
    oneLineDef:
      'A signal the SDK forwards to Optimizely (purchase, signup, click) that powers primary metrics and guardrails.',
    summary:
      'Events are how Optimizely measures whether a variation actually moved behavior. The application calls `track` with an event key — "purchase_complete", "order_approved", "payment_made" — and Optimizely joins those events to the impressions it already has, then computes lift on each variation. Events need to fire at the moment the behavior really happens, not earlier and not later.',
    sourceRef: 'trackEvents',
    relatedTerms: ['impression', 'primary-metric', 'guardrail-metric'],
    appearsInPhases: [3, 4, 5, 7],
    appearsInRoles: ['engineering', 'analytics'],
  },
  {
    id: 'ab-test',
    term: 'A/B test',
    oneLineDef:
      'A flag rule that splits qualifying traffic across two or more variations and compares outcomes.',
    summary:
      'A/B tests are how Feature Experimentation measures impact. Users qualify via the audience, get bucketed deterministically across variations, and the Stats Engine compares each variation against control on the primary metric. The test runs until you reach the planned sample size or hit a stop condition in your decision criteria.',
    sourceRef: 'runAbTests',
    relatedTerms: ['variation', 'traffic-allocation', 'primary-metric', 'stats-engine'],
    appearsInPhases: [1, 2, 6, 7],
    appearsInRoles: ['product', 'testing-personalization', 'leadership'],
  },
  {
    id: 'flag-delivery',
    term: 'Flag delivery (rollout)',
    oneLineDef:
      'A flag rule that ramps an experience to an audience without a control comparison — release, not measure.',
    summary:
      'Where an A/B test asks "which variation wins?", a flag delivery asks "is this safe to expose to more people?" Use a rollout when you already know what you want to ship and you want controlled exposure — 1% → 10% → 50% → 100% — with the option to pause if telemetry looks wrong. Rollouts have no statistical readout because there is no control group.',
    sourceRef: 'runFlagDeliveries',
    relatedTerms: ['audience', 'kill-switch', 'two-stage-testing'],
    appearsInPhases: [6, 8],
    appearsInRoles: ['product', 'engineering', 'testing-personalization'],
  },
  {
    id: 'holdout',
    term: 'Holdout',
    oneLineDef:
      'A reserved percentage of users excluded from all experiments, used to measure long-run cumulative impact.',
    summary:
      "Holdouts let you answer a portfolio-level question: across everything we shipped this quarter, did the experiments actually move the business? A small share of users (often 1–5%) is held out of every experiment and rollout. Comparing held-out users to the rest over a long window quantifies the program's combined effect, which no single test can show.",
    sourceRef: 'globalHoldouts',
    relatedTerms: ['ab-test', 'audience'],
    appearsInPhases: [2, 8],
    appearsInRoles: ['testing-personalization', 'leadership'],
  },
  {
    id: 'mutual-exclusion',
    term: 'Mutual exclusion',
    oneLineDef:
      'Configuration that prevents a single user from being in two conflicting experiments at the same time.',
    summary:
      'Two experiments on overlapping UI can interfere with each other — variation A of test 1 may not behave as expected if the user is also in variation B of test 2. Mutual exclusion routes each user to at most one of a designated set of tests, so results stay clean. Use it whenever two experiments touch the same surface or metric.',
    sourceRef: 'mutualExclusion',
    relatedTerms: ['ab-test', 'audience', 'rule-interactions'],
    appearsInPhases: [2, 3],
    appearsInRoles: ['testing-personalization'],
  },
  {
    id: 'mab',
    term: 'Multi-armed bandit (MAB)',
    oneLineDef:
      'A flag rule that automatically shifts traffic toward the variation performing best while the test runs.',
    summary:
      'A MAB trades some statistical rigor for faster exposure to the winning variation. Instead of a fixed 50/50 split, the algorithm reallocates traffic over time toward variations with higher observed lift. Best for short-window or high-volume decisions where minimizing regret matters more than a clean p-value — promo banners, recommendation tiles, contextual offers.',
    sourceRef: 'runMab',
    relatedTerms: ['ab-test', 'contextual-mab', 'traffic-allocation'],
    appearsInPhases: [6, 8],
    appearsInRoles: ['testing-personalization', 'product'],
  },
  {
    id: 'contextual-mab',
    term: 'Contextual MAB',
    oneLineDef:
      'A MAB that also factors user attributes into its assignment decisions — different segments may converge on different winners.',
    summary:
      'Contextual MAB extends a regular MAB by conditioning its traffic shifts on user attributes. The algorithm can learn that "new visitors do best with variation A, returning customers do best with variation B" and serve accordingly. Useful when segments respond differently and you want personalization without separate experiments per segment.',
    sourceRef: 'runContextualMab',
    relatedTerms: ['mab', 'audience'],
    appearsInPhases: [6, 8],
    appearsInRoles: ['testing-personalization'],
  },
  {
    id: 'stats-engine',
    term: 'Stats Engine',
    oneLineDef:
      'The statistical method Optimizely uses to compute lift, confidence intervals, and significance.',
    summary:
      "Optimizely's Stats Engine uses sequential testing — designed to let you peek at results during a test without inflating false-positive rates. It reports lift relative to control, a confidence interval, and a statistical-significance threshold you can use as a decision input. The engine is also what powers the readout view your team sees in the Optimizely UI.",
    sourceRef: 'statsEngine',
    relatedTerms: ['ab-test', 'primary-metric', 'guardrail-metric'],
    appearsInPhases: [7],
    appearsInRoles: ['analytics', 'testing-personalization'],
  },
  {
    id: 'primary-metric',
    term: 'Primary metric',
    oneLineDef:
      'The one metric the test is designed to move — the basis for the scale/ship decision.',
    summary:
      'A test gets one primary metric. Secondary metrics inform context; guardrails catch harm; but the primary metric is what the experiment was built to answer. Define it before launch, in the same units the business uses, with the same observation window the test will run for. Changing the primary metric after looking at results is how teams talk themselves into shipping things that did not work.',
    sourceRef: 'runAbTests',
    relatedTerms: ['guardrail-metric', 'event', 'stats-engine'],
    appearsInPhases: [1, 2, 7],
    appearsInRoles: ['product', 'analytics', 'testing-personalization'],
  },
  {
    id: 'guardrail-metric',
    term: 'Guardrail metric',
    oneLineDef:
      "A metric the variation must not harm — independent of whether it improves the primary.",
    summary:
      'Guardrails protect against unintended damage. A variation might improve checkout conversion but also tank payment-method add rates, or improve clicks but slow page load. Define a small set of guardrails up front (revenue per visitor, page speed, error rate, support contacts) and make "harm to a guardrail = roll back" a pre-registered decision rule, not a discussion you have after the fact.',
    sourceRef: 'runAbTests',
    relatedTerms: ['primary-metric', 'event'],
    appearsInPhases: [1, 2, 5, 7],
    appearsInRoles: ['product', 'analytics', 'testing-personalization'],
  },
  {
    id: 'environment',
    term: 'Environment',
    oneLineDef:
      'A separated copy of your flag rules (e.g. development, staging, production) so dev configuration cannot affect live users.',
    summary:
      "Each Optimizely environment has its own datafile and its own set of rules. The same flag can have different rules in each environment — 100% variation in dev, paused in staging, 5% rollout in production. The SDK loads whichever environment's datafile you point it at, which is how you keep test configuration from leaking into production behavior.",
    sourceRef: 'environments',
    relatedTerms: ['datafile', 'feature-flag'],
    appearsInPhases: [3, 5, 6],
    appearsInRoles: ['engineering'],
  },
  {
    id: 'datafile',
    term: 'Datafile',
    oneLineDef:
      'The JSON document the SDK reads to know about all your flags, rules, audiences, and variations.',
    summary:
      'The datafile is the runtime contract between Optimizely and your application. When you change a flag rule in the UI, Optimizely publishes a new datafile; the SDK fetches it (immediately or on a polling interval) and starts using the new rules. Every decision the SDK makes is based on whatever datafile it currently holds — no live network call per decision.',
    sourceRef: 'environments',
    relatedTerms: ['environment', 'feature-flag'],
    appearsInPhases: [4, 6],
    appearsInRoles: ['engineering'],
  },
  {
    id: 'kill-switch',
    term: 'Kill switch',
    oneLineDef:
      "The ability to pause or turn off a flag from the Optimizely UI without redeploying application code.",
    summary:
      'Because flag state lives in the datafile, you can disable a variation from the Optimizely UI and every SDK picks up the change at its next datafile fetch. This is the rollback path that makes flag-gated releases lower-risk than ungated ones — incident, regression, surprise behavior all become "pause the flag" instead of "ship a revert."',
    sourceRef: 'createFlags',
    relatedTerms: ['feature-flag', 'flag-delivery'],
    appearsInPhases: [3, 5, 6],
    appearsInRoles: ['engineering', 'product'],
  },
  {
    id: 'rule-interactions',
    term: 'Rule interactions',
    oneLineDef:
      'How multiple rules on the same flag — rollout, A/B test, holdout — evaluate in order for each user.',
    summary:
      'A flag often has more than one rule attached: a holdout, then an A/B test, then a fallback rollout. Optimizely evaluates them in a defined order for each decision call, and only the first matching rule decides the variation. Knowing the order prevents the classic surprise where a test "stopped working" because a holdout was added above it.',
    sourceRef: 'ruleInteractions',
    relatedTerms: ['feature-flag', 'flag-delivery', 'holdout', 'mutual-exclusion'],
    appearsInPhases: [2, 3],
    appearsInRoles: ['engineering', 'testing-personalization'],
  },
  {
    id: 'two-stage-testing',
    term: 'Two-/three-stage testing',
    oneLineDef:
      'A staged exposure pattern — internal validation → small rollout → A/B test → broad rollout.',
    summary:
      "Best for high-risk features. Stage 1 ships behind a flag enabled only for internal users; stage 2 does a low-percentage production rollout to validate telemetry and stability; stage 3 runs the actual A/B test once you trust the data and the experience; stage 4 rolls out broadly to the winning variation. Each stage de-risks the next without losing the option to roll back.",
    sourceRef: 'twoStageTesting',
    relatedTerms: ['flag-delivery', 'ab-test', 'kill-switch'],
    appearsInPhases: [4, 5, 6],
    appearsInRoles: ['product', 'engineering', 'testing-personalization'],
  },
];
