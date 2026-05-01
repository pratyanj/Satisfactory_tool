/**
 * AltitudeFilter.tsx
 * Dual-thumb range slider for filtering map buildings by Z altitude (metres).
 * Floats above the status bar at the bottom of the map.
 * Matches the altitude filter slider from satisfactory-calculator.com.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface AltitudeRange {
  low: number;
  high: number;
}

interface AltitudeFilterProps {
  /** Full range from the parsed save data (in metres) */
  min: number;
  max: number;
  /** Current active range */
  value: AltitudeRange;
  onChange: (range: AltitudeRange) => void;
}

export function AltitudeFilter({ min, max, value, onChange }: AltitudeFilterProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Clamp helpers
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const setLow = useCallback(
    (v: number) => onChange({ low: clamp(v, min, value.high - 1), high: value.high }),
    [min, value.high, onChange],
  );

  const setHigh = useCallback(
    (v: number) => onChange({ low: value.low, high: clamp(v, value.low + 1, max) }),
    [max, value.low, onChange],
  );

  // Percentage helpers for track fill
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const lowPct  = pct(value.low);
  const highPct = pct(value.high);

  const isFullRange = value.low === min && value.high === max;

  return (
    <div className="alt-root">
      <span className="alt-label">Filter Altitudes</span>

      <div className="alt-slider-wrap" ref={trackRef}>
        {/* Track fill between thumbs */}
        <div
          className="alt-track-fill"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />

        {/* Low thumb */}
        <input
          type="range"
          className="alt-range alt-range--low"
          min={min}
          max={max}
          value={value.low}
          onChange={e => setLow(Number(e.target.value))}
        />

        {/* High thumb */}
        <input
          type="range"
          className="alt-range alt-range--high"
          min={min}
          max={max}
          value={value.high}
          onChange={e => setHigh(Number(e.target.value))}
        />
      </div>

      <div className="alt-values">
        <span className="alt-val">{value.low}m</span>
        <span className="alt-sep">–</span>
        <span className="alt-val">{value.high}m</span>
        {!isFullRange && (
          <button
            className="alt-reset"
            onClick={() => onChange({ low: min, high: max })}
            title="Reset altitude filter"
          >
            ✕
          </button>
        )}
      </div>

      <span className="alt-unit">in metres</span>
    </div>
  );
}
