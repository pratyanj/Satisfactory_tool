import React, { useMemo, useState } from 'react';
import type { SaveBuilding } from '../../types/save';
import { classifyBuilding } from '../../engine/buildingClassifier';
import { gameToLatLng } from './mapUtils';

interface MapSearchProps {
  buildings: SaveBuilding[];
  mapRef: React.RefObject<any>;
}

export function MapSearch({ buildings, mapRef }: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return buildings
      .filter(b => {
        const info = classifyBuilding(b.typePath);
        return info.name.toLowerCase().includes(q) || info.category.includes(q);
      })
      .slice(0, 12);
  }, [query, buildings]);

  const flyTo = (b: SaveBuilding) => {
    const map = mapRef.current;
    if (!map) return;
    const latlng = gameToLatLng(b.position.x, b.position.y);
    map.flyTo(latlng, 1, { duration: 1.2 });
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="map-search-wrap">
      <div className="map-search-box">
        <span className="map-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search buildings…"
          value={query}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={e => setQuery(e.target.value)}
          className="map-search-input"
        />
        {query && (
          <button className="map-search-clear" onClick={() => setQuery('')}>✕</button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="map-search-results">
          {results.map((b, i) => {
            const info = classifyBuilding(b.typePath);
            return (
              <button
                key={b.instanceName + i}
                className="map-search-result-item"
                onMouseDown={() => flyTo(b)}
              >
                <span className="map-search-result-emoji">{info.emoji}</span>
                <div className="map-search-result-text">
                  <span className="map-search-result-name">{info.name}</span>
                  <span className="map-search-result-pos">
                    {Math.round(b.position.x / 100)}m, {Math.round(b.position.y / 100)}m
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
