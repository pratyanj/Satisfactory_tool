/**
 * MapTab.tsx — Sprint 3 update
 * Replaces SaveStats with StatsDashboard, passes players to WorldMap
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';

import { SaveUploader } from './SaveUploader';
import { WorldMap } from './WorldMap';
import { LayerControls, LayerState, defaultLayerState } from './LayerControls';
import { StatsDashboard } from './StatsDashboard';
import { AltitudeFilter, AltitudeRange } from './AltitudeFilter';
import type { MapLayerType } from './MapLayerSwitcher';
import type { ParsedSave } from '../../types/save';
import type { BuildingCategory } from '../../engine/buildingClassifier';

export function MapTab() {
  const [parsedSave, setParsedSave]   = useState<ParsedSave | null>(null);
  const [layers, setLayers]           = useState<LayerState>(defaultLayerState());
  const [mapLayer, setMapLayer]       = useState<MapLayerType>('realistic');
  const [focusedCat, setFocusedCat]   = useState<BuildingCategory | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Altitude range derived from save
  const { altMin, altMax } = useMemo(() => {
    if (!parsedSave || parsedSave.buildings.length === 0) return { altMin: -200, altMax: 500 };
    let lo = Infinity, hi = -Infinity;
    for (const b of parsedSave.buildings) {
      const zm = b.position.z / 100;
      if (zm < lo) lo = zm;
      if (zm > hi) hi = zm;
    }
    return { altMin: Math.floor(lo), altMax: Math.ceil(hi) };
  }, [parsedSave]);

  const [altitudeRange, setAltitudeRange] = useState<AltitudeRange | null>(null);
  const effectiveAlt: AltitudeRange = altitudeRange ?? { low: altMin, high: altMax };

  const handleParsed = useCallback((save: ParsedSave) => {
    setParsedSave(save);
    setAltitudeRange(null);
    setFocusedCat(null);
  }, []);

  const handleClearSave = () => {
    setParsedSave(null);
    setLayers(defaultLayerState());
    setAltitudeRange(null);
    setFocusedCat(null);
  };

  // When a category is focused in StatsDashboard, update layer visibility
  const handleCategoryFocus = useCallback((cat: BuildingCategory | null) => {
    setFocusedCat(cat);
    if (cat === null) {
      // Restore all categories
      setLayers(prev => ({
        ...prev,
        categories: Object.fromEntries(
          Object.keys(prev.categories).map(k => [k, true])
        ) as LayerState['categories'],
      }));
    } else {
      // Show only the focused category
      setLayers(prev => ({
        ...prev,
        categories: Object.fromEntries(
          Object.keys(prev.categories).map(k => [k, k === cat])
        ) as LayerState['categories'],
      }));
    }
  }, []);

  if (!parsedSave) {
    return <SaveUploader onParsed={handleParsed} />;
  }

  return (
    <div className="map-tab-root">
      {/* ── Left Sidebar ──────────────────────────────────────── */}
      <div className="map-tab-sidebar">
        <StatsDashboard
          save={parsedSave}
          onClear={handleClearSave}
          onCategoryFocus={handleCategoryFocus}
        />
        <LayerControls
          layers={layers}
          onChange={setLayers}
          buildingCount={parsedSave.buildings.length}
          conveyorCount={parsedSave.conveyors.length}
          pipeCount={parsedSave.pipes.length}
          powerLineCount={parsedSave.powerLines.length}
        />
      </div>

      {/* ── Map Canvas ────────────────────────────────────────── */}
      <div className="map-tab-canvas">
        <WorldMap
          buildings={parsedSave.buildings}
          conveyors={parsedSave.conveyors}
          pipes={parsedSave.pipes}
          powerLines={parsedSave.powerLines}
          players={parsedSave.players}
          layers={layers}
          mapRef={mapRef}
          saveName={parsedSave.saveName}
          altitudeRange={effectiveAlt}
          mapLayer={mapLayer}
          onMapLayerChange={setMapLayer}
        />

        <div className="map-tab-altitude">
          <AltitudeFilter
            min={altMin}
            max={altMax}
            value={effectiveAlt}
            onChange={setAltitudeRange}
          />
        </div>
      </div>
    </div>
  );
}
