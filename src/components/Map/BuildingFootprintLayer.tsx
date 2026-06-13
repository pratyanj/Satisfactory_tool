/**
 * BuildingFootprintLayer.tsx
 * Renders save buildings the "factory blueprint" way (like satisfactory-logistics):
 *
 *  - Zoomed in  → each building is a category-colored rotated RECTANGLE drawn at
 *    its real footprint (canvas Polygon).
 *  - Zoomed out → a small fixed-size dot (canvas CircleMarker), because an 8m
 *    footprint is sub-pixel at world zoom and would be invisible.
 *
 * Both render on the map's shared canvas (MapContainer preferCanvas), so there
 * are no per-building DOM nodes and no glowing image markers.
 */
import React, { useMemo, useState } from 'react';
import { CircleMarker, Polygon, Popup } from 'react-leaflet';
import type L from 'leaflet';

import { classifyBuilding, CATEGORY_COLORS } from '../../engine/buildingClassifier';
import type { SaveBuilding } from '../../types/save';
import type { LayerState } from './LayerControls';
import type { AltitudeRange } from './AltitudeFilter';
import { gameToLatLng } from './mapUtils';
import { footprintCorners } from './buildingFootprints';
import { BuildingPopup } from './BuildingPopup';

/** At/above this zoom, draw real footprints; below it, draw dots. */
const FOOTPRINT_ZOOM = 4;

const STATUS_COLOR: Record<'idle' | 'starved' | 'clogged', string> = {
  idle:    '#ff1744',
  starved: '#ff9100',
  clogged: '#00e6ff',
};

// ─── Single footprint rectangle ────────────────────────────────────────────────
function BuildingFootprint({
  building, color, onPlanProduction,
}: {
  building: SaveBuilding;
  color: string;
  onPlanProduction?: (itemId: string, rate: number) => void;
}) {
  const corners = useMemo(() => footprintCorners(building), [building]);
  const [open, setOpen] = useState(false);

  return (
    <Polygon
      positions={corners}
      pathOptions={{ color, weight: 1.5, opacity: 0.95, fillColor: color, fillOpacity: 0.4 }}
      eventHandlers={{ popupopen: () => setOpen(true), popupclose: () => setOpen(false) }}
    >
      <Popup className="map-popup bpop-popup" maxWidth={280} minWidth={240}>
        {open ? <BuildingPopup building={building} onPlanProduction={onPlanProduction} /> : null}
      </Popup>
    </Polygon>
  );
}

// ─── Single zoomed-out dot ──────────────────────────────────────────────────────
function BuildingDot({
  building, color, radius, onPlanProduction,
}: {
  building: SaveBuilding;
  color: string;
  radius: number;
  onPlanProduction?: (itemId: string, rate: number) => void;
}) {
  const center = useMemo(() => gameToLatLng(building.position.x, building.position.y), [building]);
  const [open, setOpen] = useState(false);

  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={{ color: '#0a0b0d', weight: 1, fillColor: color, fillOpacity: 0.95 }}
      eventHandlers={{ popupopen: () => setOpen(true), popupclose: () => setOpen(false) }}
    >
      <Popup className="map-popup bpop-popup" maxWidth={280} minWidth={240}>
        {open ? <BuildingPopup building={building} onPlanProduction={onPlanProduction} /> : null}
      </Popup>
    </CircleMarker>
  );
}

// ─── Layer ──────────────────────────────────────────────────────────────────────
interface BuildingFootprintLayerProps {
  buildings: SaveBuilding[];
  layers: LayerState;
  zoom: number;
  altitudeRange: AltitudeRange | null;
  /** Current map viewport; only buildings inside it (padded) are rendered. */
  bounds: L.LatLngBounds | null;
  faultyMachineIds: Map<string, 'idle' | 'starved' | 'clogged'>;
  active: boolean;
  onPlanProduction?: (itemId: string, rate: number) => void;
}

export function BuildingFootprintLayer({
  buildings, layers, zoom, altitudeRange, bounds, faultyMachineIds, active, onPlanProduction,
}: BuildingFootprintLayerProps) {
  const visible = useMemo(() => {
    const padded = bounds ? bounds.pad(0.3) : null;
    return buildings.filter(b => {
      const info = classifyBuilding(b.typePath);
      if (!layers.categories[info.category]) return false;
      if (altitudeRange) {
        const zm = b.position.z / 100;
        if (zm < altitudeRange.low || zm > altitudeRange.high) return false;
      }
      if (padded && !padded.contains(gameToLatLng(b.position.x, b.position.y))) return false;
      return true;
    });
  }, [buildings, layers.categories, altitudeRange, bounds]);

  const detailed = zoom >= FOOTPRINT_ZOOM;
  const dotRadius = zoom >= 3 ? 4 : 3;

  return (
    <>
      {visible.map(b => {
        // Foundations/walls are only meaningful zoomed in; skip them as overview dots.
        if (!detailed && b.structural) return null;
        const status = active ? faultyMachineIds.get(b.instanceName) : undefined;
        const color = status ? STATUS_COLOR[status] : CATEGORY_COLORS[classifyBuilding(b.typePath).category];
        return detailed ? (
          <BuildingFootprint
            key={b.instanceName}
            building={b}
            color={color}
            onPlanProduction={onPlanProduction}
          />
        ) : (
          <BuildingDot
            key={b.instanceName}
            building={b}
            color={color}
            radius={dotRadius}
            onPlanProduction={onPlanProduction}
          />
        );
      })}
    </>
  );
}
