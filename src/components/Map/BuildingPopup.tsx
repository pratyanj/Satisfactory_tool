/**
 * BuildingPopup.tsx
 * Rich, game-authentic popup panel for map building markers.
 * Uses CDN background images from SC-InteractiveMap repo + game icon images.
 */
import React from 'react';
import { StatusLight, getStatus } from './StatusLight';
import { classifyBuilding } from '../../engine/buildingClassifier';
import type { SaveBuilding } from '../../types/save';

// ─── CDN Images ───────────────────────────────────────────────────────────────
const CDN = 'https://raw.githubusercontent.com/AnthorNet/SC-InteractiveMap/dev/img/';

function getPopupBackground(typePath: string): string {
  if (typePath.includes('ManufacturerMk1')) return `${CDN}TXUI_Manufacturer_BG.png`;
  if (typePath.includes('Manufacturer'))   return `${CDN}TXUI_Manufacturer_BG.png`;
  if (typePath.includes('ConstructorMk1')) return `${CDN}TXUI_Manufacturer_BG_Constructor.png`;
  if (typePath.includes('Constructor'))    return `${CDN}TXUI_Manufacturer_BG_Constructor.png`;
  if (typePath.includes('Blender'))        return `${CDN}TXUI_Manufacturer_BG_Blender.png`;
  if (typePath.includes('Refinery'))       return `${CDN}TXUI_Manufacturer_BG_Refinery.png`;
  if (typePath.includes('SmelterMk1'))     return `${CDN}TXUI_Manufacturer_BG_Smelter.png`;
  if (typePath.includes('FoundryMk1'))     return `${CDN}TXUI_Manufacturer_BG_Smelter.png`;
  if (typePath.includes('AssemblerMk1'))   return `${CDN}TXUI_Manufacturer_BG.png`;
  if (typePath.includes('HadronCollider')) return `${CDN}TXUI_Manufacturer_BG.png`;
  if (typePath.includes('OilPump'))        return `${CDN}Extractor_BG.png`;
  if (typePath.includes('MinerMk'))        return `${CDN}Extractor_BG.png`;
  if (typePath.includes('WaterPump'))      return `${CDN}Extractor_BG.png`;
  if (typePath.includes('FrackingExtractor')) return `${CDN}Fracker_Extractor_BG.png`;
  if (typePath.includes('FrackingActivator')) return `${CDN}Fracker_Smasher_BG.png`;
  if (typePath.includes('DroneStation'))   return `${CDN}TXUI_DroneStation_BG.png`;
  if (typePath.includes('TruckStation'))   return `${CDN}TXUI_TruckStationBG.png`;
  if (typePath.includes('GeoThermal'))     return `${CDN}TXUI_GeothermalBG.png`;
  if (typePath.includes('PowerStorage'))   return `${CDN}TXUI_PowerStorage_BG.png`;
  if (typePath.includes('PowerSwitch'))    return `${CDN}TXUI_PowerSwitch_BG.png`;
  if (typePath.includes('Pipeline'))       return `${CDN}TXUI_PipeInspector_BG.png`;
  if (typePath.includes('LiquidTank'))     return `${CDN}fluidStorageBackground.png`;
  if (typePath.includes('FluidBuffer'))    return `${CDN}fluidStorageBackground.png`;
  if (typePath.includes('SpaceElevator'))  return `${CDN}SpaceElevator_BG.png`;
  if (typePath.includes('ResourceSink'))   return `${CDN}ResourceSink_Background.png`;
  if (typePath.includes('GeneratorCoal'))  return `${CDN}generatorBackground.png`;
  if (typePath.includes('GeneratorFuel'))  return `${CDN}generatorFluidBackground.png`;
  if (typePath.includes('GeneratorNuclear')) return `${CDN}generatorBackground.png`;
  if (typePath.includes('GeneratorBiomass')) return `${CDN}generatorBackground.png`;
  return `${CDN}generatorBackground.png`;
}

