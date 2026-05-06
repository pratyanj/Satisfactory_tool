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
    <div className="w-full flex-1 min-h-0 flex flex-col relative rounded-2xl overflow-hidden bg-[#0d1117]" data-debug-worldmaptab>
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
