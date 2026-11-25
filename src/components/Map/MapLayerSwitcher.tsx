/**
 * MapLayerSwitcher.tsx
 * Floating bottom-right panel with FICSIT map surface mode selector.
 */
import React from 'react';
import { Grid3X3, Layers, Map as MapIcon } from 'lucide-react';

export type MapLayerType = 'realistic' | 'blueprint' | 'blank';

/** Base path for the self-hosted tile pyramid (overridable for a CDN). */
export const TILES_BASE_URL: string =
  (import.meta as any).env?.VITE_MAP_TILES_BASE_URL ?? '/map/v2';

export type MapLayerKind = 'tiles' | 'image' | 'none';

export interface MapLayerConfig {
  id: MapLayerType;
  label: string;
  title: string;
  kind: MapLayerKind;
  /** Tile-template base for `tiles`, image path for `image`, '' for `none`. */
  url: string;
  /** Thumbnail image used in the switcher (empty -> tactical grid pattern). */
  thumb: string;
}

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'realistic',
    label: 'Terrain',
    title: 'Realistic Satellite Terrain',
    kind: 'tiles',
    url: TILES_BASE_URL,
    thumb: `${TILES_BASE_URL}/0/0/0.webp`,
  },
  {
    id: 'blank',
    label: 'Grid',
    title: 'Tactical Blueprint Grid (No Map)',
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
      <div className="mls-title">
        <Layers size={11} />
        <span>Surface</span>
      </div>
      <div className="mls-options">
        {MAP_LAYERS.map((layer) => {
          const isActive = current === layer.id;
          return (
            <button
              key={layer.id}
              type="button"
              className={`mls-option ${isActive ? 'mls-option--active' : ''}`}
              onClick={() => onChange(layer.id)}
              title={layer.title}
              aria-pressed={isActive}
            >
              <div
                className={`mls-thumb ${!layer.thumb ? 'mls-thumb--grid' : ''}`}
                style={layer.thumb ? { backgroundImage: `url(${layer.thumb})` } : undefined}
              >
                {!layer.thumb && <Grid3X3 size={14} className="mls-thumb-icon" />}
                {layer.thumb && (
                  <span className="mls-thumb-badge">
                    <MapIcon size={10} />
                  </span>
                )}
              </div>
              <span className="mls-label">{layer.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
