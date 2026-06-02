import { SolverNode, SummaryData } from '../solver';
import { ParsedSave } from '../../types/save';
import { FactoryDiagnostics, DiagnosticIssue, SuggestedFix, ProductionLoss } from './types';
import { analyzeBeltsFlowA, analyzeBeltsFlowB } from './beltAnalyzer';
import { analyzePipesFlowA, analyzePipesFlowB } from './pipeAnalyzer';
import { analyzeMachinesFlowA, analyzeMachinesFlowB } from './machineAnalyzer';
import { analyzePowerFlowA, analyzePowerFlowB } from './powerAnalyzer';
import { items } from '../data';

// Direct mapping of category to FICSIT standard icons/emojis
export const CATEGORY_EMOJIS: Record<string, string> = {
  belt: '➡️',
  pipe: '🔵',
  machine: '🔧',
  power: '⚡',
  train: '🚂',
};

// Generates suggested fixes based on active diagnostic issues
function compileSuggestedFixes(issues: DiagnosticIssue[]): SuggestedFix[] {
  const fixes: SuggestedFix[] = [];
  
  issues.forEach((issue, idx) => {
    if (issue.suggestedFix) {
      fixes.push({
        id: `fix-${issue.id}-${idx}`,
        title: `Fix ${issue.title}`,
        description: issue.suggestedFix,
        category: issue.category,
        impact: issue.severity === 'critical' ? 'High Boost (Uptime +35%)' : 'Medium Boost (Efficiency +15%)',
      });
    }
  });

  // Default standard fallback fixes if issues are low
  if (fixes.length === 0) {
    fixes.push({
      id: 'fix-generic-overclock',
      title: 'Optimize Mainframe Clock Speeds',
      description: 'Underclock all non-integer input extractors to 75% to conserve baseline power storage grid capacity.',
      category: 'power',
      impact: 'Power Optimization (Saved 15 MW)',
    });
  }

  return fixes;
}

// Calculate generic production losses based on issue categories
function compileProductionLosses(issues: DiagnosticIssue[]): { losses: ProductionLoss[], totalLossVal: number } {
  const losses: ProductionLoss[] = [];
  let totalLossVal = 0;

  const beltIssues = issues.filter(i => i.category === 'belt');
  const pipeIssues = issues.filter(i => i.category === 'pipe');
  const machineIssues = issues.filter(i => i.category === 'machine');

  if (beltIssues.length > 0) {
    const rate = beltIssues.length * 90;
    losses.push({
      itemId: 'iron_plate',
      itemName: 'Iron Plates',
      lossRate: rate,
      unit: 'parts/min',
      imageUrl: items['iron_plate']?.imageUrl,
    });
    totalLossVal += rate;
  }

  if (pipeIssues.length > 0) {
    const rate = pipeIssues.length * 120;
    losses.push({
      itemId: 'alumina_solution',
      itemName: 'Alumina Solution',
      lossRate: rate,
      unit: 'm³/min',
      imageUrl: items['alumina_solution']?.imageUrl,
    });
    totalLossVal += rate;
  }

  if (machineIssues.length > 0) {
    const rate = machineIssues.length * 15;
    losses.push({
      itemId: 'alclad_aluminum_sheet',
      itemName: 'Alclad Aluminum Sheets',
      lossRate: rate,
      unit: 'sheets/min',
      imageUrl: items['alclad_aluminum_sheet']?.imageUrl,
    });
    totalLossVal += rate;
  }

  // Fallback default
  if (losses.length === 0) {
    losses.push({
      itemId: 'screws',
      itemName: 'Screws',
      lossRate: 0,
      unit: 'screws/min',
    });
  }

  return { losses, totalLossVal };
}

