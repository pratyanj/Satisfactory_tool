/**
 * VehicleLayer.tsx
 * Renders truck/tractor positions and their recorded path waypoints as dashed yellow lines.
 */
import React from 'react';
import { Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { gameToLatLng } from './mapUtils';
import type { SaveBuilding } from '../../types/save';

const VEHICLE_KEYWORDS = [
  'WheeledVehicle', 'Vehicle_Truck', 'Vehicle_Tractor',
  'Vehicle_Explorer', 'Vehicle_CyberWagon',
  'Build_TruckStation', 'Build_DriveableTruck',
];

const VEHICLE_EMOJIS: Record<string, string> = {
  Truck:       '🚛',
  Tractor:     '🚜',
  Explorer:    '🚙',
  CyberWagon:  '🚗',
  TruckStation:'🅿️',
};

function getVehicleEmoji(typePath: string): string {
  for (const [k, e] of Object.entries(VEHICLE_EMOJIS)) {
    if (typePath.includes(k)) return e;
  }
  return '🚛';
}

function createVehicleIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    html: `<div class="vehicle-marker">${emoji}</div>`,
  });
}

interface VehicleLayerProps {
  buildings: SaveBuilding[];
}

export function VehicleLayer({ buildings }: VehicleLayerProps) {
  const vehicles = buildings.filter(b =>
    VEHICLE_KEYWORDS.some(k => b.typePath.includes(k))
  );

  return (
    <>
      {vehicles.map((v, i) => {
        const pos  = gameToLatLng(v.position.x, v.position.y);
        const emoji = getVehicleEmoji(v.typePath);
        const icon  = createVehicleIcon(emoji);

        // Try to extract saved path waypoints
        const savedPaths = (v.properties?.mSavedPaths as any)?.value ?? [];
        const waypoints: L.LatLngExpression[] = [];

        if (Array.isArray(savedPaths)) {
          for (const wp of savedPaths) {
            const wx = wp?.position?.x ?? wp?.x;
            const wy = wp?.position?.y ?? wp?.y;
            if (typeof wx === 'number' && typeof wy === 'number') {
              waypoints.push(gameToLatLng(wx, wy));
            }
          }
        }

        return (
          <React.Fragment key={`vehicle-${i}`}>
            {/* Route path (dashed yellow line) */}
            {waypoints.length >= 2 && (
              <Polyline
                positions={waypoints}
                pathOptions={{
                  color: '#facc15',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '6 6',
                }}
              />
            )}

            {/* Vehicle position marker */}
            <Marker position={pos} icon={icon} zIndexOffset={600}>
              <Popup className="map-popup" maxWidth={200}>
                <div className="vehicle-popup">
                  <div className="vehicle-popup-header">
                    <span>{emoji}</span>
                    <span className="vehicle-popup-name">
                      {(v.properties?.mDisplayName as any)?.value ?? 'Vehicle'}
                    </span>
                  </div>
                  <div className="vehicle-popup-row">
                    <span>Position</span>
                    <span>{Math.round(v.position.x / 100)}m, {Math.round(v.position.y / 100)}m</span>
                  </div>
                  {waypoints.length > 0 && (
                    <div className="vehicle-popup-row">
                      <span>Waypoints</span>
                      <span>{waypoints.length}</span>
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
