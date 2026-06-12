import React from 'react';
import { tiers, items, buildings, type Milestone } from '../engine/data';
import { AppImage } from './AppImage';

interface Props {
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
  onNavigateBuilding: (buildingId: string) => void;
}

export function TierBrowser({ onBack, onNavigateItem, onNavigateBuilding }: Props) {
  return (
    <div className="ib-root">
      {/* FICSIT Telemetry Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-2 border-b border-[#2a2d33] bg-[#121316]/60 shrink-0">
        <button className="cdx-back-btn" onClick={onBack}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Codex
        </button>
        <div style={{ width: 3, height: 14, background: 'linear-gradient(180deg, #f48721, #c45700)', borderRadius: 2 }} />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">FICSIT // HUB Progression</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
        <span className="text-[8px] font-mono text-[#6b7280] tracking-widest uppercase">{tiers.length} TIERS</span>
      </div>

      <div className="cdx-tiers-scroll">
        {tiers.map(t => (
          <section key={t.tier} className="tier-block">
            <div className="tier-heading">
              <span className="tier-heading-num">TIER {t.tier}</span>
              <span className="tier-heading-count">{t.milestones.length} milestones</span>
              <div className="tier-heading-line" />
            </div>
            <div className="tier-milestones">
              {t.milestones.map(m => (
                <MilestoneCard
                  key={m.schematic}
                  milestone={m}
                  onNavigateItem={onNavigateItem}
                  onNavigateBuilding={onNavigateBuilding}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MilestoneCard({ milestone, onNavigateItem, onNavigateBuilding }: {
  milestone: Milestone;
  onNavigateItem: (id: string) => void;
  onNavigateBuilding: (id: string) => void;
}) {
  return (
    <div className="ms-card">
      <div className="ms-card-header">
        <span className="ms-card-name">{milestone.name}</span>
      </div>

      {/* Cost */}
      {milestone.cost.length > 0 && (
        <div className="ms-section">
          <span className="ms-section-label">COST</span>
          <div className="ms-chips">
            {milestone.cost.map(c => (
              <button
                key={c.name}
                className="ms-chip"
                disabled={!c.itemId}
                onClick={() => c.itemId && onNavigateItem(c.itemId)}
                title={`${c.amount} × ${c.name}`}
              >
                <AppImage idKey={c.itemId ?? ''} fallbackUrl={c.itemId ? items[c.itemId]?.imageUrl : undefined} alt={c.name} className="ms-chip-img" />
                <span className="ms-chip-amt">{c.amount}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unlocks */}
      {milestone.unlocks.length > 0 && (
        <div className="ms-section">
          <span className="ms-section-label">UNLOCKS</span>
          <div className="ms-chips">
            {milestone.unlocks.map(u => {
              const img = u.type === 'building'
                ? (u.id ? buildings[u.id]?.imageUrl : undefined)
                : (u.id ? items[u.id]?.imageUrl : undefined);
              const clickable = !!u.id;
              return (
                <button
                  key={`${u.type}-${u.name}`}
                  className="ms-chip ms-chip--unlock"
                  disabled={!clickable}
                  onClick={() => {
                    if (!u.id) return;
                    if (u.type === 'building') onNavigateBuilding(u.id);
                    else onNavigateItem(u.id);
                  }}
                  title={u.name}
                >
                  <AppImage idKey={u.id ?? ''} fallbackUrl={img} alt={u.name} className="ms-chip-img" />
                  <span className="ms-chip-label">{u.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