/** Format a UE class path into a human-readable recipe name */
function formatRecipeName(recipePath: unknown): string {
  if (!recipePath || typeof recipePath !== 'string') return 'No Recipe';
  // e.g. "/Game/FactoryGame/Recipes/Recipe_IronIngot.Recipe_IronIngot_C"
  const match = recipePath.match(/Recipe_([^.]+)\./);
  if (match) {
    // Split CamelCase → spaced words
    return match[1].replace(/([A-Z])/g, ' $1').trim();
  }
  return recipePath.split('/').pop()?.split('.')[0] ?? recipePath;
}

/** Extract clock speed percentage (0–250%) */
function getClockSpeed(properties: Record<string, unknown>): number | null {
  const raw = (properties?.mCurrentPotential as any)?.value;
  if (typeof raw === 'number') return Math.round(raw * 100);
  return null;
}

/** Extract current recipe path */
function getRecipePath(properties: Record<string, unknown>): string | null {
  const raw =
    (properties?.mCurrentRecipe as any)?.value?.pathName ??
    (properties?.mCurrentRecipe as any)?.pathName;
  return raw ?? null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface BuildingPopupProps {
  building: SaveBuilding;
  onPlanProduction?: (itemId: string, rate: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function BuildingPopup({ building, onPlanProduction }: BuildingPopupProps) {
  const info = classifyBuilding(building.typePath);
  const bgImage = getPopupBackground(building.typePath);
  const status = getStatus(building.properties);
  const clockSpeed = getClockSpeed(building.properties);
  const recipePath = getRecipePath(building.properties);
  const recipeName = formatRecipeName(recipePath);

  const px = Math.round(building.position.x / 100).toLocaleString();
  const py = Math.round(building.position.y / 100).toLocaleString();
  const pz = Math.round(building.position.z / 100).toLocaleString();

  return (
    <div className="bpop-root">
      {/* ── Header with background image ──────────────────────────── */}
      <div
        className="bpop-header"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="bpop-header-overlay">
          <span className="bpop-emoji">{info.emoji}</span>
          <div className="bpop-header-text">
            <span className="bpop-name">{info.name}</span>
            <span className="bpop-category">{info.category}</span>
          </div>
          <StatusLight status={status} compact />
        </div>
      </div>

      {/* ── Status row ────────────────────────────────────────────── */}
      <div className="bpop-status-row">
        <StatusLight status={status} />
        {clockSpeed !== null && (
          <div className="bpop-clock">
            <div className="bpop-clock-label">
              Clock Speed
              <span className={`bpop-clock-pct ${clockSpeed > 100 ? 'bpop-clock-over' : ''}`}>
                {clockSpeed}%
              </span>
            </div>
            <div className="bpop-clock-bar-wrap">
              <div
                className={`bpop-clock-bar ${clockSpeed > 100 ? 'bpop-clock-bar--over' : ''}`}
                style={{ width: `${Math.min(clockSpeed, 250) / 2.5}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Recipe row ────────────────────────────────────────────── */}
      {recipePath && (
        <div className="bpop-section">
          <span className="bpop-section-label">RECIPE</span>
          <span className="bpop-recipe-name">{recipeName}</span>
        </div>
      )}

      {/* ── Coordinates ───────────────────────────────────────────── */}
      <div className="bpop-section bpop-coords">
        <span className="bpop-section-label">POSITION</span>
        <div className="bpop-coord-grid">
          <span className="bpop-coord-axis">X</span><span className="bpop-coord-val">{px}m</span>
          <span className="bpop-coord-axis">Y</span><span className="bpop-coord-val">{py}m</span>
          <span className="bpop-coord-axis">Z</span><span className="bpop-coord-val">{pz}m</span>
        </div>
      </div>

      {/* ── Action button ─────────────────────────────────────────── */}
      {onPlanProduction && recipePath && (
        <button
          className="bpop-action-btn"
          onClick={() => onPlanProduction(recipePath, 60)}
          title="Open this recipe in the production calculator"
        >
          <span>📊</span>
          <span>Plan Production</span>
        </button>
      )}
    </div>
  );
}
