/**
 * MapStatusBar.tsx
 * Bottom status bar overlay on the world map showing:
 *  - Save file name (left)
 *  - Live cursor coordinates in UE world space (center-left)
 *  - Current biome name (center)
 *  - Zoom level (right)
 *
 * Matches the bottom bar from satisfactory-calculator.com.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useMapEvents } from 'react-leaflet';
import { latLngToGame } from './mapUtils';
import { getBiome, initBiomes } from '../../engine/biomeDetector';

interface MapStatusBarProps {
  saveName?: string;
}

/** Inner component — must be inside <MapContainer> to use useMapEvents */
function StatusBarInner({ saveName }: MapStatusBarProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [biome, setBiome] = useState('—');
  const [zoom, setZoom] = useState<number | null>(null);

  // Warm biome cache on mount
  useEffect(() => { initBiomes(); }, []);

  const handleMouseMove = useCallback((e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    const ue = latLngToGame(lat, lng);
    setCoords(ue);
    setBiome(getBiome(ue.x, ue.y));
  }, []);

  const map = useMapEvents({
    mousemove: handleMouseMove,
    mouseout: () => setCoords(null),
    zoomend: () => setZoom(map.getZoom()),
  });

  // Initialise zoom
  useEffect(() => {
    setZoom(map.getZoom());
  }, [map]);

  const fmtCoord = (v: number) =>
    Math.round(v / 100).toLocaleString('en-US', { signDisplay: 'exceptZero' });

  return (
    <div className="msb-root">
      {/* Left — save name */}
      <div className="msb-section msb-left">
        <span className="msb-icon">💾</span>
        <span className="msb-text msb-save-name">{saveName ?? '—'}</span>
      </div>

      {/* Centre — coordinates */}
      <div className="msb-section msb-centre">
        <span className="msb-label">Coordinates</span>
        <span className="msb-text msb-coords">
          {coords
            ? `${fmtCoord(coords.x)} / ${fmtCoord(coords.y)}`
            : '— / —'}
        </span>
      </div>

      {/* Centre-right — biome */}
      <div className="msb-section msb-biome-section">
        <span className="msb-label">Biome</span>
        <span className="msb-text msb-biome">{biome}</span>
      </div>

      {/* Right — zoom */}
      <div className="msb-section msb-right">
        <span className="msb-label">Zoom</span>
        <span className="msb-text">{zoom !== null ? zoom.toFixed(1) : '—'}</span>
      </div>
    </div>
  );
}

/** Public export — wrapped so it can be used outside MapContainer too */
export function MapStatusBar(props: MapStatusBarProps) {
  return <StatusBarInner {...props} />;
}
