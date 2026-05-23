export interface DiagnosticIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'belt' | 'pipe' | 'machine' | 'power' | 'train';
  title: string;
  description: string;
  suggestedFix?: string;
  relatedEntityIds: string[]; // Node IDs in graph, or building instanceNames in save file
  action?: {
    type: 'upgrade_belt' | 'change_recipe' | 'underclock_machine';
    payload: Record<string, any>;
    label: string;
  };
}


export interface ProductionLoss {
  itemId: string;
  itemName: string;
  lossRate: number; // units per minute
  unit: string;
  imageUrl?: string;
}

export interface SuggestedFix {
  id: string;
  title: string;
  description: string;
  category: 'belt' | 'pipe' | 'machine' | 'power' | 'train';
  impact: string;
  isResolved?: boolean;
}

export interface FactoryDiagnostics {
  healthScore: number; // 0 - 100
  issues: DiagnosticIssue[];
  suggestedFixes: SuggestedFix[];
  estimatedLoss: number; // Numeric value of output loss in terms of primary item or resource
  productionLosses: ProductionLoss[];
  metrics: {
    logisticsEfficiency: number; // %
    powerStability: number; // %
    machineUptime: number; // %
    transportEfficiency: number; // %
  };
  // Specific data parsed for overlay highlighters
  overloadedBeltIds: Set<string>;
  unstablePipeIds: Set<string>;
  faultyMachineIds: Map<string, 'idle' | 'starved' | 'clogged'>; // entityId -> status
}
