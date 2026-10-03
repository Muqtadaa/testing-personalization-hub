// FX qualification decision tree.
// Each question has answers that contribute to four signals: fx, web, direct, holdback.
// At the end we compute the strongest signal and recommend an approach with rationale.

export const questions = [
  {
    id: 'change-type',
    text: 'What kind of change is this?',
    help: 'Pick the option that best describes the change. If multiple apply, choose the deeper one (e.g., backend over UI).',
    answers: [
      {
        label: 'New product or app functionality',
        signals: { fx: 3 },
        rationale: 'New functionality typically benefits from controlled rollout and measurement.',
      },
      {
        label: 'Backend or API-driven experience change',
        signals: { fx: 3 },
        rationale: 'Backend changes need flag-controlled rollout — FX is the natural fit.',
      },
      {
        label: 'Frontend-only presentation, layout, or messaging change',
        signals: { web: 2, fx: 1 },
        rationale: 'Often a better fit for client-side / web experimentation, unless the change crosses into product logic.',
      },
      {
        label: 'Defect fix where the current experience is broken',
        signals: { direct: 4 },
        rationale: 'Fixing a broken experience generally should not require a holdback.',
      },
      {
        label: 'Compliance, accessibility, or security remediation',
        signals: { direct: 4 },
        rationale: 'Withholding the change from a control group is usually unacceptable.',
      },
    ],
  },
  {
    id: 'risk',
    text: 'What is the rollout risk if this goes broadly without measurement?',
    help: 'Think about what could go wrong, and how easy it would be to reverse.',
    answers: [
      {
        label: 'High — affects revenue, conversion, payment, or retention behavior',
        signals: { fx: 3 },
        rationale: 'High-stakes journeys benefit most from gradual exposure and kill-switch capability.',
      },
      {
        label: 'Medium — affects engagement or NPS but not core conversion',
        signals: { fx: 2 },
        rationale: 'Still worth measuring, especially if results inform future roadmap.',
      },
      {
        label: 'Low — small UI polish or messaging change',
        signals: { web: 2, direct: 1 },
        rationale: 'Lower-risk presentation changes can often be tested client-side or shipped directly.',
      },
    ],
  },
  {
    id: 'uncertainty',
    text: 'How uncertain are we about the customer or business impact?',
    help: 'Be honest. "We have strong opinions" is not the same as "we have evidence."',
    answers: [
      {
        label: 'Very uncertain — we are speculating about behavior change',
        signals: { fx: 3 },
        rationale: 'High uncertainty is the strongest signal for FX — that is what experiments are for.',
      },
      {
        label: 'Moderately uncertain — competing stakeholder opinions',
        signals: { fx: 2 },
        rationale: 'FX provides a neutral arbiter when opinions are split.',
      },
      {
        label: 'Confident based on prior tests or strong customer evidence',
        signals: { direct: 2, fx: 1 },
        rationale: 'If you genuinely have evidence, FX may not add enough value to justify the cost.',
      },
    ],
  },
  {
    id: 'flaggable',
    text: 'Can Engineering ship this behind a feature flag?',
    help: 'Including: SDK available, control behavior definable, fallback safe, kill-switch possible.',
    answers: [
      {
        label: 'Yes — the SDK pattern exists or is straightforward to add',
        signals: { fx: 2 },
        rationale: 'Technical feasibility is the gate to FX. Good signal.',
      },
      {
        label: 'Maybe — would require new SDK or significant flag plumbing',
        signals: { fx: 1, direct: 1 },
        rationale: 'Weigh the platform investment against the test value — may justify a one-time SDK build.',
      },
      {
        label: 'No — the change cannot be controlled at the code/feature level',
        signals: { web: 2, direct: 1 },
        rationale: 'If the change cannot be flagged, it cannot be FX. Web experimentation or direct release.',
      },
    ],
  },
  {
    id: 'holdback',
    text: 'Is it acceptable to hide this from a control group during the test?',
    help: 'Some changes — compliance, customer-promised features, ethical changes — cannot be withheld.',
    answers: [
      {
        label: 'Yes — a control group is fine',
        signals: { fx: 2 },
        rationale: 'Holdback feasibility is a precondition for any controlled experiment.',
      },
      {
        label: 'Partially — short holdback OK, long holdback not OK',
        signals: { fx: 1 },
        rationale: 'Design a shorter runtime or smaller holdback. Still FX-feasible.',
      },
      {
        label: 'No — withholding would create customer, legal, or operational risk',
        signals: { direct: 4 },
        rationale: 'Ship directly. Document the rationale so the decision is auditable.',
      },
    ],
  },
  {
    id: 'measurement',
    text: 'Can a meaningful effect realistically be measured?',
    help: 'Consider traffic volume, time to detect, and whether the right events / metrics exist.',
    answers: [
      {
        label: 'Yes — sufficient traffic, clear KPI, events available or easy to add',
        signals: { fx: 2 },
        rationale: 'Measurement feasibility is essential. Green light.',
      },
      {
        label: 'Possibly — long runtime needed or new instrumentation required',
        signals: { fx: 1 },
        rationale: 'FX still viable but plan for longer runtime and event work upfront.',
      },
      {
        label: 'No — too little traffic or no realistic way to measure',
        signals: { direct: 2, web: 1 },
        rationale: 'Without measurement, an experiment will not produce a decision. Ship and monitor, or use qualitative methods.',
      },
    ],
  },
  {
    id: 'strategic',
    text: 'Will the result influence future investment, roadmap, or audience strategy?',
    help: 'Even neutral results can be valuable if they kill a bad idea or unlock segmentation.',
    answers: [
      {
        label: 'Yes — result will drive a clear roadmap decision',
        signals: { fx: 2 },
        rationale: 'Strategic FX justifies the operating cost.',
      },
      {
        label: 'Maybe — interesting to know but no specific roadmap decision tied to it',
        signals: { fx: 1, direct: 1 },
        rationale: 'Weigh FX cost against learning value alone.',
      },
      {
        label: 'No — we are shipping this regardless of result',
        signals: { direct: 3 },
        rationale: 'If the decision is already made, FX adds cost without changing the outcome.',
      },
    ],
  },
];

