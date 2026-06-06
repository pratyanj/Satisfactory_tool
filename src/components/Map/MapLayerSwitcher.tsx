/**
 * MapLayerSwitcher.tsx
 * Floating bottom-right panel with map background layer thumbnails.
 *
 * The realistic layer is now a self-hosted tile pyramid
 * (public/map/v2/{z}/{x}/{y}.webp) rendered via Leaflet TileLayer,
 * replacing the old single ~45MB PNG ImageOverlay.
 */
import React from 'react';

export type MapLayerType = 'realistic' | 'blueprint' | 'blank';

/** Base path for the self-hosted tile pyramid (overridable for a CDN). */
export const TILES_BASE_URL: string =
  (import.meta as any).env?.VITE_MAP_TILES_BASE_URL ?? '/map/v2';

export type MapLayerKind = 'tiles' | 'image' | 'none';

export interface MapLayerConfig {
  id: MapLayerType;
  label: string;
  kind: MapLayerKind;
  /** Tile-template base for `tiles`, image path for `image`, '' for `none`. */
  url: string;
  /** Thumbnail image used in the switcher (empty → solid colour fallback). */
  thumb: string;
}

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'realistic',
    label: 'Realistic',
    kind: 'tiles',
    url: TILES_BASE_URL,
    thumb: `${TILES_BASE_URL}/0/0/0.webp`,
  },
  {
    id: 'blank',
    label: 'No Map',
    kind: 'none',
    url: '',
    thumb: '',
  },
];

interface MapLayerSwitcherProps {
  current: MapLayerType;
  onChange: (layer: MapLayerType) => void;
}

export function MapLayerSwitcher({ current, onChange }: MapLayerSwitcherProps) {
  return (
    <div className="mls-root">
      <div className="mls-title">🗺️ Map Layers</div>
      <div className="mls-options">
        {MAP_LAYERS.map(layer => (
          <button
            key={layer.id}
            className={`mls-option ${current === layer.id ? 'mls-option--active' : ''}`}
            onClick={() => onChange(layer.id)}
            title={layer.label}
          >
            <div
              className="mls-thumb"
              style={{ background: layer.thumb ? `url(${layer.thumb}) center/cover` : '#0a0b0d' }}
            />
            <span className="mls-label">{layer.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
