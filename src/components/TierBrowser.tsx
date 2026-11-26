import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Cpu,
  Package,
  Rocket,
  RotateCcw,
  Search,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { tiers, items, buildings, type Milestone, type Tier } from '../engine/data';
import { AppImage } from './AppImage';

interface Props {
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
  onNavigateBuilding: (buildingId: string) => void;
}

interface TierMeta {
  phase: number;
  title: string;
  accent: string;
}

const STORAGE_KEY = 'ficsit_hub_completed_milestones_v1';

const TIER_META: Record<number, TierMeta> = {
  1: { phase: 1, title: 'Basic Infrastructure', accent: '#f48721' },
  2: { phase: 1, title: 'Assembly & Sink', accent: '#f48721' },
  3: { phase: 2, title: 'Coal Power & Steel', accent: '#38bdf8' },
  4: { phase: 2, title: 'Blueprints & Hypertubes', accent: '#38bdf8' },
  5: { phase: 3, title: 'Oil & Fluid Logistics', accent: '#a78bfa' },
  6: { phase: 3, title: 'Railways & Heavy Mfg', accent: '#a78bfa' },
  7: { phase: 4, title: 'Bauxite & Hoverpack', accent: '#4ade80' },
  8: { phase: 4, title: 'Nuclear & Aluminum', accent: '#4ade80' },
  9: { phase: 5, title: 'Quantum & Matter', accent: '#f43f5e' },
};

function getTierMeta(tierNum: number): TierMeta {
  return TIER_META[tierNum] ?? { phase: Math.ceil(tierNum / 2), title: `Tier ${tierNum}`, accent: '#f48721' };
}