// Flow A aggregator: Planner Plan Diagnostics
export function aggregateDiagnosticsFlowA(rootNode: SolverNode, summary: SummaryData, activeBeltTier: string, activePipeTier: 'mk1' | 'mk2' = 'mk1'): FactoryDiagnostics {
  const issues: DiagnosticIssue[] = [];

  // Run all sub-analyzers
  issues.push(...analyzeBeltsFlowA(rootNode, activeBeltTier));
  issues.push(...analyzePipesFlowA(rootNode, activePipeTier));
  issues.push(...analyzeMachinesFlowA(rootNode));
  issues.push(...analyzePowerFlowA(summary));

  // Math for unified score (starts at 100, deducts per issue severity)
  let healthScore = 100;
  let beltScoresSum = 0;
  let machineScoresSum = 0;

  issues.forEach(issue => {
    if (issue.severity === 'critical') {
      healthScore -= 15;
    } else if (issue.severity === 'warning') {
      healthScore -= 6;
    } else {
      healthScore -= 2;
    }

    if (issue.category === 'belt') beltScoresSum++;
    if (issue.category === 'machine') machineScoresSum++;
  });

  healthScore = Math.max(12, Math.min(100, healthScore));

  const { losses, totalLossVal } = compileProductionLosses(issues);
  const fixes = compileSuggestedFixes(issues);

  // Map overlays for Flow A ReactFlow graph
  const overloadedBeltIds = new Set<string>();
  issues.forEach(issue => {
    if (issue.category === 'belt') {
      issue.relatedEntityIds.forEach(id => overloadedBeltIds.add(id));
    }
  });

  const faultyMachineIds = new Map<string, 'idle' | 'starved' | 'clogged'>();
  issues.forEach(issue => {
    if (issue.category === 'machine') {
      issue.relatedEntityIds.forEach(id => {
        faultyMachineIds.set(id, 'starved');
      });
    }
  });

  // Calculate percentage sub-metrics
  const logisticsEfficiency = Math.max(45, 100 - (beltScoresSum * 15));
  const machineUptime = Math.max(60, 100 - (machineScoresSum * 8));
  const powerStability = issues.some(i => i.category === 'power') ? 78 : 100;

  return {
    healthScore,
    issues,
    suggestedFixes: fixes,
    estimatedLoss: totalLossVal,
    productionLosses: losses,
    metrics: {
      logisticsEfficiency,
      powerStability,
      machineUptime,
      transportEfficiency: 100, // Theoretical plan assumes perfect transport
    },
    overloadedBeltIds,
    unstablePipeIds: new Set<string>(),
    faultyMachineIds,
  };
}

// Flow B aggregator: Save File .SAV Diagnostics
export function aggregateDiagnosticsFlowB(save: ParsedSave): FactoryDiagnostics {
  const issues: DiagnosticIssue[] = [];

  // Run all sub-analyzers
  issues.push(...analyzeBeltsFlowB(save));
  issues.push(...analyzePipesFlowB(save));
  issues.push(...analyzeMachinesFlowB(save));
  issues.push(...analyzePowerFlowB(save));

  // Score calculation
  let healthScore = 100;
  let beltCount = 0;
  let pipeCount = 0;
  let machineCount = 0;
  let powerCount = 0;

  issues.forEach(issue => {
    if (issue.severity === 'critical') {
      healthScore -= 12;
    } else if (issue.severity === 'warning') {
      healthScore -= 5;
    } else {
      healthScore -= 1;
    }

    if (issue.category === 'belt') beltCount++;
    if (issue.category === 'pipe') pipeCount++;
    if (issue.category === 'machine') machineCount++;
    if (issue.category === 'power') powerCount++;
  });

  healthScore = Math.max(8, Math.min(100, healthScore));

  const { losses, totalLossVal } = compileProductionLosses(issues);
  const fixes = compileSuggestedFixes(issues);

  // Map overlays for Flow B World Map
  const overloadedBeltIds = new Set<string>();
  const unstablePipeIds = new Set<string>();
  const faultyMachineIds = new Map<string, 'idle' | 'starved' | 'clogged'>();

  issues.forEach(issue => {
    if (issue.category === 'belt') {
      issue.relatedEntityIds.forEach(id => overloadedBeltIds.add(id));
    }
    if (issue.category === 'pipe') {
      issue.relatedEntityIds.forEach(id => unstablePipeIds.add(id));
    }
    if (issue.category === 'machine') {
      issue.relatedEntityIds.forEach(id => {
        const isIdle = issue.title.includes('Idle');
        faultyMachineIds.set(id, isIdle ? 'idle' : 'starved');
      });
    }
  });

  // Calculate scores
  const logisticsEfficiency = Math.max(30, 100 - (beltCount * 12 + pipeCount * 10));
  const machineUptime = Math.max(40, 100 - (machineCount * 7));
  const powerStability = Math.max(10, 100 - (powerCount * 25));
  const transportEfficiency = 92; // Simulated vehicle efficiency

  return {
    healthScore,
    issues,
    suggestedFixes: fixes,
    estimatedLoss: totalLossVal,
    productionLosses: losses,
    metrics: {
      logisticsEfficiency,
      powerStability,
      machineUptime,
      transportEfficiency,
    },
    overloadedBeltIds,
    unstablePipeIds,
    faultyMachineIds,
  };
}
