import { solve, calculateSummary } from './src/engine/solver.js';

// Solve for Stator: 10 and Reinforced Iron Plate: 10
const targets = {
  stator: 10,
  reinforced_iron_plate: 10
};

const solvedRoot = solve(targets, undefined, 'miner_mk3', {});
const summary = calculateSummary(solvedRoot);

console.log("Calculated Total Power:", summary.totalPower, "MW");
console.log("Ceil Power:", Math.ceil(summary.totalPower), "MW");
console.log("Machine Counts:", summary.machineCounts);
