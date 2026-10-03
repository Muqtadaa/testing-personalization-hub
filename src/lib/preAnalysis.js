// Pure logic for the Experiment Pre-Analysis tool. Ported verbatim from the
// original standalone tool — the statistical math is unchanged. Only the
// user-facing wording is generalized (no checkout-specific framing).

// ---------- Statistical helpers ----------

// Inverse normal CDF — Acklam's rational approximation.
export function invNormalCDF(p) {
  if (p <= 0 || p >= 1) return NaN;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r, x;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  return x;
}

export function zForAlphaTwoTailed(alpha) {
  return invNormalCDF(1 - alpha / 2);
}

export function zForPower(power) {
  return invNormalCDF(power);
}

export function sampleSizeTwoProportion(p1, p2, alpha, power) {
  const zA = zForAlphaTwoTailed(alpha);
  const zB = zForPower(power);
  const numerator = Math.pow(zA + zB, 2) * (p1 * (1 - p1) + p2 * (1 - p2));
  const denominator = Math.pow(p2 - p1, 2);
  return Math.ceil(numerator / denominator);
}

// ---------- Formatting ----------

export function fmtNum(n) {
  if (!isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

export function fmtUSD(n, fractionDigits) {
  if (!isFinite(n)) return '—';
  const fd = fractionDigits === undefined ? 2 : fractionDigits;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fd,
    maximumFractionDigits: fd,
  });
}

export function fmtPct(n, digits) {
  if (!isFinite(n)) return '—';
  const d = digits === undefined ? 2 : digits;
  return n.toFixed(d) + '%';
}

export function fmtDays(d) {
  if (!isFinite(d) || d <= 0) return '—';
  if (d < 14) return Math.ceil(d) + ' days';
  const w = d / 7;
  if (w < 12) return w.toFixed(1) + ' weeks';
  const m = d / 30.4375;
  return m.toFixed(1) + ' months';
}

export function classify(weeks) {
  if (!isFinite(weeks) || weeks <= 0) return 'bad';
  if (weeks <= 4) return 'good';
  if (weeks <= 8) return 'warn';
  return 'bad';
}

// ---------- Constants & defaults ----------

export const DEFAULTS = {
  baselineRate: 10,
  weeklyTraffic: 100000,
  numVariations: 2,
  sigLevel: 0.95,
  power: 0.8,
  focValue: 640,
  kpiToFoc: 6,
};

export const DEFAULT_LIFTS = [0.5, 1, 2, 3];
export const SIG_OPTIONS = ['0.90', '0.95', '0.99'];
export const POWER_OPTIONS = ['0.80', '0.90', '0.95'];
export const STORAGE_KEY = 'epa.savedAnalyses';
// Kept identical to the original tool so exported JSON / share links remain
// cross-compatible with the standalone Pre-Analysis tool.
export const EXPORT_TOOL_ID = 'experiment-pre-analysis';
export const SHARE_PARAM = 's';

// ---------- Validation ----------

export function validate(inp, lifts) {
  const errors = [];
  if (!isFinite(inp.baselineRate) || inp.baselineRate <= 0 || inp.baselineRate >= 100) {
    errors.push('Baseline conversion rate must be between 0 and 100 (exclusive).');
  }
  if (!isFinite(inp.weeklyTraffic) || inp.weeklyTraffic <= 0) {
    errors.push('Weekly traffic must be a positive number.');
  }
  if (!isFinite(inp.numVariations) || inp.numVariations < 2 || inp.numVariations > 10) {
    errors.push('Number of variations must be between 2 and 10.');
  }
  if (lifts.length === 0) {
    errors.push('Add at least one lift scenario.');
  }
  lifts.forEach((lift, i) => {
    if (!isFinite(lift) || lift <= 0) {
      errors.push('Lift scenario #' + (i + 1) + ' must be > 0 percentage points.');
    } else if (inp.baselineRate + lift >= 100) {
      errors.push('Lift scenario #' + (i + 1) + ': baseline + lift cannot exceed 100%.');
    } else if (lift > 50) {
      errors.push('Lift scenario #' + (i + 1) + ' seems unrealistic (> 50 pp).');
    }
  });
  if (!isFinite(inp.focValue) || inp.focValue < 0) {
    errors.push('Downstream conversion value must be ≥ 0.');
  }
  if (!isFinite(inp.kpiToFoc) || inp.kpiToFoc <= 0 || inp.kpiToFoc > 100) {
    errors.push('KPI → conversion rate must be between 0 and 100 (exclusive of 0).');
  }
  return errors;
}

