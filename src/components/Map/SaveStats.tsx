import React from 'react';
import type { ParsedSave } from '../../types/save';
import { classifyBuilding, BuildingCategory, CATEGORY_LABELS } from '../../engine/buildingClassifier';

interface SaveStatsProps {
  save: ParsedSave;
  onClear: () => void;
}

export function SaveStats({ save, onClear }: SaveStatsProps) {
  // Count buildings per category
  const byCat = React.useMemo(() => {
    const counts: Partial<Record<BuildingCategory, number>> = {};
    for (const b of save.buildings) {
      const info = classifyBuilding(b.typePath);
      counts[info.category] = (counts[info.category] ?? 0) + 1;
    }
    return counts;
  }, [save.buildings]);

  return (
    <div className="map-stats-panel">
      <div className="map-stats-header">
        <div className="map-stats-title">
          <span>📊</span>
          <span>{save.saveName}</span>
        </div>
        <button className="map-stats-clear" onClick={onClear} title="Load different save">
          ✕
        </button>
      </div>

      <div className="map-stats-grid">
        <div className="map-stat-chip">
          <span className="map-stat-value">{save.buildings.length.toLocaleString()}</span>
          <span className="map-stat-label">Buildings</span>
        </div>
        <div className="map-stat-chip">
          <span className="map-stat-value">{save.conveyors.length.toLocaleString()}</span>
          <span className="map-stat-label">Belts</span>
        </div>
        <div className="map-stat-chip">
          <span className="map-stat-value">{save.pipes.length.toLocaleString()}</span>
          <span className="map-stat-label">Pipes</span>
        </div>
        <div className="map-stat-chip">
          <span className="map-stat-value">{save.powerLines.length.toLocaleString()}</span>
          <span className="map-stat-label">Power Lines</span>
        </div>
      </div>

      <div className="map-stats-breakdown">
        {Object.entries(byCat)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 6)
          .map(([cat, count]) => (
            <div key={cat} className="map-stats-row">
              <span className="map-stats-cat">{CATEGORY_LABELS[cat as BuildingCategory]}</span>
              <span className="map-stats-count">{count}</span>
            </div>
          ))}
      </div>

      <div className="map-stats-time">
        Parsed {new Date(save.parsedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
