/**
 * ResourceNodeSidebar.tsx — FICSIT World Map Telemetry Sidebar
 *
 * Provides save telemetry & layer controls, resource node/well purity filtering,
 * search filtering, and a collapsible collectibles dock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Droplets,
  HardDrive,
  Layers,
  Radar,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { ParsedSave } from '../../types/save';
import type { ParseProgress } from '../../engine/saveParser';
import { AppImage } from '../AppImage';
import { LayerControls, LayerState } from './LayerControls';
import { collectibleImg } from './CollectibleLayer';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Purity = 'Impure' | 'Normal' | 'Pure';

export interface ResourceCounts {
  [resource: string]: {
    Impure: number;
    Normal: number;
    Pure: number;
  };
}

interface ResourceNodeSidebarProps {
  save: ParsedSave | null;
  progress: ParseProgress | null;
  error: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSave: () => void;
  onOpenPicker: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;

  layers: LayerState;
  onLayersChange: (layers: LayerState) => void;

  nodeCounts: ResourceCounts;
  wellCounts: ResourceCounts;
  activeFilters: Map<string, Set<string>>;
  onToggle: (resource: string, purity: Purity, type: string) => void;
  onTogglePurityAll: (purity: Purity) => void;
  onShowPurityOnly: (purity: Purity) => void;
  onClearAll: () => void;

  activeCollectibles: Set<string>;
  onToggleCollectible: (type: string) => void;
}

type TopTab = 'layers' | 'nodes' | 'wells';
type BottomTab = 'slugs' | 'artifacts' | 'collectibles';

interface CollectibleItemMeta {
  type: string;
  label: string;
  shortLabel: string;
  count: number;
  accent: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PURITIES: Purity[] = ['Impure', 'Normal', 'Pure'];

const PURITY_META: Record<Purity, { code: string; color: string; bg: string; border: string }> = {
  Impure: {
    code: 'I',
    color: '#f87171',
    bg: 'rgba(220, 38, 38, 0.16)',
    border: 'rgba(248, 113, 113, 0.65)',
  },
  Normal: {
    code: 'N',
    color: '#fb923c',
    bg: 'rgba(249, 115, 22, 0.16)',
    border: 'rgba(251, 146, 60, 0.65)',
  },
  Pure: {
    code: 'P',
    color: '#4ade80',
    bg: 'rgba(34, 197, 94, 0.16)',
    border: 'rgba(74, 222, 128, 0.65)',
  },
};

const RESOURCE_IMAGE_KEY: Record<string, string> = {
  'Iron Ore': 'iron_ore',
  'Copper Ore': 'copper_ore',
  'Limestone': 'limestone',
  'Coal': 'coal',
  'Crude Oil': 'crude_oil',
  'Sulfur': 'sulfur',
  'Bauxite': 'bauxite',
  'Raw Quartz': 'raw_quartz',
  'Uranium': 'uranium',
  'SAM Ore': 'sam',
  'Nitrogen Gas': 'nitrogen_gas',
  'Water': 'water',
  'Caterium Ore': 'caterium_ore',
  'Geyser': 'generator_geo_thermal',
};

const COLLECTIBLE_GROUPS: Record<BottomTab, CollectibleItemMeta[]> = {
  slugs: [
    { type: 'blue_slug', label: 'Blue Power Slug', shortLabel: 'Blue Slug', count: 596, accent: '#3b82f6' },
    { type: 'yellow_slug', label: 'Yellow Power Slug', shortLabel: 'Yellow Slug', count: 389, accent: '#eab308' },
    { type: 'purple_slug', label: 'Purple Power Slug', shortLabel: 'Purple Slug', count: 257, accent: '#a855f7' },
  ],
  artifacts: [
    { type: 'mercer_sphere', label: 'Mercer Sphere', shortLabel: 'Mercer Sphere', count: 298, accent: '#f43f5e' },
    { type: 'somersloop', label: 'Somersloop', shortLabel: 'Somersloop', count: 106, accent: '#f48721' },
  ],
  collectibles: [
    { type: 'hard_drive', label: 'Hard Drive', shortLabel: 'Hard Drive', count: 118, accent: '#f48721' },
    { type: 'paleberry', label: 'Paleberry', shortLabel: 'Paleberry', count: 2154, accent: '#ef4444' },
    { type: 'beryl_nut', label: 'Beryl Nut', shortLabel: 'Beryl Nut', count: 1515, accent: '#d97706' },
    { type: 'bacon_agaric', label: 'Bacon Agaric', shortLabel: 'Bacon Agaric', count: 1615, accent: '#ec4899' },
  ],
};

// ─── Sub-component: Purity Pill Button ────────────────────────────────────────
function PurityPill({
  resource,
  purity,
  count,
  active,
  onToggle,
}: {
  resource: string;
  purity: Purity;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  const meta = PURITY_META[purity];
  const disabled = count === 0;

  return (
    <button
      type="button"
      className={`rn-purity-pill ${active ? 'is-active' : 'is-inactive'}`}
      style={{
        '--purity-color': meta.color,
        '--purity-bg': meta.bg,
        '--purity-border': meta.border,
      } as React.CSSProperties}
      onClick={onToggle}
      title={disabled ? `${resource} — No ${purity} nodes` : `${resource} — ${purity} (${count})`}
      aria-pressed={active}
      disabled={disabled}
    >
      <span className="rn-purity-code">{meta.code}</span>
      <span className="rn-purity-count">{disabled ? '—' : count}</span>
    </button>
  );
}

// ─── Sub-component: Collectible Telemetry Chip ────────────────────────────────
function CollectibleChip({
  item,
  active,
  onToggle,
}: {
  item: CollectibleItemMeta;
  active: boolean;
  onToggle: () => void;
}) {
  const imgSrc = collectibleImg(item.type);

  return (
    <button
      type="button"
      className={`wmt-collectible-chip ${active ? 'is-active' : ''}`}
      style={{ '--chip-accent': item.accent } as React.CSSProperties}
      onClick={onToggle}
      title={`${item.label} (${item.count.toLocaleString()} locations)`}
      aria-pressed={active}
    >
      <span className="wmt-collectible-chip-icon">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.label}
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Sparkles size={14} />
        )}
      </span>
      <span className="wmt-collectible-chip-meta">
        <span className="wmt-collectible-chip-name">{item.shortLabel}</span>
        <span className="wmt-collectible-chip-count">{item.count.toLocaleString()}</span>
      </span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ResourceNodeSidebar({
  save,
  progress,
  error,
  onFileChange,
  onClearSave,
  onOpenPicker,
  fileInputRef,
  layers,
  onLayersChange,
  nodeCounts,
  wellCounts,
  activeFilters,
  onToggle,
  onTogglePurityAll,
  onShowPurityOnly,
  onClearAll,
  activeCollectibles,
  onToggleCollectible,
}: ResourceNodeSidebarProps) {
  const [topTab, setTopTab] = useState<TopTab>('nodes');
  const [bottomTab, setBottomTab] = useState<BottomTab>('slugs');
  const [searchQuery, setSearchQuery] = useState('');
  const [collectiblesOpen, setCollectiblesOpen] = useState(true);

  useEffect(() => {
    if (!save && topTab === 'layers') {
      setTopTab('nodes');
    }
  }, [save, topTab]);

  const sortedNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.entries(nodeCounts)
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .sort(([, a], [, b]) => b.Impure + b.Normal + b.Pure - (a.Impure + a.Normal + a.Pure));
  }, [nodeCounts, searchQuery]);

  const sortedWells = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.entries(wellCounts)
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .sort(([, a], [, b]) => b.Impure + b.Normal + b.Pure - (a.Impure + a.Normal + a.Pure));
  }, [wellCounts, searchQuery]);

  const activeNodeFilterCount = useMemo(() => {
    let count = 0;
    for (const [key, set] of activeFilters.entries()) {
      const isWell = key.endsWith(' (Well)');
      if ((topTab === 'wells' && isWell) || (topTab !== 'wells' && !isWell)) {
        count += set.size;
      }
    }
    return count;
  }, [activeFilters, topTab]);

  const totalActiveFilters = useMemo(() => {
    let count = 0;
    for (const set of activeFilters.values()) {
      count += set.size;
    }
    return count;
  }, [activeFilters]);

  const pct = progress ? Math.round(progress.progress * 100) : 0;
  const activeResourceKeys = topTab === 'wells'
    ? Object.keys(wellCounts).map((k) => `${k} (Well)`)
    : Object.keys(nodeCounts);

  const displayedList = topTab === 'wells' ? sortedWells : sortedNodes;

  return (
    <aside className="rn-sidebar">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sav"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />

      {/* ── FICSIT Header + Save Status Strip ── */}
      <div className="rn-header">
        <div className="rn-header-top">
          <div className="rn-header-title">
            <span className="rn-header-accent" />
            <Radar size={13} className="rn-header-icon" />
            <span>FICSIT // SECTOR ATLAS</span>
          </div>
          <span className="rn-active-summary">
            {totalActiveFilters + activeCollectibles.size} ACTIVE
          </span>
        </div>

        {/* Save file control strip */}
        <div className="rn-save-bar">
          {!save ? (
            <div className="rn-save-empty">
              <div className="rn-save-empty-info">
                <HardDrive size={13} className="rn-save-empty-icon" />
                <span>Save Overlay</span>
                <span className="rn-save-empty-hint">.SAV</span>
              </div>
              <button
                type="button"
                className="rn-save-upload-btn"
                onClick={onOpenPicker}
                disabled={!!progress}
              >
                <Upload size={12} />
                <span>Load Save</span>
              </button>
            </div>
          ) : (
            <div className="rn-save-loaded">
              <div className="rn-save-loaded-top">
                <span className="rn-save-loaded-name" title={save.saveName}>
                  <span className="rn-save-dot" />
                  {save.saveName}
                </span>
                <div className="rn-save-loaded-actions">
                  <button
                    type="button"
                    className="rn-save-mini-btn"
                    onClick={onOpenPicker}
                    title="Load different save"
                  >
                    Swap
                  </button>
                  <button
                    type="button"
                    className="rn-save-clear-btn"
                    onClick={onClearSave}
                    title="Unload save"
                    aria-label="Unload save"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="rn-save-telemetry-row">
                <span>{save.buildings.length.toLocaleString()} bldgs</span>
                <span>{save.conveyors.length.toLocaleString()} belts</span>
                <span>{save.pipes.length.toLocaleString()} pipes</span>
                <span>{save.powerLines.length.toLocaleString()} pwr</span>
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

          {error && <div className="wmt-save-error">{error}</div>}
        </div>
      </div>

      {/* ── Navigation Segmented Bar ── */}
      <div className="wmt-tab-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={topTab === 'nodes'}
          className={`wmt-tab-btn ${topTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setTopTab('nodes')}
        >
          <Cpu size={12} />
          <span>Nodes</span>
          <span className="wmt-tab-count">{Object.keys(nodeCounts).length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={topTab === 'wells'}
          className={`wmt-tab-btn ${topTab === 'wells' ? 'active' : ''}`}
          onClick={() => setTopTab('wells')}
        >
          <Droplets size={12} />
          <span>Wells</span>
          <span className="wmt-tab-count">{Object.keys(wellCounts).length}</span>
        </button>

        {save && (
          <button
            type="button"
            role="tab"
            aria-selected={topTab === 'layers'}
            className={`wmt-tab-btn ${topTab === 'layers' ? 'active' : ''}`}
            onClick={() => setTopTab('layers')}
          >
            <Layers size={12} />
            <span>Layers</span>
          </button>
        )}
      </div>

      {/* ── Top Panel View ── */}
      <div className="wmt-panel-content">
        {topTab === 'layers' && save ? (
          <div className="wmt-side-top">
            <div className="wmt-layers-panel">
              <LayerControls
                layers={layers}
                onChange={onLayersChange}
                buildingCount={save.buildings.length}
                conveyorCount={save.conveyors.length}
                pipeCount={save.pipes.length}
                powerLineCount={save.powerLines.length}
              />
            </div>
          </div>
        ) : (
          <div className="wmt-nodes-panel">
            {/* Search & Purity Quick Toolbar */}
            <div className="wmt-filter-deck">
              <div className="wmt-search-row">
                <div className="wmt-search-box">
                  <Search size={12} className="wmt-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Filter ${topTab === 'wells' ? 'resource wells' : 'resource nodes'}...`}
                    className="wmt-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="wmt-search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear filter"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className={`wmt-clear-btn ${totalActiveFilters > 0 ? 'has-active' : ''}`}
                  onClick={onClearAll}
                  disabled={totalActiveFilters === 0}
                  title="Clear all active resource & well filters"
                >
                  <X size={11} />
                  <span>Clear</span>
                </button>
              </div>

              <div className="wmt-purity-bar">
                <div className="wmt-purity-group">
                  <span className="wmt-purity-group-label">Toggle</span>
                  <div className="wmt-purity-chip-row">
                    {PURITIES.map((p) => {
                      const meta = PURITY_META[p];
                      const isAllActive =
                        activeResourceKeys.length > 0 &&
                        activeResourceKeys.every((res) => activeFilters.get(res)?.has(p) ?? false);
                      return (
                        <button
                          key={`toggle-${p}`}
                          type="button"
                          className={`wmt-purity-chip ${isAllActive ? 'is-active' : ''}`}
                          style={{
                            '--purity-color': meta.color,
                            '--purity-bg': meta.bg,
                            '--purity-border': meta.border,
                          } as React.CSSProperties}
                          onClick={() => onTogglePurityAll(p)}
                          title={`Toggle all ${p} nodes & wells`}
                        >
                          {meta.code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <span className="wmt-purity-divider" />

                <div className="wmt-purity-group">
                  <span className="wmt-purity-group-label">Solo</span>
                  <div className="wmt-purity-chip-row">
                    {PURITIES.map((p) => {
                      const meta = PURITY_META[p];
                      return (
                        <button
                          key={`solo-${p}`}
                          type="button"
                          className="wmt-purity-chip wmt-purity-chip--solo"
                          style={{
                            '--purity-color': meta.color,
                            '--purity-bg': meta.bg,
                            '--purity-border': meta.border,
                          } as React.CSSProperties}
                          onClick={() => onShowPurityOnly(p)}
                          title={`Show only ${p} nodes & wells`}
                        >
                          {meta.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Table Column Header */}
            <div className="rn-col-headers">
              <span className="rn-col-resource-label">
                {topTab === 'wells' ? 'Well Resource' : 'Node Resource'}
                {activeNodeFilterCount > 0 && (
                  <span className="rn-col-active-pill">{activeNodeFilterCount} on</span>
                )}
              </span>
              <div className="rn-col-purity-grid">
                {PURITIES.map((p) => (
                  <span
                    key={p}
                    className="rn-col-purity-label"
                    style={{ color: PURITY_META[p].color }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Resource Cards List */}
            <div className="rn-resource-list">
              {displayedList.length === 0 ? (
                <div className="rn-empty-state">
                  No resources match "{searchQuery}"
                </div>
              ) : (
                displayedList.map(([resource, purityCounts]) => {
                  const mapKey = topTab === 'wells' ? `${resource} (Well)` : resource;
                  const activeSet = activeFilters.get(mapKey);
                  const hasAnyActive = (activeSet?.size ?? 0) > 0;
                  const total = purityCounts.Impure + purityCounts.Normal + purityCounts.Pure;
                  const nodeType = topTab === 'wells' ? 'well' : 'node';
                  const imgKey = RESOURCE_IMAGE_KEY[resource] ?? '';

                  return (
                    <div
                      key={resource}
                      className={`rn-resource-row ${hasAnyActive ? 'is-selected' : ''}`}
                    >
                      <div className="rn-resource-left">
                        <div className="rn-resource-icon-col">
                          {imgKey ? (
                            <AppImage
                              idKey={imgKey}
                              alt={resource}
                              className="rn-row-img"
                              draggable={false}
                            />
                          ) : (
                            <Droplets size={16} />
                          )}
                        </div>
                        <div className="rn-resource-meta">
                          <span className="rn-resource-name" title={resource}>{resource}</span>
                          <span className="rn-resource-total-badge">{total} nodes</span>
                        </div>
                      </div>

                      <div className="rn-purity-grid">
                        {PURITIES.map((purity) => (
                          <PurityPill
                            key={purity}
                            resource={resource}
                            purity={purity}
                            count={purityCounts[purity]}
                            active={activeSet?.has(purity) ?? false}
                            onToggle={() => onToggle(resource, purity, nodeType)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Collapsible Bottom Collectibles Dock ── */}
      <div className={`wmt-bottom-collectibles ${collectiblesOpen ? 'is-open' : 'is-collapsed'}`}>
        <div className="wmt-bottom-header">
          <div className="wmt-bottom-tabs" role="tablist">
            {(
              [
                { id: 'slugs', label: 'Slugs' },
                { id: 'artifacts', label: 'Artifacts' },
                { id: 'collectibles', label: 'World' },
              ] as const
            ).map((tab) => {
              const activeInGroup = COLLECTIBLE_GROUPS[tab.id].filter((c) =>
                activeCollectibles.has(c.type)
              ).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={bottomTab === tab.id}
                  className={`wmt-bottom-tab-btn ${bottomTab === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setBottomTab(tab.id);
                    if (!collectiblesOpen) setCollectiblesOpen(true);
                  }}
                >
                  <span>{tab.label}</span>
                  {activeInGroup > 0 && (
                    <span className="wmt-bottom-tab-dot">{activeInGroup}</span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="wmt-collapse-btn"
            onClick={() => setCollectiblesOpen((prev) => !prev)}
            title={collectiblesOpen ? 'Collapse collectibles panel' : 'Expand collectibles panel'}
            aria-label={collectiblesOpen ? 'Collapse collectibles panel' : 'Expand collectibles panel'}
          >
            {collectiblesOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {collectiblesOpen && (
          <div className="wmt-bottom-panel-content">
            <div className="wmt-collectible-grid">
              {COLLECTIBLE_GROUPS[bottomTab].map((item) => (
                <CollectibleChip
                  key={item.type}
                  item={item}
                  active={activeCollectibles.has(item.type)}
                  onToggle={() => onToggleCollectible(item.type)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