// ---------- Core calculation ----------

// Returns the full result set or { errors } when invalid. Summary is produced
// as renderable segments ({ text, bold }) so it can be shown with emphasis and
// copied as plain text without HTML round-tripping.
export function computeScenarios(inp, lifts) {
  const errors = validate(inp, lifts);
  if (errors.length > 0) return { errors };

  const p1 = inp.baselineRate / 100;
  const alpha = 1 - inp.sigLevel;
  const numComparisons = Math.max(1, inp.numVariations - 1);
  const alphaAdj = alpha / numComparisons;
  const power = inp.power;
  const zA = zForAlphaTwoTailed(alphaAdj);
  const zB = zForPower(power);
  const kpiValue = inp.focValue * (inp.kpiToFoc / 100);
  const trafficPerArmWeek = inp.weeklyTraffic / inp.numVariations;
  const eligibleAnnual = inp.weeklyTraffic * 52;

  const sortedLifts = [...lifts].sort((a, b) => a - b);

  const scenarios = sortedLifts.map((lift) => {
    const p2 = (inp.baselineRate + lift) / 100;
    const nPerArm = sampleSizeTwoProportion(p1, p2, alphaAdj, power);
    const totalN = nPerArm * inp.numVariations;
    const weeksToSig = nPerArm / trafficPerArmWeek;
    const daysToSig = weeksToSig * 7;
    const controlRpu = p1 * kpiValue;
    const variantRpu = p2 * kpiValue;
    const incRpu = variantRpu - controlRpu;
    const scaledWeekly = incRpu * inp.weeklyTraffic;
    const scaledAnnual = incRpu * eligibleAnnual;
    const cls = classify(weeksToSig);
    return {
      lift,
      targetRate: inp.baselineRate + lift,
      relLift: (lift / inp.baselineRate) * 100,
      nPerArm,
      totalN,
      weeksToSig,
      daysToSig,
      controlRpu,
      variantRpu,
      incRpu,
      scaledWeekly,
      scaledAnnual,
      cls,
    };
  });

  const goodCount = scenarios.filter((s) => s.cls === 'good').length;
  const warnCount = scenarios.filter((s) => s.cls === 'warn').length;
  const badCount = scenarios.filter((s) => s.cls === 'bad').length;
  const minFeasible = scenarios.find((s) => s.cls === 'good');
  const minViable = scenarios.find((s) => s.cls !== 'bad');

  const seg = [];
  const t = (text) => seg.push({ text });
  const b = (text) => seg.push({ text, bold: true });

  if (goodCount === scenarios.length) {
    b(`All ${scenarios.length} scenarios are feasible within 4 weeks.`);
    t(` Even the smallest lift (+${scenarios[0].lift.toFixed(2)} pp) resolves in about ${fmtDays(scenarios[0].daysToSig)}. You have headroom — consider testing for a more conservative effect or adding arms.`);
  } else if (badCount === scenarios.length) {
    b('None of the ' + scenarios.length + ' scenarios are feasible');
    t(' within an 8-week window at the current traffic and statistical parameters. Increase weekly traffic, target a larger effect, drop arms, or lower power to make the test viable.');
  } else {
    b(`${goodCount} of ${scenarios.length}`);
    t(' scenarios feasible (≤4 weeks)');
    if (warnCount > 0) {
      t(', ');
      b(String(warnCount));
      t(' slow (4–8 weeks)');
    }
    if (badCount > 0) {
      t(', ');
      b(String(badCount));
      t(' infeasible (>8 weeks)');
    }
    t('.');
    if (minFeasible) {
      t(' The smallest comfortably feasible lift is ');
      b(`+${minFeasible.lift.toFixed(2)} pp`);
      t(` (~${fmtDays(minFeasible.daysToSig)}).`);
    } else if (minViable) {
      t(' The smallest detectable lift inside an 8-week window is ');
      b(`+${minViable.lift.toFixed(2)} pp`);
      t(` (~${fmtDays(minViable.daysToSig)}).`);
    }
  }

  return {
    inputs: inp,
    lifts: sortedLifts,
    scenarios,
    alpha,
    alphaAdj,
    numComparisons,
    power,
    zA,
    zB,
    kpiValue,
    trafficPerArmWeek,
    eligibleAnnual,
    summarySegments: seg,
    summaryText: seg.map((s) => s.text).join(''),
  };
}

