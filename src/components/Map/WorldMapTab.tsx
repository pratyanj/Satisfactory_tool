import React, { useState, useRef } from 'react';
import type L from 'leaflet';
import { WorldMap } from './WorldMap';
import { defaultLayerState } from './LayerControls';
import type { MapLayerType } from './MapLayerSwitcher';

export function WorldMapTab() {
  const [mapLayer, setMapLayer] = useState<MapLayerType>('realistic');
  const mapRef = useRef<L.Map | null>(null);

  // We only want resource nodes for the bare world map
  const layers = {
    ...defaultLayerState(),
    resourceNodes: true,
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden bg-[#0d1117]">
      <WorldMap
        buildings={[]}
        conveyors={[]}
        pipes={[]}
        powerLines={[]}
        players={[]}
        layers={layers}
        mapRef={mapRef}
        mapLayer={mapLayer}
        onMapLayerChange={setMapLayer}
      />
    </div>
  );
}
