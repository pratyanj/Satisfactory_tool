/**
 * DroneLayer.tsx
 * Renders drone ports as markers and draws cyan dashed lines between paired ports.
 */
import React from 'react';
import { Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { gameToLatLng } from './mapUtils';
import type { SaveBuilding } from '../../types/save';

const DRONE_KEYWORDS = ['DroneStation', 'Build_DroneStation', 'Drone_Port'];

function createDroneIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    html: `<div class="drone-marker">🚁</div>`,
  });
}

interface DroneLayerProps {
  buildings: SaveBuilding[];
}

export function DroneLayer({ buildings }: DroneLayerProps) {
  const dronePorts = buildings.filter(b =>
    DRONE_KEYWORDS.some(k => b.typePath.includes(k))
  );

  // Build a name → building lookup for pairing
  const byName = new Map<string, SaveBuilding>();
  for (const port of dronePorts) {
    byName.set(port.instanceName, port);
  }

  // Track which pairs we've already drawn to avoid duplicate lines
  const drawnPairs = new Set<string>();

  return (
    <>
      {dronePorts.map((port, i) => {
        const pos = gameToLatLng(port.position.x, port.position.y);
        const icon = createDroneIcon();

        // Extract paired station path name
        const pairedPath =
          (port.properties?.mPairedStation as any)?.value?.pathName ??
          (port.properties?.mPairedStation as any)?.pathName;

        let pairLine: React.ReactNode = null;
        if (pairedPath) {
          // Extract just the instance name from the full path
          const pairedName = pairedPath.split(':').pop() ?? pairedPath;
          const paired = byName.get(pairedName);

          const pairKey = [port.instanceName, pairedName].sort().join('|');
          if (paired && !drawnPairs.has(pairKey)) {
            drawnPairs.add(pairKey);
            pairLine = (
              <Polyline
                key={`drone-link-${pairKey}`}
                positions={[pos, gameToLatLng(paired.position.x, paired.position.y)]}
                pathOptions={{
                  color: '#06b6d4',
                  weight: 2,
                  opacity: 0.7,
                  dashArray: '8 6',
                }}
              />
            );
          }
        }

        return (
          <React.Fragment key={`drone-${i}`}>
            {pairLine}
            <Marker position={pos} icon={icon} zIndexOffset={700}>
              <Popup className="map-popup" maxWidth={200}>
                <div className="drone-popup">
                  <div className="drone-popup-header">
                    <span>🚁</span>
                    <span className="drone-popup-name">Drone Port</span>
                  </div>
                  <div className="drone-popup-row">
                    <span>Position</span>
                    <span>{Math.round(port.position.x / 100)}m, {Math.round(port.position.y / 100)}m</span>
                  </div>
                  {pairedPath && (
                    <div className="drone-popup-row">
                      <span>Paired</span>
                      <span className="drone-popup-paired">✅ Connected</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