// ---------- State (defaults, normalize, share encoding) ----------

function num(v, fallback) {
  const n = parseFloat(v);
  return isFinite(n) ? n : fallback;
}

export function defaultState() {
  return { ...DEFAULTS, lifts: [...DEFAULT_LIFTS] };
}

// Coerce an arbitrary parsed object (saved record, imported JSON, share link)
// into a valid state, mirroring the original applyState() guards.
export function normalizeState(s) {
  if (!s || typeof s !== 'object') return defaultState();
  const sig = Number(s.sigLevel).toFixed(2);
  const pow = Number(s.power).toFixed(2);
  const lifts = Array.isArray(s.lifts)
    ? s.lifts.map(Number).filter((v) => isFinite(v))
    : [];
  return {
    baselineRate: num(s.baselineRate, DEFAULTS.baselineRate),
    weeklyTraffic: num(s.weeklyTraffic, DEFAULTS.weeklyTraffic),
    numVariations: Math.round(num(s.numVariations, DEFAULTS.numVariations)),
    sigLevel: SIG_OPTIONS.indexOf(sig) >= 0 ? Number(sig) : DEFAULTS.sigLevel,
    power: POWER_OPTIONS.indexOf(pow) >= 0 ? Number(pow) : DEFAULTS.power,
    focValue: num(s.focValue, DEFAULTS.focValue),
    kpiToFoc: num(s.kpiToFoc, DEFAULTS.kpiToFoc),
    lifts: lifts.length ? lifts : [...DEFAULT_LIFTS],
  };
}

export function encodeState(s) {
  return btoa(JSON.stringify(s));
}

export function decodeState(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    return null;
  }
}

export function buildSummaryText(result) {
  const { inputs: inp } = result;
  const lines = [
    'EXPERIMENT PRE-ANALYSIS',
    '',
    'Shared assumptions',
    '  Baseline KPI rate: ' + fmtPct(inp.baselineRate, 2),
    '  Weekly traffic (total): ' + fmtNum(inp.weeklyTraffic),
    '  Variations (incl. control): ' + inp.numVariations,
    '  Significance: ' + (inp.sigLevel * 100).toFixed(0) + '%  ·  Power: ' + (inp.power * 100).toFixed(0) + '%',
    '  Bonferroni-adjusted α per comparison: ' + result.alphaAdj.toFixed(4),
    '  Downstream conversion value: ' + fmtUSD(inp.focValue, 0) + '  ·  KPI→conversion: ' + fmtPct(inp.kpiToFoc, 1),
    '  Implied KPI value: ' + fmtUSD(result.kpiValue),
    '  Traffic per arm / week: ' + fmtNum(result.trafficPerArmWeek),
    '',
    'Lift scenario comparison',
    '  ' + ['Lift', 'Target', 'n/arm', 'Total n', 'Time to sig', 'Δ RPU', 'Annual Δ rev', 'Verdict'].join(' | '),
    ...result.scenarios.map((s) => '  ' + [
      '+' + s.lift.toFixed(2) + ' pp',
      fmtPct(s.targetRate, 2),
      fmtNum(s.nPerArm),
      fmtNum(s.totalN),
      fmtDays(s.daysToSig) + ' (' + s.weeksToSig.toFixed(1) + ' wk)',
      fmtUSD(s.incRpu, 3),
      fmtUSD(s.scaledAnnual, 0),
      s.cls === 'good' ? 'Feasible' : s.cls === 'warn' ? 'Slow' : 'Not feasible',
    ].join(' | ')),
    '',
    'Summary: ' + result.summaryText,
    '',
    'Note: directional planning estimates. Validate with Analytics / Experimentation SMEs.',
  ];
  return lines.join('\n');
}
