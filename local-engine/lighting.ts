/**
 * Local luminaire auto-balance for DrawMyRoom.
 *
 * Deterministic photometric + circadian computation — no cloud AI. Distributes
 * the total lumen budget across the active fixtures for the time of day,
 * grades circadian compliance from fixture CCT vs. the diurnal cycle, and
 * estimates melanopic suppression for the evening wind-down threshold.
 */

export interface LuminaireLike {
  name: string;
  lumens: number;
  cct?: string;
  type?: string;
  status?: string;
}

export interface OptimizedFixture {
  name: string;
  adjustedLumens: number;
  dimLevel: string;
}

export interface LightingBalance {
  adjustedTargetLumens: number;
  circadianScore: number;
  circadianStatus: string;
  melanopicSuppressionLux: string;
  cctRecommendation: string;
  actionSummary: string;
  optimizedFixtures: OptimizedFixture[];
}

/** Parse a CCT string like "2700K" or "4000 Kelvin" -> kelvin (0 if unknown). */
function parseCct(cct?: string): number {
  if (!cct) return 0;
  const m = cct.match(/(\d{3,5})/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Bell-curve daylight availability between 06:00 and 20:00, 0..1. */
function daylightFactor(minutes: number): number {
  const h = minutes / 60;
  if (h <= 6 || h >= 20) return 0;
  return Math.sin((Math.PI * (h - 6)) / 14);
}

export function balanceLighting(input: {
  timeOfDay?: string;
  targetLumens?: number;
  currentFixtures?: LuminaireLike[];
  roomSqFt?: number;
}): LightingBalance {
  const [hh, mm] = (input.timeOfDay || '16:45').split(':');
  const minutes = (parseInt(hh, 10) || 0) * 60 + (parseInt(mm, 10) || 0);
  const targetLumens = input.targetLumens ?? 3800;
  const fixtures = (input.currentFixtures ?? []).filter((f) => f && f.name);
  const roomSqFt = Math.max(1, input.roomSqFt ?? 252);

  const day = daylightFactor(minutes);
  const evening = minutes >= 19 * 60 || minutes < 6 * 60;

  // Daylight carries part of the load; at night the fixtures must cover it all.
  const adjustedTarget = Math.round(targetLumens * (1 - 0.42 * day));

  // Distribute the adjusted budget across fixtures proportional to rating.
  const rated = fixtures.map((f) => Math.max(100, f.lumens || 800));
  const ratedTotal = rated.reduce((a, b) => a + b, 0) || 1;
  const optimizedFixtures: OptimizedFixture[] = fixtures.map((f, i) => {
    const share = rated[i] / ratedTotal;
    const adjusted = Math.max(50, Math.round(share * adjustedTarget));
    const pct = Math.round((adjusted / rated[i]) * 100);
    return {
      name: f.name,
      adjustedLumens: adjusted,
      dimLevel: `${Math.min(100, Math.max(5, pct))}%`,
    };
  });

  // Circadian grading: cool CCT after 19:00 suppresses melatonin.
  let score = evening ? 97 : 94;
  if (evening) {
    const coolCount = fixtures.filter((f) => parseCct(f.cct) >= 4000).length;
    score -= coolCount * 7;
  } else if (day > 0.25) {
    const warmCount = fixtures.filter((f) => {
      const k = parseCct(f.cct);
      return k > 0 && k < 3000;
    }).length;
    score -= warmCount * 3;
  } else {
    score -= 2; // dusk transition
  }
  score = Math.max(40, Math.min(99, score));

  // Average illuminance and melanopic-weighted estimate.
  const avgLux = (adjustedTarget / roomSqFt) * 10.764; // lm/ft² -> lux
  const kelvins = fixtures.map((f) => parseCct(f.cct)).filter((k) => k > 0);
  const meanK = kelvins.length > 0 ? kelvins.reduce((a, b) => a + b, 0) / kelvins.length : 3000;
  const melanopicRatio = Math.max(0.35, Math.min(0.65, 0.35 + ((meanK - 2700) / 1300) * 0.23));
  const melanopicLux = avgLux * melanopicRatio;
  const melanopicSuppressionLux = `${melanopicLux.toFixed(0)} lx (${
    evening && melanopicLux < 65 ? 'Safe under 65 lx threshold' : 'above the 65 lx evening wind-down threshold — warm-dim advised'
  })`;

  const cctRecommendation = evening
    ? '2700K Warm Dim'
    : minutes < 8 * 60
    ? '3000K Soft Neutral'
    : '4000K Neutral Crisp';

  const circadianStatus = score >= 90 ? (evening ? 'Evening Compliant' : 'Daylight Optimized') : 'Circadian Attention Needed';

  const daylightShare = Math.round(day * 100);
  const actionSummary = `Rebalanced ${optimizedFixtures.length} luminaire${
    optimizedFixtures.length === 1 ? '' : 's'
  } to ${adjustedTarget.toLocaleString()} lm (${daylightShare}% of the target supplied by daylight at ${input.timeOfDay || '16:45'}); ${
    evening
      ? `melanopic load held at ${melanopicLux.toFixed(0)} lx with warm-dim CCT to protect melatonin release`
      : `task-zone illuminance sustained at ${avgLux.toFixed(0)} lx average with neutral CCT for alertness`
  }.`;

  return {
    adjustedTargetLumens: adjustedTarget,
    circadianScore: score,
    circadianStatus,
    melanopicSuppressionLux,
    cctRecommendation,
    actionSummary,
    optimizedFixtures,
  };
}
