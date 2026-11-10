/* Throwaway runtime smoke test for local-engine/ — deleted after use. */
import { stageRoom } from './local-engine/staging';
import { balanceLighting } from './local-engine/lighting';
import { valueEngineer } from './local-engine/valueEngineer';
import { computeClearanceConflicts, autoSnapClearance } from './local-engine/clearance';
import { CATALOG_ITEMS } from './src/data/mockData';

const dims = { lengthFt: 18, widthFt: 14, ceilingHeightFt: 10, unit: 'ft' as const };

// sweep room types + edge cases
for (const rt of ['Living Room', 'Primary Bedroom', 'Dining Room', 'Home Office']) {
  const t = Date.now();
  const p = stageRoom({ roomType: rt, dimensions: dims, budgetCap: 2500 });
  console.log(
    `SWEEP ${rt}: score=${p.fitScore} pieces=${p.placements.length} skipped=${p.skipped.length} (${Date.now() - t}ms)`
  );
}
// tiny room forces solver drop-retry path
try {
  const tiny = stageRoom({ roomType: 'Living Room', dimensions: { lengthFt: 8, widthFt: 6 }, budgetCap: 5000 });
  console.log(`SWEEP tiny 8x6: score=${tiny.fitScore} pieces=${tiny.placements.length} skipped=${tiny.skipped.map((s) => s.name).join(',')}`);
} catch (e) {
  console.log('SWEEP tiny threw:', (e as Error).message);
}

const t0 = Date.now();
const plan = stageRoom({ roomType: 'Living Room', dimensions: dims, budgetCap: 2500, stylePreference: 'Japandi Warm' });
console.log(`STAGE (${Date.now() - t0}ms) fitScore=${plan.fitScore}`);
for (const p of plan.placements) {
  console.log(`  ${p.name} @ (${p.position.x},${p.position.y}) rot=${p.rotation} $${p.price} [${p.id}]`);
}
console.log('STAGE skipped:', plan.skipped.map((s) => `${s.name} — ${s.reason}`).join(' | ') || '(none)');
console.log('STAGE notes:', plan.solverNotes.slice(0, 6));

const res = computeClearanceConflicts(dims, plan.placements, 36);
console.log(`CLEARANCE score=${res.score} violations=${res.violations.length}`);
for (const [id, e] of Object.entries(res.conflicts)) console.log(`  ${id}: [${e.kind}] ${e.message}`);

const bad = Object.entries(res.conflicts).find(([, v]) => v.conflict);
if (bad) {
  const snapped = autoSnapClearance(dims, plan.placements, bad[0], 36);
  console.log(`AUTOSNAP ${bad[0]} ->`, snapped ? `(${snapped.position.x},${snapped.position.y})` : 'null');
} else {
  // force a conflict: drop the sofa on top of the table
  const sofa = plan.placements.find((p) => p.modelType === 'sofa')!;
  const table = plan.placements.find((p) => p.modelType === 'table');
  if (table) {
    const squished = plan.placements.map((p) =>
      p.id === table.id ? { ...p, position: { ...sofa.position } } : p
    );
    const r2 = computeClearanceConflicts(dims, squished, 36, { circulation: false });
    const badId = Object.entries(r2.conflicts).find(([, v]) => v.conflict)?.[0];
    console.log('FORCED conflict:', badId ?? '(none)', r2.conflicts[table.id]?.message);
    if (badId) {
      const snapped = autoSnapClearance(dims, squished, badId, 36);
      console.log(`AUTOSNAP ${badId} ->`, snapped ? `(${snapped.position.x},${snapped.position.y})` : 'null');
    }
  }
}

const lb = balanceLighting({
  timeOfDay: '21:30',
  targetLumens: 3800,
  currentFixtures: [
    { name: 'Architectural Linear Cove', lumens: 1200, cct: '2700K' },
    { name: 'Flos Style Brass Arc', lumens: 800, cct: '3000K' },
    { name: 'Flush Gimbal Cans (3x)', lumens: 600, cct: '4000K' },
  ],
  roomSqFt: 252,
});
console.log('LIGHTING', lb.adjustedTargetLumens, lb.circadianScore, lb.circadianStatus, '|', lb.actionSummary);

const ve = valueEngineer({
  items: plan.placements.map((p) => ({
    id: p.catalogId,
    name: p.name,
    category: p.category,
    modelType: p.modelType,
    price: p.price,
    dimensions: { lengthIn: p.dimensions.lengthIn, widthIn: p.dimensions.widthIn },
    leadTime: CATALOG_ITEMS.find((c) => c.id === p.catalogId)?.leadTime,
  })),
  currentTotal: plan.placements.reduce((a, p) => a + p.price, 0),
  budgetCap: 2500,
  catalog: CATALOG_ITEMS,
});
console.log('VE top:', ve.activeAlternative, '| saves', ve.savingsAmount, '| lead', ve.leadTimeAdvantage);
for (const a of ve.alternatives) console.log(`  ${a.current} -> ${a.alternative} ($${a.savings}) ${a.note}`);
console.log('SMOKE OK');
