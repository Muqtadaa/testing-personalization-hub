// Downloadable templates — intake, decision criteria, QA, readout.
// Each template has a markdown body so the user can copy or download as .md.

export const templates = [
  {
    id: 'intake',
    title: 'FX Intake Questionnaire',
    description:
      'Fifteen questions to qualify an enhancement for Feature Experimentation. Use in the qualification phase.',
    filename: 'fx-intake-questionnaire.md',
    body: `# FX Intake Questionnaire

**Team:** Testing & Personalization
**Submitted by:**
**Date:**

---

1. What enhancement are we proposing?
2. What customer, employee, seller, or business problem does it solve?
3. What behavior do we expect to change?
4. What is the hypothesis?
5. What is the primary KPI?
6. What guardrail metrics matter?
7. What audience should be included or excluded?
8. Can the enhancement be safely hidden from a control group?
9. Can Engineering build it behind a feature flag?
10. What events or attributes are required to measure it?
11. Does analysis need to happen in Optimizely, warehouse data, or both?
12. What is the expected runtime?
13. What are the launch risks?
14. What is the rollback plan?
15. What decision will we make for each possible result?

---

**Qualification decision:** ☐ FX  ☐ Web experimentation  ☐ Direct release  ☐ Defer

**Rationale:**

**Next owner:**
`,
    references: ['runAbTests', 'runFlagDeliveries', 'targetAudiences'],
  },
  {
    id: 'decision-criteria',
    title: 'Decision Criteria Template',
    description:
      'Define the rollout decision for each possible test result before launch. Locks in objectivity at readout.',
    filename: 'fx-decision-criteria.md',
    body: `# FX Decision Criteria Template

**Experiment name:**
**Owner:**
**Launch date:**

| Decision | Criteria | Action |
|---|---|---|
| Scale | Primary KPI improves and guardrails remain stable | Roll out to planned audience and clean up experiment code. |
| Segment | Overall result is neutral, but priority segment shows meaningful lift | Roll out to qualifying segment and document targeting logic. |
| Iterate | Directional promise exists, but UX, implementation, or audience issues are identified | Create follow-up test or enhancement ticket. |
| Hold | Results are inconclusive and traffic/runtime is insufficient | Extend runtime if business risk justifies it. |
| Roll back | Primary KPI declines or guardrails show unacceptable harm | Disable flag and document learnings. |
| Release anyway | Measured impact is neutral or unclear, but strategic/operational rationale outweighs test result | Release with documented rationale and monitoring plan. |

---

**Pre-registered decision notes:**
- Primary KPI definition:
- Guardrails:
- Priority segments to inspect:
- "Release anyway" rationale (if applicable):
`,
    references: ['analyzeResults', 'statsEngine', 'twoStageTesting'],
  },
  {
    id: 'qa-checklist',
    title: 'FX QA Checklist',
    description:
      'Pre-launch validation across feature behavior, flag logic, bucketing, and tracking. Required before production traffic.',
    filename: 'fx-qa-checklist.md',
    body: `# FX QA Checklist

**Experiment:**
**Environment:**
**QA Owner:**

### Feature behavior
- [ ] Control experience renders correctly
- [ ] Variation experience renders correctly
- [ ] Fallback / default behavior works when Optimizely is unavailable

### Flag and bucketing
- [ ] Flag name follows naming convention
- [ ] Users are bucketed consistently across sessions
- [ ] Traffic allocation matches expected split
- [ ] Targeting and exclusions work as intended
- [ ] Feature can be paused or rolled back from the Optimizely UI

### Tracking
- [ ] All required events fire only when expected
- [ ] Primary metric can be captured
- [ ] Guardrail metrics can be captured
- [ ] Required attributes are populated for targeting and analysis
- [ ] No double-counting or duplicate events

### Reporting
- [ ] Experiment is visible in reporting
- [ ] Decision-making team has access
- [ ] Known limitations are documented

### Sign-off
- [ ] Engineering
- [ ] Testing & Personalization
- [ ] Product
`,
    references: ['qaTroubleshoot', 'bucketing', 'idePlugins'],
  },
  {
    id: 'readout',
    title: 'Experiment Readout Template',
    description:
      'Structured readout for the analysis phase. Use when presenting to Product, Engineering, Analytics, and Leadership.',
    filename: 'fx-readout-template.md',
    body: `# FX Experiment Readout

**Experiment:**
**Runtime:**
**Audience:**
**Owners:** Product, Engineering, Testing & Personalization, Analytics

---

## 1. Hypothesis & decision criteria
- Hypothesis:
- Primary KPI:
- Guardrails:
- Pre-registered decision criteria: (link to template)

## 2. Results
| Metric | Control | Variation | Lift | Significance |
|---|---:|---:|---:|---:|
| Primary KPI | | | | |
| Guardrail 1 | | | | |
| Guardrail 2 | | | | |

### Segment view
| Segment | Sample size | Lift | Significance |
|---|---:|---:|---:|
| | | | |

## 3. Interpretation
- Did the hypothesis hold?
- Were guardrails respected?
- Any segment-level signals worth noting?
- Were there data quality concerns?

## 4. Decision
☐ Scale  ☐ Segment  ☐ Iterate  ☐ Hold  ☐ Roll back  ☐ Release anyway  ☐ Do not scale

**Rationale:**

## 5. Next steps
- Engineering follow-up:
- Cleanup / flag removal owner:
- Roadmap implications:
- Documented learnings:
`,
    references: ['analyzeResults', 'statsEngine', 'impressionsDecisions'],
  },
];
