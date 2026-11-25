import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from '../src/engine/data';
import {
  getEffectiveInputRate,
  getMachinePowerMW,
  hasActiveWorldSettings,
  normalizeMultiplier,
} from '../src/engine/worldSettings';
import { calculateSummary, solve } from '../src/engine/solver';
import { mapSolverResultToGraph } from '../src/engine/graphMapper';

function findRecipe(id: string) {
  const rec = recipes.find((r) => r.id === id);
  assert.ok(rec, `Expected recipe ${id} to exist`);
  return rec;
}

test('Satisfactory 1.2 solid integer rounding with floor of 1 on Iron Ingot (1 -> 1)', () => {
  const ironIngot = findRecipe('recipe_iron_ingot');
  const oreInput = ironIngot.inputs[0];
  assert.equal(ironIngot.cycleTime, 2);
  assert.equal(oreInput.amount, 1);

  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 0.25), 30);
  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 0.5), 30);
  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 0.75), 30);
  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 1), 30);
  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 1.25), 30);
  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 1.5), 60);
  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 1.75), 60);
  assert.equal(getEffectiveInputRate(oreInput, ironIngot.cycleTime, 2), 60);
});

test('Satisfactory 1.2 integer rounding on multi-unit recipes (Iron Plate & Reinforced Iron Plate)', () => {
  const ironPlate = findRecipe('recipe_iron_plate');
  // 3 Iron Ingots / 6s = 30/min; at 1.25x -> round(3.75) = 4 -> 40/min
  assert.equal(getEffectiveInputRate(ironPlate.inputs[0], ironPlate.cycleTime, 1.25), 40);

  const rip = findRecipe('recipe_reinforced_iron_plate');
  const platesIn = rip.inputs.find((i) => i.itemId === 'iron_plate')!;
  const screwsIn = rip.inputs.find((i) => i.itemId === 'screw')!;
  // 6 plates, 12 screws / 12s -> at 1.25x: round(7.5)=8 (40/m), round(15)=15 (75/m)
  assert.equal(getEffectiveInputRate(platesIn, rip.cycleTime, 1.25), 40);
  assert.equal(getEffectiveInputRate(screwsIn, rip.cycleTime, 1.25), 75);
});

test('Fluids scale continuously while byproducts remain 1x', () => {
  const solvedLow = solve({ rubber: 20 }, undefined, 'miner_mk1', {}, 'mk1', 'mk1', 100, 100, 1, {}, false, {}, 0.25);
  const summaryLow = calculateSummary(solvedLow);
  assert.equal(summaryLow.rawInputs.crude_oil, 7.5);
  assert.equal(summaryLow.producedItems.heavy_oil_residue, 20);

  const solved175 = solve({ rubber: 20 }, undefined, 'miner_mk1', {}, 'mk1', 'mk1', 100, 100, 1, {}, false, {}, 1.75);
  const summary175 = calculateSummary(solved175);
  assert.equal(summary175.rawInputs.crude_oil, 52.5);
  assert.equal(summary175.producedItems.heavy_oil_residue, 20);
});

test('Power multiplier applies consistently across summary, graph nodes, and tooltips', () => {
  const root1x = solve(
    { reinforced_iron_plate: 10 },
    undefined,
    'miner_mk1',
    {},
    'mk1',
    'mk1',
    100,
    100,
    1,
    {},
    false,
    {},
    1.5,
    'normal',
    1
  );
  const root2x = solve(
    { reinforced_iron_plate: 10 },
    undefined,
    'miner_mk1',
    {},
    'mk1',
    'mk1',
    100,
    100,
    1,
    {},
    false,
    {},
    1.5,
    'normal',
    2
  );

  const sum1x = calculateSummary(root1x, 1);
  const sum2x = calculateSummary(root2x, 2);
  assert.ok(Math.abs(sum2x.totalPower - sum1x.totalPower * 2) < 1e-6);

  const { nodes, edges } = mapSolverResultToGraph(root2x, 'aggregated', 'mk1', 'mk1', 2, 1.5);
  const machineNodes = nodes.filter(
    (n) =>
      n.data.machineId !== 'product_output' &&
      n.data.machineId !== 'planned_outputs' &&
      n.data.machineId !== 'supplied_input' &&
      n.data.machineId !== 'raw_input'
  );
  const graphTotalPower = machineNodes.reduce(
    (acc, n) => acc + Number(n.data.powerPerMachine || 0) * Number(n.data.machines || 0),
    0
  );
  assert.ok(Math.abs(graphTotalPower - sum2x.totalPower) < 1e-6);

  // Verify aggregated graph leaf node rate matches summary.rawInputs (no multi-branch double-counting)
  const ironOreNode = machineNodes.find((n) => n.data.itemId === 'iron_ore');
  assert.ok(ironOreNode);
  assert.ok(Math.abs(Number(ironOreNode.data.rate) - sum2x.rawInputs.iron_ore) < 1e-3);

  // Verify MachineNode tooltip inputDetails match solver edge flow rate for Reinforced Iron Plate
  const ripNode = machineNodes.find((n) => n.data.itemId === 'reinforced_iron_plate');
  assert.ok(ripNode);
  const inputDetails = ripNode.data.inputDetails as Array<{ itemId: string; ratePerMachine: number }>;
  const plateDetail = inputDetails.find((d) => d.itemId === 'iron_plate')!;
  const ripMachines = Number(ripNode.data.machines);
  const plateEdge = edges.find((e) => e.target === ripNode.id && e.source === machineNodes.find((m) => m.data.itemId === 'iron_plate')?.id);
  assert.ok(plateEdge);
  assert.ok(Math.abs(plateDetail.ratePerMachine * ripMachines - Number(plateEdge.data?.rate)) < 1e-3);
});

test('Default node purity scales miner counts when no per-machine override is set', () => {
  const rootNormal = solve('iron_ore', 120, 'miner_mk1', {}, 'mk1', 'mk1', 100, 100, 1, {}, false, {}, 1, 'normal', 1);
  const rootPure = solve('iron_ore', 120, 'miner_mk1', {}, 'mk1', 'mk1', 100, 100, 1, {}, false, {}, 1, 'pure', 1);

  assert.equal(rootNormal.machines, 2);
  assert.equal(rootPure.machines, 1);
  assert.equal(rootPure.purity, 'pure');
});

test('World Settings helpers validate and detect active settings cleanly', () => {
  assert.equal(normalizeMultiplier(NaN, 1), 1);
  assert.equal(normalizeMultiplier(-5, 1), 1);
  assert.equal(normalizeMultiplier(0.01, 1), 0.1);
  assert.equal(normalizeMultiplier(250, 1), 100);
  assert.equal(getMachinePowerMW(15, 100, false, 5), 75);
  assert.equal(hasActiveWorldSettings({ recipeCostMultiplier: 1, powerMultiplier: 1, defaultNodePurity: 'normal' }), false);
  assert.equal(hasActiveWorldSettings({ recipeCostMultiplier: 1.25, powerMultiplier: 1, defaultNodePurity: 'normal' }), true);
  assert.equal(hasActiveWorldSettings({ recipeCostMultiplier: 1, powerMultiplier: 2, defaultNodePurity: 'normal' }), true);
  assert.equal(hasActiveWorldSettings({ recipeCostMultiplier: 1, powerMultiplier: 1, defaultNodePurity: 'pure' }), true);
});
