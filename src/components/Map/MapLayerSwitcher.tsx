/**
 * MapLayerSwitcher.tsx
 * Floating bottom-right panel with map background layer thumbnails.
 * Matches the "Map layers" panel from satisfactory-calculator.com.
 */
import React from 'react';

export type MapLayerType = 'realistic' | 'blueprint' | 'blank';

export interface MapLayerConfig {
  id: MapLayerType;
  label: string;
  url: string;
  thumb: string; // used as background-color fallback
}

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'realistic',
    label: 'Realistic',
    url: '/map/world_map.jpg',
    thumb: '#1a3a2a',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    url: '/map/world_map.jpg', // same for now — will swap when topology asset added
    thumb: '#0d1b2e',
  },
  {
    id: 'blank',
    label: 'No Map',
    url: '',
    thumb: '#0a0b0d',
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
              style={{ background: layer.id === 'realistic' ? `url(${layer.url}) center/cover` : layer.thumb }}
            />
            <span className="mls-label">{layer.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
