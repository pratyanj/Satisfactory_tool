/**
 * LayerControls.tsx — Sprint 3 update
 * Adds: Resource Nodes toggle, Players toggle
 */
import React from 'react';
import {
  BUILDING_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  BuildingCategory,
} from '../../engine/buildingClassifier';

export interface LayerState {
  categories: Record<BuildingCategory, boolean>;
  conveyors: boolean;
  pipes: boolean;
  powerLines: boolean;
  resourceNodes: boolean;
  players: boolean;
  // Sprint 4
  trainNetwork: boolean;
  vehicles: boolean;
  drones: boolean;
  powerCircuits: boolean;
}

interface LayerControlsProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
  buildingCount: number;
  conveyorCount: number;
  pipeCount: number;
  powerLineCount: number;
}

export function LayerControls({
  layers,
  onChange,
  buildingCount,
  conveyorCount,
  pipeCount,
  powerLineCount,
}: LayerControlsProps) {
  const toggleCategory = (cat: BuildingCategory) => {
    onChange({ ...layers, categories: { ...layers.categories, [cat]: !layers.categories[cat] } });
  };

  const toggleAll = (value: boolean) => {
    const allCats = Object.fromEntries(
      BUILDING_CATEGORIES.map(c => [c, value])
    ) as Record<BuildingCategory, boolean>;
    onChange({ ...layers, categories: allCats, conveyors: value, pipes: value, powerLines: value });
  };

  return (
    <div className="map-layer-panel">
      <div className="map-layer-header">
        <span>🗂️ Layers</span>
        <div className="map-layer-toggleall">
          <button onClick={() => toggleAll(true)}>All</button>
          <button onClick={() => toggleAll(false)}>None</button>
        </div>
      </div>

      {/* ── Building categories ───────────────────────────── */}
      <div className="map-layer-section-title">Buildings ({buildingCount})</div>
      <div className="map-layer-items">
        {BUILDING_CATEGORIES.filter(c => c !== 'unknown').map(cat => (
          <label key={cat} className="map-layer-item">
            <span className="map-layer-dot" style={{ background: CATEGORY_COLORS[cat] }} />
            <span className="map-layer-name">{CATEGORY_LABELS[cat]}</span>
            <input
              type="checkbox"
              checked={layers.categories[cat]}
              onChange={() => toggleCategory(cat)}
              className="map-layer-check"
            />
          </label>
        ))}
      </div>

      <div className="map-layer-divider" />

      {/* ── Infrastructure ───────────────────────────────── */}
      <div className="map-layer-section-title">Infrastructure</div>
      <div className="map-layer-items">
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#94a3b8' }} />
          <span className="map-layer-name">Conveyors ({conveyorCount})</span>
          <input type="checkbox" checked={layers.conveyors}
            onChange={() => onChange({ ...layers, conveyors: !layers.conveyors })}
            className="map-layer-check" />
        </label>
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#22d3ee' }} />
          <span className="map-layer-name">Pipes ({pipeCount})</span>
          <input type="checkbox" checked={layers.pipes}
            onChange={() => onChange({ ...layers, pipes: !layers.pipes })}
            className="map-layer-check" />
        </label>
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#fde68a' }} />
          <span className="map-layer-name">Power Lines ({powerLineCount})</span>
          <input type="checkbox" checked={layers.powerLines}
            onChange={() => onChange({ ...layers, powerLines: !layers.powerLines })}
            className="map-layer-check" />
        </label>
      </div>

      <div className="map-layer-divider" />

      {/* ── Overlays ─────────────────────────────────────── */}
      <div className="map-layer-section-title">Overlays</div>
      <div className="map-layer-items">
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#22c55e' }} />
          <span className="map-layer-name">Resource Nodes</span>
          <input type="checkbox" checked={layers.resourceNodes}
            onChange={() => onChange({ ...layers, resourceNodes: !layers.resourceNodes })}
            className="map-layer-check" />
        </label>
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#fff' }} />
          <span className="map-layer-name">Players</span>
          <input type="checkbox" checked={layers.players}
            onChange={() => onChange({ ...layers, players: !layers.players })}
            className="map-layer-check" />
        </label>
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#a78bfa' }} />
          <span className="map-layer-name">Train Network</span>
          <input type="checkbox" checked={layers.trainNetwork}
            onChange={() => onChange({ ...layers, trainNetwork: !layers.trainNetwork })}
            className="map-layer-check" />
        </label>
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#facc15' }} />
          <span className="map-layer-name">Vehicles</span>
          <input type="checkbox" checked={layers.vehicles}
            onChange={() => onChange({ ...layers, vehicles: !layers.vehicles })}
            className="map-layer-check" />
        </label>
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#06b6d4' }} />
          <span className="map-layer-name">Drones</span>
          <input type="checkbox" checked={layers.drones}
            onChange={() => onChange({ ...layers, drones: !layers.drones })}
            className="map-layer-check" />
        </label>
        <label className="map-layer-item">
          <span className="map-layer-dot" style={{ background: '#f97316' }} />
          <span className="map-layer-name">Power Circuits</span>
          <input type="checkbox" checked={layers.powerCircuits}
            onChange={() => onChange({ ...layers, powerCircuits: !layers.powerCircuits })}
            className="map-layer-check" />
        </label>
      </div>
    </div>
  );
}

export function defaultLayerState(): LayerState {
  return {
    categories: Object.fromEntries(
      BUILDING_CATEGORIES.map(c => [c, true])
    ) as Record<BuildingCategory, boolean>,
    conveyors:    true,
    pipes:        true,
    powerLines:   true,
    resourceNodes: false,
    players:      true,
    trainNetwork: true,
    vehicles:     true,
    drones:       true,
    powerCircuits: false,
  };
}
