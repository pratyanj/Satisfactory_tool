/**
 * WorldMapTab.tsx
 * Standalone World Map tab.
 *  - Always shows the Satisfactory world map + resource-node sidebar.
 *  - Optionally loads a Satisfactory .sav file and overlays the save's
 *    buildings / belts / pipes / power lines / players on the same map.
 *
 * Save parsing reuses engine/saveParser.ts (which wraps
 * @etothepii/satisfactory-file-parser). The parsed data is fed straight into
 * <WorldMap>, which already knows how to render every layer.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type L from 'leaflet';
import { WorldMap } from './WorldMap';
import { ResourceNodeSidebar, ResourceCounts, Purity } from './ResourceNodeSidebar';
import { LayerControls, LayerState, defaultLayerState } from './LayerControls';
import type { MapLayerType } from './MapLayerSwitcher';
import { parseSaveFile, ParseProgress } from '../../engine/saveParser';
import type { ParsedSave } from '../../types/save';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PURITIES: Purity[] = ['Impure', 'Normal', 'Pure'];

/** Build a new Map<resource, Set<purity>> with every entry fully selected. */
function buildSelectAll(counts: ResourceCounts): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const resource of Object.keys(counts)) {
    m.set(resource, new Set(PURITIES));
  }
  return m;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WorldMapTab() {
  // ── Map state ───────────────────────────────────────────────────────────────
  const [mapLayer, setMapLayer] = useState<MapLayerType>('realistic');
  const mapRef = useRef<L.Map | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Layer visibility. Resource nodes default ON for the world map; building /
  // infra layers come from defaultLayerState (already ON) so a loaded save's
  // machines appear immediately.
  const [layers, setLayers] = useState<LayerState>(() => ({
    ...defaultLayerState(),
    resourceNodes: true,
  }));

  // ── Save loading state ────────────────────────────────────────────────────
  const [save, setSave] = useState<ParsedSave | null>(null);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.sav')) {
      setError('Please choose a Satisfactory .sav file.');
      return;
    }
    setError(null);
    setProgress({ progress: 0.02, message: 'Reading file…' });

    try {
      const buffer = await file.arrayBuffer();
      // The parser is synchronous and blocks the main thread; yield once so the
      // "Parsing…" message paints before the freeze.
      setProgress({ progress: 0.05, message: 'Parsing save… (large saves take a few seconds)' });
      await new Promise(r => setTimeout(r, 60));

      const result = await parseSaveFile(file.name.replace(/\.sav$/i, ''), buffer, setProgress);
      setSave(result);
      setProgress(null);
    } catch (err: any) {
      console.error('[WorldMapTab] save parse failed', err);
      setError(err?.message ?? 'Failed to parse save file.');
      setProgress(null);
    }
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // allow re-selecting the same file
  }, [handleFile]);

  const clearSave = useCallback(() => {
    setSave(null);
    setError(null);
    setProgress(null);
  }, []);

  const openPicker = useCallback(() => fileInputRef.current?.click(), []);

  // ── Resource data ────────────────────────────────────────────────────────────
  const [counts, setCounts] = useState<ResourceCounts>({});

  useEffect(() => {
    fetch('/data/resource_nodes.json')
      .then(r => r.json())
      .then((nodes: { resource: string; purity: string }[]) => {
        const c: ResourceCounts = {};
        for (const node of nodes) {
          if (!c[node.resource]) {
            c[node.resource] = { Impure: 0, Normal: 0, Pure: 0 };
          }
          const p = node.purity as Purity;
          if (p in c[node.resource]) {
            c[node.resource][p]++;
          }
        }
        setCounts(c);
      })
      .catch(console.error);
  }, []);

  // ── Active filters — default: Iron Ore, all purities ────────────────────────
  const [activeFilters, setActiveFilters] = useState<Map<string, Set<string>>>(
    () => new Map([['Iron Ore', new Set<string>(['Impure', 'Normal', 'Pure'])]])
  );

  const handleToggle = useCallback((resource: string, purity: Purity) => {
    setActiveFilters(prev => {
      const next = new Map<string, Set<string>>(prev);
      const existing = next.get(resource);

      if (existing) {
        const newSet = new Set<string>([...existing]);
        if (newSet.has(purity)) {
          newSet.delete(purity);
          if (newSet.size === 0) {
            next.delete(resource);  // remove resource entirely when no purities active
          } else {
            next.set(resource, newSet);
          }
        } else {
          newSet.add(purity);
          next.set(resource, newSet);
        }
      } else {
        next.set(resource, new Set([purity]));
      }
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setActiveFilters(new Map());
  }, []);

  const handleSelectAll = useCallback(() => {
    setActiveFilters(buildSelectAll(counts));
  }, [counts]);

  const pct = progress ? Math.round(progress.progress * 100) : 0;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="wmt-root" style={{ flex: 1, minHeight: 0 }}>
      {/* ── Single left sidebar: save + layers + resource nodes ───── */}
      <div className={`wmt-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <button
          className="wmt-sidebar-toggle"
          onClick={() => setIsSidebarOpen(prev => !prev)}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? '◀' : '▶'}
        </button>
        <div className="wmt-side-top">
          <input
            ref={fileInputRef}
            type="file"
            accept=".sav"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />

          {!save ? (
            <button className="wmt-load-btn" onClick={openPicker} disabled={!!progress}>
              📁 Load Save&nbsp;(.sav)
            </button>
          ) : (
            <div className="wmt-save-card">
              <div className="wmt-save-head">
                <span className="wmt-save-name" title={save.saveName}>💾 {save.saveName}</span>
                <button className="wmt-save-clear" title="Clear save" onClick={clearSave}>✕</button>
              </div>
              <div className="wmt-save-stats">
                <span>{save.buildings.length.toLocaleString()} buildings</span>
                <span>{save.conveyors.length.toLocaleString()} belts</span>
                <span>{save.pipes.length.toLocaleString()} pipes</span>
                <span>{save.powerLines.length.toLocaleString()} power</span>
              </div>
              <div className="wmt-save-actions">
                <button onClick={openPicker}>Load different</button>
                <button onClick={() => setShowLayers(v => !v)}>
                  {showLayers ? 'Hide layers' : 'Show layers'}
                </button>
              </div>
            </div>
          )}

          {progress && (
            <div className="wmt-progress">
              <div className="wmt-progress-msg">{progress.message}</div>
              <div className="wmt-progress-track">
                <div className="wmt-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {error && <div className="wmt-save-error">⚠ {error}</div>}

          {save && showLayers && (
            <div className="wmt-layers-panel">
              <LayerControls
                layers={layers}
                onChange={setLayers}
                buildingCount={save.buildings.length}
                conveyorCount={save.conveyors.length}
                pipeCount={save.pipes.length}
                powerLineCount={save.powerLines.length}
              />
            </div>
          )}
        </div>

        <ResourceNodeSidebar
          counts={counts}
          activeFilters={activeFilters}
          onToggle={handleToggle}
          onClearAll={handleClearAll}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* ── Map ─────────────────────────────────────────────────── */}
      <div className="wmt-map">
        <WorldMap
          buildings={save?.buildings ?? []}
          conveyors={save?.conveyors ?? []}
          pipes={save?.pipes ?? []}
          powerLines={save?.powerLines ?? []}
          players={save?.players ?? []}
          layers={layers}
          mapRef={mapRef}
          saveName={save?.saveName}
          mapLayer={mapLayer}
          onMapLayerChange={setMapLayer}
          activeFilters={activeFilters}
        />
      </div>
    </div>
  );
}
