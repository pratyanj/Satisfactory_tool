/**
 * StatusLight.tsx
 * Renders an in-game status indicator light using CDN images from SC-InteractiveMap.
 * Matches the TXUI_IndicatorPanel_Light_*.png assets.
 */
import React from 'react';

const CDN = 'https://raw.githubusercontent.com/AnthorNet/SC-InteractiveMap/dev/img/';

export type BuildingStatus = 'operational' | 'overclock' | 'caution' | 'standby' | 'unknown';

interface StatusConfig {
  img: string;
  label: string;
  color: string;
}

const STATUS_CONFIG: Record<BuildingStatus, StatusConfig> = {
  operational: {
    img: `${CDN}TXUI_IndicatorPanel_Light_Operational.png`,
    label: 'Operational',
    color: '#22c55e',
  },
  overclock: {
    img: `${CDN}TXUI_IndicatorPanel_Light_Overclock.png`,
    label: 'Overclocked',
    color: '#f97316',
  },
  caution: {
    img: `${CDN}TXUI_IndicatorPanel_Light_Caution.png`,
    label: 'Low Efficiency',
    color: '#eab308',
  },
  standby: {
    img: `${CDN}TXUI_IndicatorPanel_Light_Error.png`,
    label: 'Standby / Off',
    color: '#ef4444',
  },
  unknown: {
    img: `${CDN}TXUI_IndicatorPanel_Light_Caution.png`,
    label: 'Unknown',
    color: '#6b7280',
  },
};

/** Derive a building's operational status from its save properties */
export function getStatus(properties: Record<string, unknown>): BuildingStatus {
  // mIsInStandby → standby mode
  const standby =
    (properties?.mIsInStandby as any)?.value === true ||
    properties?.mIsInStandby === true;
  if (standby) return 'standby';

  // mCurrentPotential → 0..1 (or >1 if overclocked)
  const rawPotential = (properties?.mCurrentPotential as any)?.value;
  const potential = typeof rawPotential === 'number' ? rawPotential : null;

  if (potential !== null) {
    if (potential > 1.001) return 'overclock';
    if (potential < 0.01) return 'standby';
    if (potential < 0.5) return 'caution';
    return 'operational';
  }

  return 'unknown';
}

interface StatusLightProps {
  status: BuildingStatus;
  /** If true, renders only a small colored dot (for compact contexts) */
  compact?: boolean;
}

export function StatusLight({ status, compact = false }: StatusLightProps) {
  const cfg = STATUS_CONFIG[status];

  if (compact) {
    return (
      <span
        className="map-status-dot"
        style={{ background: cfg.color }}
        title={cfg.label}
      />
    );
  }

  return (
    <div className="map-status-light">
      <img
        src={cfg.img}
        alt={cfg.label}
        className="map-status-light-img"
        onError={(e) => {
          // Fallback to colored dot if CDN image fails
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="map-status-light-label" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  );
}
