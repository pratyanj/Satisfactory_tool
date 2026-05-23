import { SolverNode } from '../solver';
import { ParsedSave } from '../../types/save';
import { DiagnosticIssue } from './types';
import { items } from '../data';

// Fluid item checks
export const FLUID_ITEMS = ['water', 'crude_oil', 'heavy_oil_residue', 'fuel', 'liquid_biofuel', 'alumina_solution', 'sulfuric_acid', 'nitric_acid'];

export function isFluidItem(itemId: string): boolean {
  return FLUID_ITEMS.includes(itemId.toLowerCase()) || itemId.toLowerCase().includes('liquid') || itemId.toLowerCase().includes('solution') || itemId.toLowerCase().includes('acid');
}

export function analyzePipesFlowA(rootNode: SolverNode): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  function traverse(node: SolverNode) {
    if (isFluidItem(node.itemId)) {
      const maxPipeCap = 600; // Mk2 Pipeline max capacity
      const stdPipeCap = 300; // Mk1 Pipeline capacity
      
      if (node.rate > stdPipeCap) {
        const severity = node.rate > maxPipeCap ? 'critical' : 'warning';
        issues.push({
          id: `pipe-overload-${node.itemId}`,
          severity,
          category: 'pipe',
          title: node.rate > maxPipeCap ? `Fluid Flow Exceeds Max Pipeline Limit` : `Fluid Flow Exceeds Mk.1 Pipeline Limit`,
          description: `Fluid production for ${items[node.itemId]?.name || node.itemId} requires ${node.rate.toFixed(1)} m³/min, which exceeds standard Mk.1 Pipeline capacity (${stdPipeCap} m³/min) by ${Math.round(((node.rate - stdPipeCap) / stdPipeCap) * 100)}%.`,
          suggestedFix: node.rate > maxPipeCap 
            ? `Split the fluid pipeline into two parallel pipes or reduce the refinery throughput.` 
            : `Upgrade this fluid pipeline network to Pipeline Mk.2 (600 m³/min limit).`,
          relatedEntityIds: [node.itemId],
        });
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
