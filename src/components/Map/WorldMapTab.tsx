import React, { useState, useRef, useEffect } from 'react';
import type L from 'leaflet';
import { WorldMap } from './WorldMap';
import { defaultLayerState } from './LayerControls';
import type { MapLayerType } from './MapLayerSwitcher';

export function WorldMapTab() {
  console.log('[WorldMapTab] Render');

  const [mapLayer, setMapLayer] = useState<MapLayerType>('realistic');
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    console.log('[WorldMapTab] mapLayer state:', mapLayer);
  }, [mapLayer]);

  // We only want resource nodes for the bare world map
  const layers = {
    ...defaultLayerState(),
    resourceNodes: true,
  };

  console.log('[WorldMapTab] layers config:', layers);

  return (
    <div className="flex flex-col flex-1 w-full h-full relative rounded-2xl overflow-hidden bg-[#0d1117]">
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
