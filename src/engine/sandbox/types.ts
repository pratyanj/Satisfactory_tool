export interface SandboxMachineTemplate {
  id: string;
  name: string;
  category: 'production' | 'logistics' | 'power' | 'storage';
  width: number;
  height: number;
  imageUrl?: string;
}

export interface PlacedSandboxMachine {
  id: string;
  templateId: string;
  x: number; // foundation grid coordinate
  y: number; // foundation grid coordinate
  rotation: 0 | 90 | 180 | 270;
  recipeId?: string;
  clockSpeed: number; // percent (1 - 250)
}

export type SandboxLinkKind = 'belt' | 'pipe' | 'power';

export interface SandboxPreparedLink {
  id: string;
  fromMachineId: string;
  toMachineId: string;
  kind: SandboxLinkKind;
  beltTier?: string;
}
