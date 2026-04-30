/**
 * TrainNetworkLayer.tsx
 * Renders railroad tracks as colored Polylines and train stations as markers.
 */
import React from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { gameToLatLng } from './mapUtils';
import { classifyBuilding } from '../../engine/buildingClassifier';
import type { SaveBuilding } from '../../types/save';

const TRACK_COLOR  = '#a78bfa'; // violet
const STATION_COLOR = '#7c3aed';

const TRAIN_KEYWORDS   = ['RailroadTrack', 'Build_RailroadTrack'];
const STATION_KEYWORDS = ['TrainStation', 'Build_TrainStation', 'FreightWagon', 'Build_FreightWagon', 'Build_TrainDockingStation'];

function createStationIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `
      <div class="train-station-marker">
        <span class="train-station-icon">🚂</span>
      </div>
    `,
  });
}

interface TrainNetworkLayerProps {
  buildings: SaveBuilding[];
}

export function TrainNetworkLayer({ buildings }: TrainNetworkLayerProps) {
  const tracks   = buildings.filter(b => TRAIN_KEYWORDS.some(k   => b.typePath.includes(k)));
  const stations = buildings.filter(b => STATION_KEYWORDS.some(k => b.typePath.includes(k)));

  return (
    <>
      {/* Track segments — drawn as short lines from position (spline data not parsed yet) */}
      {tracks.map((t, i) => {
        const pos = gameToLatLng(t.position.x, t.position.y);
        // Draw a small cross at each track node to indicate presence
        const offset = 0.3;
        return (
          <Polyline
            key={`track-${i}`}
            positions={[
              [pos[0] - offset, pos[1] - offset],
              [pos[0] + offset, pos[1] + offset],
            ]}
            pathOptions={{ color: TRACK_COLOR, weight: 2, opacity: 0.6 }}
          />
        );
      })}

      {/* Station markers */}
      {stations.map((s, i) => {
        const pos = gameToLatLng(s.position.x, s.position.y);
        const icon = createStationIcon();
        const stationName = (s.properties?.mStationName as any)?.value
          ?? (s.properties?.mStationName as string)
          ?? classifyBuilding(s.typePath).name;

        return (
          <React.Fragment key={`station-${i}`}>
            <Marker position={pos} icon={icon} zIndexOffset={500}>
              <Popup className="map-popup" maxWidth={200}>
                <div className="train-popup">
                  <div className="train-popup-header">
                    <span>🚂</span>
                    <span className="train-popup-name">{stationName}</span>
                  </div>
                  <div className="train-popup-row">
                    <span>Type</span>
                    <span>{classifyBuilding(s.typePath).name}</span>
                  </div>
                  <div className="train-popup-row">
                    <span>Position</span>
                    <span>
                      {Math.round(s.position.x / 100)}m,&nbsp;
                      {Math.round(s.position.y / 100)}m
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