function loadCompletedSchematics(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((s) => typeof s === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

interface AggregatedCost {
  itemId: string | null;
  name: string;
  amount: number;
}

function aggregateTierCosts(tier: Tier): AggregatedCost[] {
  const byKey = new Map<string, AggregatedCost>();
  for (const milestone of tier.milestones) {
    for (const c of milestone.cost) {
      const key = c.itemId ?? c.name;
      const existing = byKey.get(key);
      if (existing) {
        existing.amount += c.amount;
      } else {
        byKey.set(key, { itemId: c.itemId, name: c.name, amount: c.amount });
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.amount - a.amount);
}

export function TierBrowser({ onBack, onNavigateItem, onNavigateBuilding }: Props) {
  const [selectedTierNum, setSelectedTierNum] = useState<number>(() => tiers[0]?.tier ?? 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompletedSchematics());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed)));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [completed]);

  const activeTier = useMemo(
    () => tiers.find((t) => t.tier === selectedTierNum) ?? tiers[0],
    [selectedTierNum]
  );

  const phases = useMemo(() => {
    const grouped = new Map<number, Tier[]>();
    for (const tier of tiers) {
      const phase = getTierMeta(tier.tier).phase;
      const list = grouped.get(phase) ?? [];
      list.push(tier);
      grouped.set(phase, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, []);

  const totalMilestones = useMemo(
    () => tiers.reduce((acc, t) => acc + t.milestones.length, 0),
    []
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const matches: { tierNum: number; indexInTier: number; milestone: Milestone }[] = [];
    for (const t of tiers) {
      t.milestones.forEach((m, idx) => {
        const hitName = m.name.toLowerCase().includes(q);
        const hitCost = m.cost.some((c) => c.name.toLowerCase().includes(q));
        const hitUnlock = m.unlocks.some((u) => u.name.toLowerCase().includes(q));
        if (hitName || hitCost || hitUnlock) {
          matches.push({ tierNum: t.tier, indexInTier: idx + 1, milestone: m });
        }
      });
    }
    return matches;
  }, [searchQuery]);

  const activeTierCosts = useMemo(
    () => (activeTier ? aggregateTierCosts(activeTier) : []),
    [activeTier]
  );

  const toggleMilestone = (schematic: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(schematic)) next.delete(schematic);
      else next.add(schematic);
      return next;
    });
  };

  const toggleTierAll = (tier: Tier, markComplete: boolean) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      for (const m of tier.milestones) {
        if (markComplete) next.add(m.schematic);
        else next.delete(m.schematic);
      }
      return next;
    });
  };

  const activeMeta = activeTier ? getTierMeta(activeTier.tier) : getTierMeta(1);
  const activeDoneCount = activeTier
    ? activeTier.milestones.filter((m) => completed.has(m.schematic)).length
    : 0;
  const activeAllDone = activeTier ? activeDoneCount === activeTier.milestones.length : false;
  const overallPct = totalMilestones > 0 ? Math.round((completed.size / totalMilestones) * 100) : 0;

  return (
    <div className="ib-root hub-root">
      {/* ── FICSIT Telemetry Top Header ── */}
      <div className="hub-topbar">
        <div className="hub-topbar-left">
          <button type="button" className="cdx-back-btn" onClick={onBack}>
            <ArrowLeft size={13} />
            <span>Codex</span>
          </button>
          <span className="hub-topbar-accent" />
          <span className="hub-topbar-title">FICSIT // HUB PROGRESSION</span>
        </div>

        <div className="hub-topbar-right">
          <div className="hub-search-box">
            <Search size={13} className="hub-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search milestones, costs, or unlocks..."
              className="hub-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="hub-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="hub-overall-pill" title="Overall HUB milestones marked completed">
            <Rocket size={12} className="hub-overall-icon" />
            <span>
              {completed.size}/{totalMilestones}
            </span>
            <span className="hub-overall-pct">{overallPct}%</span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Console Body ── */}
      <div className="hub-console-body">
        {/* Left Phase & Tier Rail */}
        <aside className="hub-tier-rail" aria-label="HUB Tiers">
          {phases.map(([phaseNum, phaseTiers]) => (
            <div key={phaseNum} className="hub-phase-group">
              <div className="hub-phase-label">
                <span>PHASE {phaseNum}</span>
              </div>
              <div className="hub-phase-list">
                {phaseTiers.map((t) => {
                  const meta = getTierMeta(t.tier);
                  const done = t.milestones.filter((m) => completed.has(m.schematic)).length;
                  const total = t.milestones.length;
                  const isSelected = !searchResults && t.tier === activeTier?.tier;
                  const isDone = done === total && total > 0;

                  return (
                    <button
                      key={t.tier}
                      type="button"
                      className={`hub-tier-nav-btn ${isSelected ? 'is-active' : ''} ${isDone ? 'is-complete' : ''}`}
                      style={{ '--tier-accent': meta.accent } as React.CSSProperties}
                      onClick={() => {
                        setSelectedTierNum(t.tier);
                        if (searchQuery) setSearchQuery('');
                      }}
                    >
                      <div className="hub-tier-nav-top">
                        <span className="hub-tier-code">TIER {t.tier}</span>
                        <span className="hub-tier-counts">
                          {isDone ? (
                            <CheckCircle2 size={12} className="hub-tier-check-icon" />
                          ) : (
                            `${done}/${total}`
                          )}
                        </span>
                      </div>
                      <div className="hub-tier-nav-title">{meta.title}</div>
                      <div className="hub-tier-progress-track">
                        <div
                          className="hub-tier-progress-fill"
                          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Right Detail Stage */}
        <section className="hub-stage">
          {searchResults ? (
            <div className="hub-stage-inner">
              <div className="hub-search-banner">
                <div className="hub-search-banner-text">
                  <Search size={14} className="hub-search-banner-icon" />
                  <span>
                    Showing <strong>{searchResults.length}</strong>{' '}
                    {searchResults.length === 1 ? 'milestone' : 'milestones'} matching "{searchQuery}"
                  </span>
                </div>
                <button
                  type="button"
                  className="hub-action-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={12} />
                  <span>Clear Filter</span>
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="hub-empty-search">
                  No milestones, pod costs, or unlocks match "{searchQuery}".
                </div>
              ) : (
                <div className="hub-milestone-stack">
                  {searchResults.map(({ tierNum, indexInTier, milestone }) => (
                    <MilestoneRow
                      key={milestone.schematic}
                      code={`T${tierNum}.${indexInTier}`}
                      tierBadge={`TIER ${tierNum}`}
                      accent={getTierMeta(tierNum).accent}
                      milestone={milestone}
                      isCompleted={completed.has(milestone.schematic)}
                      onToggleComplete={() => toggleMilestone(milestone.schematic)}
                      onNavigateItem={onNavigateItem}
                      onNavigateBuilding={onNavigateBuilding}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : activeTier ? (
            <div className="hub-stage-inner">
              {/* Selected Tier Telemetry Banner */}
              <div
                className="hub-tier-hero"
                style={{ '--tier-accent': activeMeta.accent } as React.CSSProperties}
              >
                <div className="hub-tier-hero-top">
                  <div className="hub-tier-hero-identity">
                    <div className="hub-tier-eyebrow">
                      <span className="hub-phase-pill">SPACE ELEVATOR PHASE {activeMeta.phase}</span>
                      <span className="hub-tier-stat-pill">
                        {activeTier.milestones.length} MILESTONES
                      </span>
                      <span className="hub-tier-stat-pill">
                        {activeTier.milestones.reduce((s, m) => s + m.unlocks.length, 0)} UNLOCKS
                      </span>
                    </div>
                    <h2 className="hub-tier-hero-title">
                      TIER {activeTier.tier} <span className="hub-tier-hero-sep">//</span>{' '}
                      {activeMeta.title}
                    </h2>
                  </div>

                  <div className="hub-tier-hero-actions">
                    <div className="hub-tier-completion-badge">
                      <span>{activeDoneCount} / {activeTier.milestones.length} COMPLETE</span>
                    </div>
                    <button
                      type="button"
                      className={`hub-action-btn ${activeAllDone ? 'is-muted' : 'is-primary'}`}
                      onClick={() => toggleTierAll(activeTier, !activeAllDone)}
                    >
                      {activeAllDone ? <RotateCcw size={12} /> : <Check size={12} />}
                      <span>{activeAllDone ? 'Reset Tier' : 'Complete Tier'}</span>
                    </button>
                  </div>
                </div>

                {/* Aggregate Tier Launch Costs */}
                {activeTierCosts.length > 0 && (
                  <div className="hub-tier-manifest">
                    <div className="hub-manifest-header">
                      <span className="hub-manifest-label">
                        <Package size={12} />
                        <span>TOTAL TIER MATERIAL REQUIREMENT</span>
                      </span>
                      <span className="hub-manifest-count">
                        {activeTierCosts.length} {activeTierCosts.length === 1 ? 'part' : 'parts'}
                      </span>
                    </div>
                    <div className="hub-manifest-items">
                      {activeTierCosts.map((c) => (
                        <button
                          key={c.itemId ?? c.name}
                          type="button"
                          className="hub-manifest-card"
                          disabled={!c.itemId}
                          onClick={() => c.itemId && onNavigateItem(c.itemId)}
                          title={`${c.amount.toLocaleString()} × ${c.name}`}
                        >
                          <div className="hub-manifest-img-wrap">
                            <AppImage
                              idKey={c.itemId ?? ''}
                              fallbackUrl={c.itemId ? items[c.itemId]?.imageUrl : undefined}
                              alt={c.name}
                              className="hub-manifest-img"
                            />
                          </div>
                          <div className="hub-manifest-info">
                            <span className="hub-manifest-name" title={c.name}>{c.name}</span>
                            <span className="hub-manifest-qnt">{c.amount.toLocaleString()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Balanced Full-Width Milestone Blueprint Rows */}
              <div className="hub-milestone-stack">
                {activeTier.milestones.map((m, idx) => (
                  <MilestoneRow
                    key={m.schematic}
                    code={`T${activeTier.tier}.${idx + 1}`}
                    accent={activeMeta.accent}
                    milestone={m}
                    isCompleted={completed.has(m.schematic)}
                    onToggleComplete={() => toggleMilestone(m.schematic)}
                    onNavigateItem={onNavigateItem}
                    onNavigateBuilding={onNavigateBuilding}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

interface MilestoneRowProps {
  code: string;
  tierBadge?: string;
  accent: string;
  milestone: Milestone;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateItem: (id: string) => void;
  onNavigateBuilding: (id: string) => void;
}

function MilestoneRow({
  code,
  tierBadge,
  accent,
  milestone,
  isCompleted,
  onToggleComplete,
  onNavigateItem,
  onNavigateBuilding,
}: MilestoneRowProps) {
  return (
    <article
      className={`hub-ms-row ${isCompleted ? 'is-completed' : ''}`}
      style={{ '--tier-accent': accent } as React.CSSProperties}
    >
      {/* Bay 1: Identity & Completion Toggle */}
      <div className="hub-ms-identity">
        <div className="hub-ms-badges">
          <span className="hub-ms-code">{code}</span>
          {tierBadge && <span className="hub-ms-tier-pill">{tierBadge}</span>}
        </div>
        <h3 className="hub-ms-name">{milestone.name}</h3>
        <div className="hub-ms-meta">
          <span>{milestone.cost.length} cost items</span>
          <span>·</span>
          <span>{milestone.unlocks.length} unlocks</span>
        </div>

        <button
          type="button"
          className={`hub-ms-check-btn ${isCompleted ? 'is-completed' : ''}`}
          onClick={onToggleComplete}
          aria-pressed={isCompleted}
        >
          {isCompleted ? <CheckCircle2 size={13} /> : <Circle size={13} />}
          <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
        </button>
      </div>

      {/* Bay 2: Launch Pod Cost */}
      <div className="hub-ms-bay hub-ms-cost-bay">
        <div className="hub-ms-bay-label">
          <Package size={11} />
          <span>POD LAUNCH COST</span>
        </div>
        {milestone.cost.length > 0 ? (
          <div className="hub-cost-list">
            {milestone.cost.map((c) => (
              <button
                key={c.name}
                type="button"
                className="hub-cost-pill"
                disabled={!c.itemId}
                onClick={() => c.itemId && onNavigateItem(c.itemId)}
                title={`${c.amount.toLocaleString()} × ${c.name}`}
              >
                <span className="hub-cost-icon-wrap">
                  <AppImage
                    idKey={c.itemId ?? ''}
                    fallbackUrl={c.itemId ? items[c.itemId]?.imageUrl : undefined}
                    alt={c.name}
                    className="hub-cost-img"
                  />
                </span>
                <span className="hub-cost-name">{c.name}</span>
                <span className="hub-cost-amt">{c.amount.toLocaleString()}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="hub-bay-empty">No pod items required</span>
        )}
      </div>

      {/* Bay 3: Unlocked Technologies */}
      <div className="hub-ms-bay hub-ms-unlocks-bay">
        <div className="hub-ms-bay-label">
          <Cpu size={11} />
          <span>TECHNOLOGIES UNLOCKED</span>
          <span className="hub-ms-unlock-count">({milestone.unlocks.length})</span>
        </div>
        {milestone.unlocks.length > 0 ? (
          <div className="hub-unlock-grid">
            {milestone.unlocks.map((u) => {
              const isBuilding = u.type === 'building';
              const bld = isBuilding && u.id ? buildings[u.id] : undefined;
              const itm = !isBuilding && u.id ? items[u.id] : undefined;
              const img = isBuilding
                ? (bld?.imageUrl)
                : (itm?.imageUrl);
              const clickable = !!u.id;
              const category = bld?.category || itm?.category;
              const power = bld?.powerConsumption && bld.powerConsumption > 0 ? `${bld.powerConsumption} MW` : null;

              return (
                <button
                  key={`${u.type}-${u.name}`}
                  type="button"
                  className={`hub-unlock-card ${isBuilding ? 'is-building' : 'is-item'}`}
                  disabled={!clickable}
                  onClick={() => {
                    if (!u.id) return;
                    if (isBuilding) onNavigateBuilding(u.id);
                    else onNavigateItem(u.id);
                  }}
                  title={u.name}
                >
                  <div className="hub-unlock-img-well">
                    <AppImage
                      idKey={u.id ?? ''}
                      fallbackUrl={img}
                      alt={u.name}
                      className="hub-unlock-img"
                    />
                    {power && (
                      <span className="hub-unlock-power-badge" title={`Power: ${power}`}>
                        <Zap size={8} />
                        <span>{power}</span>
                      </span>
                    )}
                  </div>
                  <div className="hub-unlock-meta">
                    <div className="hub-unlock-badge-row">
                      <span className={`hub-unlock-type-badge ${isBuilding ? 'is-bld' : 'is-itm'}`}>
                        {isBuilding ? <Wrench size={8} /> : <Box size={8} />}
                        <span>{isBuilding ? 'BUILDING' : 'ITEM'}</span>
                      </span>
                      {category && (
                        <span className="hub-unlock-cat-tag">
                          {category}
                        </span>
                      )}
                    </div>
                    <span className="hub-unlock-name" title={u.name}>{u.name}</span>
                    <span className="hub-unlock-action-hint">
                      <span>Codex</span>
                      <ChevronRight size={10} className="hub-unlock-action-arrow" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <span className="hub-bay-empty">No direct unlocks</span>
        )}
      </div>
    </article>
  );
}
