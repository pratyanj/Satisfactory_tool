import type { PlacedSandboxMachine, SandboxMachineTemplate } from '../types';

export interface FootprintRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getRotatedFootprint(template: SandboxMachineTemplate, rotation: PlacedSandboxMachine['rotation']) {
  const isQuarterTurn = rotation === 90 || rotation === 270;
  return {
    width: isQuarterTurn ? template.height : template.width,
    height: isQuarterTurn ? template.width : template.height,
  };
}

export function toFootprintRect(machine: PlacedSandboxMachine, template: SandboxMachineTemplate): FootprintRect {
  const fp = getRotatedFootprint(template, machine.rotation);
  return { x: machine.x, y: machine.y, width: fp.width, height: fp.height };
}

export function intersects(a: FootprintRect, b: FootprintRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function canPlaceAt(
  target: PlacedSandboxMachine,
  placed: PlacedSandboxMachine[],
  templatesById: Record<string, SandboxMachineTemplate>,
  ignoreIds: Set<string> = new Set(),
): boolean {
  const template = templatesById[target.templateId];
  if (!template) return false;
  const targetRect = toFootprintRect(target, template);

  for (const existing of placed) {
    if (ignoreIds.has(existing.id)) continue;
    const existingTemplate = templatesById[existing.templateId];
    if (!existingTemplate) continue;
    const existingRect = toFootprintRect(existing, existingTemplate);
    if (intersects(targetRect, existingRect)) return false;
  }
  return true;
}
