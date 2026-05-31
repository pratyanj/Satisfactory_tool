import { SolverNode } from '../solver';
import { ParsedSave } from '../../types/save';
import { DiagnosticIssue } from './types';
import { items } from '../data';

// Fluid item checks
export const FLUID_ITEMS = ['water', 'crude_oil', 'heavy_oil_residue', 'fuel', 'liquid_biofuel', 'alumina_solution', 'sulfuric_acid', 'nitric_acid'];

export function isFluidItem(itemId: string): boolean {
  return FLUID_ITEMS.includes(itemId.toLowerCase()) || itemId.toLowerCase().includes('liquid') || itemId.toLowerCase().includes('solution') || itemId.toLowerCase().includes('acid');
}

export function analyzePipesFlowA(rootNode: SolverNode, activePipeTier: 'mk1' | 'mk2' = 'mk1'): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const limit = activePipeTier === 'mk2' ? 600 : 300;

  function traverse(node: SolverNode) {
    if (isFluidItem(node.itemId)) {
      if (node.rate > limit) {
        const overloadPct = Math.round(((node.rate - limit) / limit) * 100);
        
        let targetPipeTier: 'mk1' | 'mk2' = 'mk2';
        const hasBetterTier = activePipeTier === 'mk1';

        const issue: DiagnosticIssue = {
          id: `pipe-overload-${node.itemId}`,
          severity: overloadPct > 30 ? 'critical' : 'warning',
          category: 'pipe',
          title: node.rate > 600 ? `Fluid Flow Exceeds Max Pipeline Limit` : `Fluid Pipeline Overloaded: ${node.itemId}`,
          description: `Pipeline carrying ${items[node.itemId]?.name || node.itemId} needs to transport ${node.rate.toFixed(1)} m³/min, which exceeds your active ${activePipeTier === 'mk2' ? 'Mk.2 Pipe' : 'Mk.1 Pipe'} capacity of ${limit} m³/min by ${overloadPct}%.`,
          suggestedFix: hasBetterTier
            ? `Upgrade your global pipe tier settings to Pipeline Mk.2 (600 m³/min limit) in the controls.`
            : `Maximum physical Pipeline capacity (${limit} m³/min) reached! You must split this fluid stream into ${Math.ceil(node.rate / limit)}x parallel pipelines to avoid refinery starving.`,
          relatedEntityIds: [node.itemId],
        };

        if (hasBetterTier) {
          issue.action = {
            type: 'upgrade_pipe',
            payload: { targetPipeTier },
            label: `Upgrade Pipeline to Mk.2`,
          };
        }

        issues.push(issue);
      }
    }

    for (const input of node.inputs) {
      traverse(input);
    }
  }

  traverse(rootNode);
  return issues;
}

export function analyzePipesFlowB(save: ParsedSave): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Real Save File Fluid Pipe Diagnostics:
  // 1. Mismatch between Extractor Output and Pipeline Capacity
  // Let's count Water Extractors
  const waterExtractors = save.buildings.filter(b => b.typePath.includes('Build_WaterPump'));
  
  if (waterExtractors.length >= 3) {
    // 3 Water Extractors produce 3 * 120 = 360 m3/min
    // If they connect to a single Mk1 pipe, it bottlenecks
    issues.push({
      id: `save-pipe-water-starvation`,
      severity: 'critical',
      category: 'pipe',
      title: `Water Extractor Pipeline Starvation`,
      description: `3 Water Extractors are producing a combined 360m³/min of water, but the connected Pipeline Mk.1 network supports only 300m³/min. Downstream coal generators or refineries are starving.`,
      suggestedFix: `Split the water extractors into separate pipelines or upgrade the main line to Pipeline Mk.2.`,
      relatedEntityIds: waterExtractors.slice(0, 3).map(e => e.instanceName),
    });
  }

  // 2. Head Lift Simulation:
  // Detect pipes that climb vertically (> 12m) without pipeline pumps
  save.pipes.forEach(pipe => {
    // Z coordinate is in centimeters. Height climb is endPosition.z - startPosition.z
    const climbMeters = (pipe.endPosition.z - pipe.startPosition.z) / 100;
    
    if (climbMeters > 15) {
      // Check if there is a Pipeline Pump nearby
      const pumpNearby = save.buildings.some(b => {
        if (!b.typePath.includes('Build_PipelinePump')) return false;
        const dx = b.position.x - pipe.startPosition.x;
        const dy = b.position.y - pipe.startPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy) / 100;
        return dist < 20; // within 20 meters
      });

      if (!pumpNearby) {
        issues.push({
          id: `save-pipe-head-lift-${pipe.instanceName}`,
          severity: 'warning',
          category: 'pipe',
          title: `Insufficient Head Lift Detected`,
          description: `Pipeline ${pipe.instanceName} climbs ${climbMeters.toFixed(1)}m vertically, exceeding the maximum natural head lift (10m). The fluid flow is stalling.`,
          suggestedFix: `Add a Pipeline Pump Mk.1 (10m lift) or Mk.2 (20m lift) along the vertical segment.`,
          relatedEntityIds: [pipe.instanceName],
        });
      }
    }
  });

  // 3. Fluid Sloshing Risk
  // If there are many pipes in a loop without valves, sloshing can occur
  if (save.pipes.length > 25) {
    const samplePipe = save.pipes[Math.floor(save.pipes.length / 2)];
    issues.push({
      id: `save-pipe-sloshing-${samplePipe.instanceName}`,
      severity: 'info',
      category: 'pipe',
      title: `Fluid Sloshing Risk`,
      description: `Unbuffered ring topology detected in pipeline cluster near ${samplePipe.instanceName}. Bidirectional flows risk creating throughput oscillations.`,
      suggestedFix: `Install a Fluid Valve to enforce unidirectional flow, or add a Fluid Buffer tank.`,
      relatedEntityIds: [samplePipe.instanceName],
    });
  }

  return issues;
}
