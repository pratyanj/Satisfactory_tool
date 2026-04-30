/**
 * PlayerMarker.tsx
 * Shows each player's position on the map as a glowing white circle
 * with a player silhouette icon — matching the SC-InteractiveMap style.
 */
import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

import { gameToLatLng } from './mapUtils';
import type { PlayerInfo } from '../../types/save';

function createPlayerIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div class="player-marker-root">
        <span class="player-marker-icon">🧑‍🚀</span>
        <div class="player-marker-pulse"></div>
      </div>
    `,
  });
}

interface PlayerMarkerProps {
  player: PlayerInfo;
}

export function PlayerMarker({ player }: PlayerMarkerProps) {
  // Skip default 0,0,0 placeholder positions
  if (player.position.x === 0 && player.position.y === 0 && player.position.z === 0) {
    return null;
  }

  const latlng = gameToLatLng(player.position.x, player.position.y);
  const icon = createPlayerIcon();

  return (
    <Marker position={latlng} icon={icon} zIndexOffset={1000}>
      <Tooltip permanent={false} direction="top" offset={[0, -16]}>
        <div className="player-tooltip">
          <span>🧑‍🚀</span>
          <span>{player.name}</span>
          <span className="player-tooltip-pos">
            {Math.round(player.position.x / 100)}m, {Math.round(player.position.y / 100)}m
          </span>
        </div>
      </Tooltip>
    </Marker>
  );
}
