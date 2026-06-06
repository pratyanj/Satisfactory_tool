/**
 * WorldMap.tsx — Sprint 3 update
 * Adds PlayerMarker and ResourceNodeLayer integration
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, ImageOverlay, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  MAP_BOUNDS, MAP_IMAGE_SIZE, gameToLatLng,
  DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, MIN_NATIVE_ZOOM, MAX_NATIVE_ZOOM,
} from './mapUtils';
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
import { aggregateDiagnosticsFlowB } from '../../engine/diagnostics/diagnosticsAggregator';
import type { ParsedSave } from '../../types/save';


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
  onBoundsChange,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  onZoomChange: (z: number) => void;
  onBoundsChange: (b: L.LatLngBounds) => void;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    onZoomChange(map.getZoom());
    onBoundsChange(map.getBounds());
  }, [map]);
  // Re-report the viewport after each pan/zoom so off-screen markers can be culled.
  useMapEvents({
    zoomend: () => { onZoomChange(map.getZoom()); onBoundsChange(map.getBounds()); },
    moveend: () => { onBoundsChange(map.getBounds()); },
  });
  return null;
}

// ─── Building Markers ─────────────────────────────────────────────────────────
function BuildingMarkersLayer({
  buildings, layers, zoom, altitudeRange, bounds, faultyMachineIds, active, onPlanProduction,
}: {
  buildings: SaveBuilding[];
  layers: LayerState;
  zoom: number;
  altitudeRange: AltitudeRange | null;
  /** Current map viewport; only markers inside it (padded) are rendered. */
  bounds: L.LatLngBounds | null;
  faultyMachineIds: Map<string, 'idle' | 'starved' | 'clogged'>;
  active: boolean;
  onPlanProduction?: (itemId: string, rate: number) => void;
}) {
  const visible = useMemo(() => {
    // Pad the viewport so markers don't pop in/out right at the edge.
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

  return (
    <>
      {visible.map(b => (
        <React.Fragment key={b.instanceName}>
          <BuildingMarker 
            building={b} 
            zoom={zoom} 
            diagnosticsStatus={active ? faultyMachineIds.get(b.instanceName) : undefined}
            onPlanProduction={onPlanProduction} 
          />
        </React.Fragment>
      ))}
    </>
  );
}

// ─── Conveyor Layer ───────────────────────────────────────────────────────────
function ConveyorLayer({ conveyors, overloadedBeltIds, active }: { conveyors: SaveConveyor[]; overloadedBeltIds: Set<string>; active: boolean }) {
  return <>
    {conveyors.map(c => {
      const isOverloaded = active && overloadedBeltIds.has(c.instanceName);
      const pts = (c.path && c.path.length >= 2) ? c.path : [c.startPosition, c.endPosition];
      return (
        <Polyline key={c.instanceName}
          positions={pts.map(p => gameToLatLng(p.x, p.y))}
          pathOptions={{ 
            color: isOverloaded ? '#ff1744' : getBeltColor(c.typePath), 
            weight: isOverloaded ? getBeltWeight(c.typePath) * 2.5 : getBeltWeight(c.typePath), 
            opacity: isOverloaded ? 1.0 : 0.75,
            dashArray: isOverloaded ? '5 5' : undefined
          }} />
      );
    })}
  </>;
}

// ─── Pipe Layer ───────────────────────────────────────────────────────────────
function PipeLayer({ pipes, unstablePipeIds, active }: { pipes: SavePipe[]; unstablePipeIds: Set<string>; active: boolean }) {
  return <>
    {pipes.map(p => {
      const isUnstable = active && unstablePipeIds.has(p.instanceName);
      const pts = (p.path && p.path.length >= 2) ? p.path : [p.startPosition, p.endPosition];
      return (
        <Polyline key={p.instanceName}
          positions={pts.map(pt => gameToLatLng(pt.x, pt.y))}
          pathOptions={{ 
            color: isUnstable ? '#00e6ff' : getPipeColor(p.typePath), 
            weight: isUnstable ? 5 : p.typePath.includes('Mk2') ? 3 : 2, 
            opacity: isUnstable ? 1.0 : 0.7, 
            dashArray: isUnstable ? '3 5' : '5 4' 
          }} />
      );
    })}
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
  /** Resource node filter: Map<resourceName, Set<purity>> */
  activeFilters?: Map<string, Set<string>>;
}

// ─── Map Image Loader ───────────────────────────────────────────────────────────
function MapImageLoader({ url, onLoaded }: { url: string; onLoaded: () => void }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 10;
    const timer = setInterval(() => {
      frame = Math.min(frame + 5, 85);
      setPct(frame);
    }, 100);

    const img = new Image();
    img.onload = () => {
      clearInterval(timer);
      setPct(100);
      setTimeout(onLoaded, 300);
    };
    img.onerror = () => {
      clearInterval(timer);
      setPct(100);
      setTimeout(onLoaded, 300);
    };
    img.src = url;

    return () => clearInterval(timer);
  }, [url, onLoaded]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1117] transition-opacity duration-300">
      <div className="sf-loader-container mb-6">
        <div className="sf-loader">
          <div className="sf-loader-hex"></div>
          <div className="sf-loader-hex-inner"></div>
        </div>
        <div className="sf-loader-text">FICSIT CARTOGRAPHY IN PROGRESS...</div>
      </div>
      <div className="text-[#8E9299] text-xs font-mono mb-4 max-w-sm text-center">
        The map image is around 45MB and might take a moment to load depending on your network.
      </div>
      <div className="w-64 h-2 bg-[#1a1b1e] rounded overflow-hidden border border-[#2a2d33]">
        <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: 'repeating-linear-gradient(45deg, #f48721, #f48721 8px, #111 8px, #111 16px)' }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function WorldMap({
  buildings, conveyors, pipes, powerLines, players,
  layers, mapRef, saveName,
  altitudeRange = null,
  mapLayer = 'realistic',
  onMapLayerChange,
  onPlanProduction,
  activeFilters,
}: WorldMapProps) {
  const internalRef = useRef<L.Map | null>(null);
  const combinedRef = (mapRef as React.MutableRefObject<L.Map | null>) ?? internalRef;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  const diagnostics = useMemo(() => {
    if (!layers.diagnostics || buildings.length === 0) {
      return {
        overloadedBeltIds: new Set<string>(),
        unstablePipeIds: new Set<string>(),
        faultyMachineIds: new Map<string, 'idle' | 'starved' | 'clogged'>(),
      };
    }

    const mockSave: ParsedSave = {
      saveName: saveName || 'Real Save',
      buildings,
      conveyors,
      pipes,
      powerLines,
      players,
      totalObjectCount: buildings.length + conveyors.length + pipes.length,
      parsedAt: Date.now(),
      powerData: {
        totalProduction: 2400,
        totalConsumption: 1850,
        batteryCount: 8,
        generatorCount: 16,
      }
    };

    return aggregateDiagnosticsFlowB(mockSave);
  }, [layers.diagnostics, buildings, conveyors, pipes, powerLines, players, saveName]);

  const center: L.LatLngExpression = DEFAULT_CENTER;

  const layerConfig = MAP_LAYERS.find(l => l.id === mapLayer) ?? MAP_LAYERS[0];
  const layerKind = layerConfig.kind;
  const layerUrl = layerConfig.url;

  // The tiled background streams progressively (tiles are tiny), so there is
  // nothing to "preload". The full-image loader only applies to legacy
  // single-image ('image' kind) layers.
  const isImageLayer = layerKind === 'image';

  // Track whether a legacy single image has finished downloading.
  // onLoaded must be stable (useCallback) so MapImageLoader's useEffect
  // doesn't re-run on every parent render and reset progress.
  const [bgLoaded, setBgLoaded] = useState(false);
  const handleBgLoaded = useCallback(() => {
    console.log('[WorldMap] Background image loaded, revealing map.');
    setBgLoaded(true);
  }, []);

  // Reset the loader only when an image layer changes; tiled/blank layers
  // have nothing to wait for.
  useEffect(() => {
    setBgLoaded(!isImageLayer);
  }, [isImageLayer, layerUrl]);

  return (
    <div className="world-map-root flex flex-col flex-1 w-full h-full relative">
      {isImageLayer && !bgLoaded && (
        <MapImageLoader url={layerUrl} onLoaded={handleBgLoaded} />
      )}
      
      {buildings.length > 0 && (
        <div className="world-map-search-overlay">
          <MapSearch buildings={buildings} mapRef={combinedRef} />
        </div>
      )}

      {/* Layer switcher (Realistic / Game Map / No Map) */}
      {onMapLayerChange && (
        <div className="world-map-layer-switcher">
          <MapLayerSwitcher current={mapLayer} onChange={onMapLayerChange} />
        </div>
      )}

      {/* MapContainer is ALWAYS mounted so Leaflet initialises immediately.
          The loading overlay above covers it until the image is ready. */}
      <MapContainer
        crs={CRS} center={center} zoom={DEFAULT_ZOOM} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM}
        maxBounds={[[-MAP_IMAGE_SIZE - 16, -16], [16, MAP_IMAGE_SIZE + 16]]}
        maxBoundsViscosity={0.8}
        style={{ width: '100%', height: '100%', minHeight: 0, background: '#0d1117', flex: 1 }}
        zoomControl={true}
      >
        <MapController mapRef={combinedRef} onZoomChange={setZoom} onBoundsChange={setBounds} />
        <MapStatusBar saveName={saveName} />

        {/* Background: self-hosted tile pyramid (default) or legacy single image */}
        {layerKind === 'tiles' && (
          <TileLayer
            url={`${layerUrl}/{z}/{x}/{y}.webp`}
            tileSize={256}
            noWrap
            bounds={MAP_BOUNDS}
            minZoom={MIN_ZOOM}
            minNativeZoom={MIN_NATIVE_ZOOM}
            maxNativeZoom={MAX_NATIVE_ZOOM}
            maxZoom={MAX_ZOOM}
          />
        )}
        {layerKind === 'image' && <ImageOverlay url={layerUrl} bounds={MAP_BOUNDS} opacity={1} />}

        {/* Resource nodes — visible even without a save file */}
        {layers.resourceNodes && (
          <ResourceNodeLayer activeFilters={activeFilters ?? new Map()} />
        )}

        {/* Building markers from save */}
        <BuildingMarkersLayer
          buildings={buildings} layers={layers} zoom={zoom}
          altitudeRange={altitudeRange}
          bounds={bounds}
          faultyMachineIds={diagnostics.faultyMachineIds}
          active={layers.diagnostics}
          onPlanProduction={onPlanProduction} />

        {/* Player markers */}
        {layers.players && players.map((p, i) => (
          <React.Fragment key={`player-${i}`}>
            <PlayerMarker player={p} />
          </React.Fragment>
        ))}

        {/* Infrastructure */}
        {layers.conveyors  && <ConveyorLayer conveyors={conveyors} overloadedBeltIds={diagnostics.overloadedBeltIds} active={layers.diagnostics} />}
        {layers.pipes      && <PipeLayer pipes={pipes} unstablePipeIds={diagnostics.unstablePipeIds} active={layers.diagnostics} />}

        {layers.powerLines && <PowerLineLayer powerLines={powerLines} />}

        {/* Sprint 4 overlay layers */}
        {layers.trainNetwork && <TrainNetworkLayer buildings={buildings} />}
        {layers.vehicles     && <VehicleLayer buildings={buildings} />}
        {layers.drones       && <DroneLayer buildings={buildings} />}
      </MapContainer>
    </div>
  );
}
