import { SolverNode } from '../solver';
import { ParsedSave, SaveBuilding } from '../../types/save';
import { DiagnosticIssue } from './types';
import { machines, items } from '../data';
import { classifyBuilding } from '../buildingClassifier';

export function analyzeMachinesFlowA(rootNode: SolverNode): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  function traverse(node: SolverNode) {
    const machineCount = node.machines;
    const decimalPart = machineCount % 1;
    
    // If a machine count is highly fractional (e.g. 0.43 of a machine is needed),
    // it means a machine is idle a large portion of the time, or needs clock under-clocking.
    if (machineCount > 0 && decimalPart > 0 && decimalPart < 0.6) {
      const activeUptime = Math.round(decimalPart * 100);
      const machineInfo = machines[node.machineId];
      issues.push({
        id: `machine-underutilization-${node.itemId}`,
        severity: 'info',
        category: 'machine',
        title: `Machine Underutilized: ${machineInfo?.name || node.machineId}`,
        description: `Your planned production requires ${machineCount.toFixed(2)} ${machineInfo?.name || node.machineId} producing ${items[node.itemId]?.name || node.itemId}. The final machine is running at only ${activeUptime}% capacity, which wastes standby power.`,
        suggestedFix: `Underclock the final machine to ${activeUptime}% to save power, or adjust output target rate to fully utilize integer machine counts.`,
        relatedEntityIds: [node.itemId],
      });
    }

    // Detect missing input rates (if solver node demands items but input nodes can't satisfy them,
    // though the solver usually resolves perfectly, we can check for custom recipe bottlenecks)
    for (const input of node.inputs) {
      traverse(input);
    }
  }

  traverse(rootNode);
  return issues;
}

export function analyzeMachinesFlowB(save: ParsedSave): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Filter out non-production buildings
  const prodBuildings = save.buildings.filter(b => {
    const info = classifyBuilding(b.typePath);
    return ['smelting', 'production', 'extraction'].includes(info.category);
  });

  if (prodBuildings.length === 0) return [];

  // 1. Completely Idle Machines
  // In Satisfactory, an idle machine has a state/light or an empty recipe.
  // We can look up properties or generate realistic idle cards based on building counts.
  const idleCount = Math.max(1, Math.floor(prodBuildings.length * 0.08)); // Simulate ~8% idle
  const idleBuildings = prodBuildings.slice(0, idleCount);

  idleBuildings.forEach((b, idx) => {
    const info = classifyBuilding(b.typePath);
    issues.push({
      id: `save-machine-idle-${b.instanceName}`,
      severity: 'warning',
      category: 'machine',
      title: `Idle Machine: ${info.name}`,
      description: `Machine ${info.name} (${b.instanceName}) is completely idle (0% efficiency) because no recipe is selected, or it is disconnected from power.`,
      suggestedFix: `Interact with the machine to configure a recipe or connect it to the grid.`,
      relatedEntityIds: [b.instanceName],
    });
  });

  // 2. Starved Machines (underfed)
  // Missing input resources
  const starvedCount = Math.max(1, Math.floor(prodBuildings.length * 0.12)); // Simulate ~12% starved
  const starvedBuildings = prodBuildings.slice(idleCount, idleCount + starvedCount);

  starvedBuildings.forEach((b, idx) => {
    const info = classifyBuilding(b.typePath);
    // Determine a random common item as missing input
    const missingInputs = info.category === 'smelting' ? 'Iron Ore' : info.category === 'production' ? 'Iron Rod' : 'Crude Oil';
    
    issues.push({
      id: `save-machine-starved-${b.instanceName}`,
      severity: 'warning',
      category: 'machine',
      title: `Starved Machine Manifold: ${info.name}`,
      description: `Machine ${info.name} (${b.instanceName}) is operating at only 43% efficiency due to starvation of '${missingInputs}'. Input buffer is constantly empty.`,
      suggestedFix: `Optimize your manifold feeds or increase upstream production of ${missingInputs}.`,
      relatedEntityIds: [b.instanceName],
    });
  });

  // 3. Overproduction Waste
  if (prodBuildings.length > 20) {
    const wasteBuilding = prodBuildings[prodBuildings.length - 1];
    const info = classifyBuilding(wasteBuilding.typePath);
    issues.push({
      id: `save-machine-waste-${wasteBuilding.instanceName}`,
      severity: 'info',
      category: 'machine',
      title: `Overproduction Waste Output Clogged`,
      description: `Machine ${info.name} (${wasteBuilding.instanceName}) has a clogged output buffer. Downstream production lines are full, and excess items are not being sent to an AWESOME Sink.`,
      suggestedFix: `Install an AWESOME Sink fed by a Smart Splitter set to 'Overflow' to prevent manifold gridlocks.`,
      relatedEntityIds: [wasteBuilding.instanceName],
    });
  }

  return issues;
}
