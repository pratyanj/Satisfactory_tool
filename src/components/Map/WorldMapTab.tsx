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

  // Layer visibility
  const [layers, setLayers] = useState<LayerState>(() => ({
    ...defaultLayerState(),
    resourceNodes: true,
  }));

  // ── Save loading state ────────────────────────────────────────────────────
  const [save, setSave] = useState<ParsedSave | null>(null);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  // ── Resource data & Collectibles state ───────────────────────────────────────
  const [nodeCounts, setNodeCounts] = useState<ResourceCounts>({});
  const [wellCounts, setWellCounts] = useState<ResourceCounts>({});
  const [activeCollectibles, setActiveCollectibles] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    fetch('/data/resource_nodes.json')
      .then(r => r.json())
      .then((nodes: { resource: string; purity: string; type: string }[]) => {
        const nodesC: ResourceCounts = {};
        const wellsC: ResourceCounts = {};
        for (const node of nodes) {
          const isWell = node.type === 'well' || node.type === 'geyser';
          const target = isWell ? wellsC : nodesC;
          if (!target[node.resource]) {
            target[node.resource] = { Impure: 0, Normal: 0, Pure: 0 };
          }
          const p = node.purity as Purity;
          if (p in target[node.resource]) {
            target[node.resource][p]++;
          }
        }
        setNodeCounts(nodesC);
        setWellCounts(wellsC);
      })
      .catch(console.error);
  }, []);

  // ── Active filters ──────────────────────────────────────────────────────────
  const [activeFilters, setActiveFilters] = useState<Map<string, Set<string>>>(
    () => new Map([['Iron Ore', new Set<string>(['Impure', 'Normal', 'Pure'])]])
  );

  const handleToggle = useCallback((resource: string, purity: Purity, type: string) => {
    setActiveFilters(prev => {
      const next = new Map<string, Set<string>>(prev);
      const isWell = type === 'well' || type === 'geyser';
      const mapKey = isWell ? `${resource} (Well)` : resource;
      const existing = next.get(mapKey);

      if (existing) {
        const newSet = new Set<string>([...existing]);
        if (newSet.has(purity)) {
          newSet.delete(purity);
          if (newSet.size === 0) {
            next.delete(mapKey);
          } else {
            next.set(mapKey, newSet);
          }
        } else {
          newSet.add(purity);
          next.set(mapKey, newSet);
        }
      } else {
        next.set(mapKey, new Set([purity]));
      }
      return next;
    });
  }, []);

  const handleToggleCollectible = useCallback((type: string) => {
    setActiveCollectibles(prev => {
      const next = new Set<string>(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setActiveFilters(new Map());
  }, []);

  const handleTogglePurityAll = useCallback((purity: Purity) => {
    setActiveFilters(prev => {
      const next = new Map<string, Set<string>>(prev);
      const allResources = [...Object.keys(nodeCounts), ...Object.keys(wellCounts).map(k => `${k} (Well)`)];
      if (allResources.length === 0) return prev;

      let allSelected = true;
      for (const resource of allResources) {
        const existing = next.get(resource);
        if (!existing || !existing.has(purity)) {
          allSelected = false;
          break;
        }
      }

      if (allSelected) {
        for (const resource of allResources) {
          const existing = next.get(resource);
          if (existing) {
            const newSet = new Set<string>(existing);
            newSet.delete(purity);
            if (newSet.size === 0) {
              next.delete(resource);
            } else {
              next.set(resource, newSet);
            }
          }
        }
      } else {
        for (const resource of allResources) {
          const existing = next.get(resource) ?? new Set<string>();
          const newSet = new Set<string>(existing);
          newSet.add(purity);
          next.set(resource, newSet);
        }
      }
      return next;
    });
  }, [nodeCounts, wellCounts]);

  const handleShowPurityOnly = useCallback((purity: Purity) => {
    setActiveFilters(() => {
      const next = new Map<string, Set<string>>();
      const allResources = [...Object.keys(nodeCounts), ...Object.keys(wellCounts).map(k => `${k} (Well)`)];
      for (const resource of allResources) {
        next.set(resource, new Set([purity]));
      }
      return next;
    });
  }, [nodeCounts, wellCounts]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="wmt-root" style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* ── Single left sidebar: save + layers + resource nodes ───── */}
      <div className={`wmt-sidebar ${isSidebarOpen ? 'is-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
        <button
          className="wmt-sidebar-toggle"
          onClick={() => setIsSidebarOpen(prev => !prev)}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? '◀' : '▶'}
        </button>

        <ResourceNodeSidebar
          save={save}
          progress={progress}
          error={error}
          onFileChange={onFileChange}
          onClearSave={clearSave}
          onOpenPicker={openPicker}
          fileInputRef={fileInputRef}
          layers={layers}
          onLayersChange={setLayers}
          nodeCounts={nodeCounts}
          wellCounts={wellCounts}
          activeFilters={activeFilters}
          onToggle={handleToggle}
          onTogglePurityAll={handleTogglePurityAll}
          onShowPurityOnly={handleShowPurityOnly}
          onClearAll={handleClearAll}
          activeCollectibles={activeCollectibles}
          onToggleCollectible={handleToggleCollectible}
        />
      </div>

      {/* ── Map ─────────────────────────────────────────────────── */}
      <div className="wmt-map" style={{ flex: 1, height: '100%', position: 'relative', minWidth: 0 }}>
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
          activeCollectibles={activeCollectibles}
        />
      </div>
    </div>
  );
}