// All recommendations share a charcoal surface — the recommendation name does the
// differentiating, not the surface color. A top accent stripe varies by experimentation
// intensity: strong lime for FX, softer lime for Web, neutral muted for direct release.
export const recommendations = {
  fx: {
    title: 'Feature Experimentation (FX)',
    stripe: 'bg-lime',
    intensity: 'Strong fit',
    summary:
      'This enhancement is a strong fit for Feature Experimentation. The combination of risk, uncertainty, and measurability justifies the operating cost.',
    nextSteps: [
      'Move to FX intake — define hypothesis, KPI, guardrails, and decision criteria.',
      'Loop in Engineering for flag design and Analytics for metric validation.',
      'Use the templates page to draft the experiment brief.',
    ],
  },
  web: {
    title: 'Web / Client-side Experimentation',
    stripe: 'bg-lime/40',
    intensity: 'Lighter alternative',
    summary:
      'This looks like a presentation, content, or marketing-surface change that does not need full FX overhead. Client-side experimentation is faster and lighter.',
    nextSteps: [
      'Confirm with Testing & Personalization that web experimentation is the right channel.',
      'Define a measurement plan even if it is lightweight.',
      'If the test surfaces deeper product questions, consider escalating to FX.',
    ],
  },
  direct: {
    title: 'Direct release (no experiment)',
    stripe: 'bg-muted',
    intensity: 'No experiment',
    summary:
      'This change does not meet the bar for experimentation — either the risk is low, the holdback is infeasible, or the decision is already made. Ship it, but document the rationale.',
    nextSteps: [
      'Ship through the normal release process.',
      'Document why FX was not used so the decision is auditable.',
      'Plan for post-launch monitoring even without a control group.',
    ],
  },
};

// Compute the strongest signal across answered questions.
export function recommend(answerSignals) {
  const totals = answerSignals.reduce(
    (acc, signals) => {
      Object.keys(signals).forEach((k) => {
        acc[k] = (acc[k] || 0) + signals[k];
      });
      return acc;
    },
    { fx: 0, web: 0, direct: 0 }
  );

  let winner = 'fx';
  let max = -1;
  Object.keys(totals).forEach((k) => {
    if (totals[k] > max) {
      max = totals[k];
      winner = k;
    }
  });

  return { winner, totals };
}
