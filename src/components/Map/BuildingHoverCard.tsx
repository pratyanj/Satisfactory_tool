/**
 * BuildingHoverCard.tsx
 * Floating detail card shown when hovering a building on the canvas map.
 * Pulls recipe / clockspeed from the building's saved properties when present.
 */
import React from 'react';
import { classifyBuilding } from '../../engine/buildingClassifier';
import type { SaveBuilding } from '../../types/save';

function cleanName(path?: string): string | null {
  if (!path) return null;
  const seg = (path.split('.').pop() ?? path.split('/').pop() ?? path);
  const s = seg
    .replace(/_C$/, '')
    .replace(/^Recipe_/, '')
    .replace(/^Desc_/, '')
    .replace(/^Build_/, '')
    .replace(/_/g, ' ')
    .trim();
  return s || null;
}

function readNum(v: any): number | null {
  const n = v?.value ?? v;
  return typeof n === 'number' ? n : null;
}

interface BuildingHoverCardProps {
  building: SaveBuilding;
  /** container-space pixel position (anchor) */
  x: number;
  y: number;
}

export function BuildingHoverCard({ building, x, y }: BuildingHoverCardProps) {
  const info = classifyBuilding(building.typePath);
  const props = building.properties as any;

  const recipePath =
    props?.mCurrentRecipe?.value?.pathName ??
    props?.mCurrentRecipe?.pathName ??
    props?.mCurrentRecipe?.value;
  const recipe = cleanName(typeof recipePath === 'string' ? recipePath : recipePath?.pathName);

  const potential = readNum(props?.mCurrentPotential) ?? readNum(props?.mPendingPotential);
  const clock = potential !== null ? Math.round(potential * 100) : null;

  const px = Math.round(building.position.x / 100);
  const py = Math.round(building.position.y / 100);
  const pz = Math.round(building.position.z / 100);

  return (
    <div className="bhover-card" style={{ left: x + 16, top: y + 12 }}>
      <div className="bhover-title" style={{ borderColor: info.color }}>
        <span className="bhover-emoji">{info.emoji}</span>
        <span className="bhover-name">{info.name}</span>
      </div>
      {recipe && (
        <div className="bhover-row"><span>Recipe</span><b>{recipe}</b></div>
      )}
      {clock !== null && (
        <div className="bhover-row"><span>Clock</span><b>{clock}%</b></div>
      )}
      <div className="bhover-row"><span>Position</span><b>{px} / {py} / {pz}</b></div>
    </div>
  );
}
