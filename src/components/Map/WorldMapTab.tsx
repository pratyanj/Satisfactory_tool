/**
 * WorldMapTab.tsx
 * Standalone World Map tab — no save file required.
 * Shows the Satisfactory world map with a resource-node sidebar.
 *
 * State:
 *  - activeFilters: Map<resource, Set<purity>>
 *    Multi-select: each resource+purity circle is independently toggleable.
 *  - Default: Iron Ore selected with all three purities active.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type L from 'leaflet';
import { WorldMap } from './WorldMap';
import { ResourceNodeSidebar, ResourceCounts, Purity } from './ResourceNodeSidebar';
import { defaultLayerState } from './LayerControls';
import type { MapLayerType } from './MapLayerSwitcher';

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

  // We always show resource nodes in the world-map-only tab
  const layers = useMemo(() => ({
    ...defaultLayerState(),
    resourceNodes: true,
  }), []);

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

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="wmt-root" style={{ flex: 1, minHeight: 0 }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <ResourceNodeSidebar
        counts={counts}
        activeFilters={activeFilters}
        onToggle={handleToggle}
        onClearAll={handleClearAll}
        onSelectAll={handleSelectAll}
      />

      {/* ── Map ─────────────────────────────────────────────────── */}
      <div className="wmt-map">
        <WorldMap
          buildings={[]}
          conveyors={[]}
          pipes={[]}
          powerLines={[]}
          players={[]}
          layers={layers}
          mapRef={mapRef}
          mapLayer={mapLayer}
          onMapLayerChange={setMapLayer}
          activeFilters={activeFilters}
        />
      </div>
    </div>
  );
}
