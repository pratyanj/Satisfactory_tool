/**
 * MapStatusBar.tsx
 * Bottom telemetry bar overlay on the world map showing:
 *  - Save status / file name (left)
 *  - Live cursor coordinates in UE world space (center-left)
 *  - Current biome name (center-right)
 *  - Zoom level (right)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Compass, Crosshair, HardDrive, Scan } from 'lucide-react';
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
  useEffect(() => {
    initBiomes();
  }, []);

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
      {/* Left — save status */}
      <div className="msb-section msb-left">
        <span className={`msb-status-dot ${saveName ? 'is-live' : ''}`} />
        <HardDrive size={12} className="msb-icon" />
        <span className="msb-text msb-save-name">
          {saveName ?? 'NO SAVE LOADED'}
        </span>
      </div>

      {/* Centre — coordinates */}
      <div className="msb-section msb-centre">
        <Crosshair size={12} className="msb-icon msb-icon--amber" />
        <span className="msb-label">COORDS</span>
        <span className="msb-text msb-coords">
          {coords ? `${fmtCoord(coords.x)}, ${fmtCoord(coords.y)} m` : '— , —'}
        </span>
      </div>

      {/* Centre-right — biome */}
      <div className="msb-section msb-biome-section">
        <Compass size={12} className="msb-icon msb-icon--green" />
        <span className="msb-label">SECTOR</span>
        <span className="msb-text msb-biome">{biome}</span>
      </div>

      {/* Right — zoom */}
      <div className="msb-section msb-right">
        <Scan size={12} className="msb-icon" />
        <span className="msb-label">ZOOM</span>
        <span className="msb-text msb-zoom-val">
          {zoom !== null ? `${zoom.toFixed(2)}×` : '—'}
        </span>
      </div>
    </div>
  );
}

/** Public export — wrapped so it can be used outside MapContainer too */
export function MapStatusBar(props: MapStatusBarProps) {
  return <StatusBarInner {...props} />;
}
