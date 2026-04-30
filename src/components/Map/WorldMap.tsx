/**
 * WorldMap.tsx — Sprint 3 update
 * Adds PlayerMarker and ResourceNodeLayer integration
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, ImageOverlay, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MAP_BOUNDS, MAP_IMAGE_SIZE, gameToLatLng } from './mapUtils';
import { classifyBuilding, getBeltColor, getBeltWeight, getPipeColor } from '../../engine/buildingClassifier';
import type { SaveBuilding, SaveConveyor, SavePipe, SavePowerLine, PlayerInfo } from '../../types/save';
import type { LayerState } from './LayerControls';
import { MapSearch } from './MapSearch';
import { BuildingMarker } from './BuildingMarker';
import { MapStatusBar } from './MapStatusBar';
import { MapLayerSwitcher, MapLayerType, MAP_LAYERS } from './MapLayerSwitcher';
import { PlayerMarker } from './PlayerMarker';
import { ResourceNodeLayer } from './ResourceNodeLayer';
import { TrainNetworkLayer } from './TrainNetworkLayer';
import { VehicleLayer } from './VehicleLayer';
import { DroneLayer } from './DroneLayer';
import type { AltitudeRange } from './AltitudeFilter';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CRS = L.CRS.Simple;

// ─── Map Controller ───────────────────────────────────────────────────────────
function MapController({
  mapRef,
  onZoomChange,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  onZoomChange: (z: number) => void;
}) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; onZoomChange(map.getZoom()); }, [map]);
  useMapEvents({ zoomend: () => onZoomChange(map.getZoom()) });
  return null;
}

// ─── Building Markers ─────────────────────────────────────────────────────────
function BuildingMarkersLayer({
  buildings, layers, zoom, altitudeRange, onPlanProduction,
}: {
  buildings: SaveBuilding[];
  layers: LayerState;
  zoom: number;
  altitudeRange: AltitudeRange | null;
  onPlanProduction?: (itemId: string, rate: number) => void;
}) {
  const visible = useMemo(() =>
    buildings.filter(b => {
      const info = classifyBuilding(b.typePath);
      if (!layers.categories[info.category]) return false;
      if (altitudeRange) {
        const zm = b.position.z / 100;
        if (zm < altitudeRange.low || zm > altitudeRange.high) return false;
      }
      return true;
    }),
    [buildings, layers.categories, altitudeRange],
  );

  return (
    <>
      {visible.map(b => (
        <React.Fragment key={b.instanceName}>
          <BuildingMarker building={b} zoom={zoom} onPlanProduction={onPlanProduction} />
        </React.Fragment>
      ))}
    </>
  );
}

// ─── Conveyor Layer ───────────────────────────────────────────────────────────
function ConveyorLayer({ conveyors }: { conveyors: SaveConveyor[] }) {
  return <>
    {conveyors.map(c => (
      <Polyline key={c.instanceName}
        positions={[gameToLatLng(c.startPosition.x, c.startPosition.y), gameToLatLng(c.endPosition.x, c.endPosition.y)]}
        pathOptions={{ color: getBeltColor(c.typePath), weight: getBeltWeight(c.typePath), opacity: 0.75 }} />
    ))}
  </>;
}

// ─── Pipe Layer ───────────────────────────────────────────────────────────────
function PipeLayer({ pipes }: { pipes: SavePipe[] }) {
  return <>
    {pipes.map(p => (
      <Polyline key={p.instanceName}
        positions={[gameToLatLng(p.startPosition.x, p.startPosition.y), gameToLatLng(p.endPosition.x, p.endPosition.y)]}
        pathOptions={{ color: getPipeColor(p.typePath), weight: p.typePath.includes('Mk2') ? 3 : 2, opacity: 0.7, dashArray: '5 4' }} />
    ))}
  </>;
}

// ─── Power Line Layer ─────────────────────────────────────────────────────────
function PowerLineLayer({ powerLines }: { powerLines: SavePowerLine[] }) {
  return <>
    {powerLines.map(pl => (
      <Polyline key={pl.instanceName}
        positions={[gameToLatLng(pl.startPosition.x, pl.startPosition.y), gameToLatLng(pl.endPosition.x, pl.endPosition.y)]}
        pathOptions={{ color: '#fde68a', weight: 1, opacity: 0.5 }} />
    ))}
  </>;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface WorldMapProps {
  buildings: SaveBuilding[];
  conveyors: SaveConveyor[];
  pipes: SavePipe[];
  powerLines: SavePowerLine[];
  players: PlayerInfo[];
  layers: LayerState;
  mapRef: React.RefObject<L.Map | null>;
  saveName?: string;
  altitudeRange?: AltitudeRange | null;
  mapLayer?: MapLayerType;
  onMapLayerChange?: (layer: MapLayerType) => void;
  onPlanProduction?: (itemId: string, rate: number) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function WorldMap({
  buildings, conveyors, pipes, powerLines, players,
  layers, mapRef, saveName,
  altitudeRange = null,
  mapLayer = 'realistic',
  onMapLayerChange,
  onPlanProduction,
}: WorldMapProps) {
  const internalRef = useRef<L.Map | null>(null);
  const combinedRef = (mapRef as React.MutableRefObject<L.Map | null>) ?? internalRef;
  const [zoom, setZoom] = useState(-2);

  const center: L.LatLngExpression = [MAP_IMAGE_SIZE / 2, MAP_IMAGE_SIZE / 2];
  const layerConfig = MAP_LAYERS.find(l => l.id === mapLayer);
  const bgUrl = layerConfig?.url ?? '/map/world_map.jpg';

  return (
    <div className="world-map-root">
      {buildings.length > 0 && (
        <div className="world-map-search-overlay">
          <MapSearch buildings={buildings} mapRef={combinedRef} />
        </div>
      )}

      {onMapLayerChange && (
        <div className="world-map-layer-switcher">
          <MapLayerSwitcher current={mapLayer} onChange={onMapLayerChange} />
        </div>
      )}

      <MapContainer
        crs={CRS} center={center} zoom={-2} minZoom={-4} maxZoom={2}
        maxBounds={[[-200, -200], [MAP_IMAGE_SIZE + 200, MAP_IMAGE_SIZE + 200]]}
        maxBoundsViscosity={0.8}
        style={{ width: '100%', height: '100%', background: '#0d1117' }}
        zoomControl={true}
      >
        <MapController mapRef={combinedRef} onZoomChange={setZoom} />
        <MapStatusBar saveName={saveName} />

        {bgUrl && <ImageOverlay url={bgUrl} bounds={MAP_BOUNDS} opacity={1} />}

        {/* Resource nodes (static, no save needed) */}
        {layers.resourceNodes && <ResourceNodeLayer />}

        {/* Building markers */}
        <BuildingMarkersLayer
          buildings={buildings} layers={layers} zoom={zoom}
          altitudeRange={altitudeRange} onPlanProduction={onPlanProduction} />

        {/* Player markers */}
        {layers.players && players.map((p, i) => (
          <React.Fragment key={`player-${i}`}>
            <PlayerMarker player={p} />
          </React.Fragment>
        ))}

        {/* Infrastructure */}
        {layers.conveyors  && <ConveyorLayer conveyors={conveyors} />}
        {layers.pipes      && <PipeLayer pipes={pipes} />}
        {layers.powerLines && <PowerLineLayer powerLines={powerLines} />}

        {/* Sprint 4 overlay layers */}
        {layers.trainNetwork && <TrainNetworkLayer buildings={buildings} />}
        {layers.vehicles     && <VehicleLayer buildings={buildings} />}
        {layers.drones       && <DroneLayer buildings={buildings} />}
      </MapContainer>
    </div>
  );
}
