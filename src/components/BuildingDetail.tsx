import React from 'react';
import { buildings, items } from '../engine/data';
import { AppImage } from './AppImage';

interface Props {
  buildingId: string;
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
}

export function BuildingDetail({ buildingId, onBack, onNavigateItem }: Props) {
  const b = buildings[buildingId];
  if (!b) return null;

  return (
    <div className="id-root">
      {/* FICSIT Telemetry Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-2 border-b border-[#2a2d33] bg-[#121316]/60 shrink-0">
        <div style={{ width: 3, height: 14, background: 'linear-gradient(180deg, #f48721, #c45700)', borderRadius: 2 }} />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">
          FICSIT // Building Specification
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
        <span className="text-[8px] font-mono text-[#6b7280] tracking-widest uppercase">SCHEMA STATUS: COMPLIANT</span>
      </div>

      {/* Back bar */}
      <div className="id-topbar flex justify-between items-center pr-6">
        <div className="flex items-center gap-3">
          <button className="id-back-btn" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Buildings
          </button>
          <span className="id-breadcrumb">/ {b.name}</span>
        </div>
      </div>

      <div className="id-body">
        {/* Left column */}
        <div className="id-col">
          <div className="sf-item-hero-card">
            <div className="sf-item-hero-header">
              <span className="sf-item-hero-title">{b.name.toUpperCase()}</span>
            </div>
            <div className="sf-item-hero-body">
              <div className="sf-item-hero-img-wrap">
                <div className="sf-item-hero-img-grid" />
                <AppImage idKey={b.id} fallbackUrl={b.imageUrl} alt={b.name} className="sf-item-hero-img" />
                <div className="sf-item-hero-caution-l" />
                <div className="sf-item-hero-caution-r" />
              </div>
              <div className="sf-item-hero-info">
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">CATEGORY</span>
                  <span className="sf-item-hero-val">{b.category}</span>
                </div>
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">POWER USE</span>
                  <span className="sf-item-hero-val" style={{ color: b.powerConsumption ? '#f48721' : undefined }}>
                    {b.powerConsumption ? `${b.powerConsumption} MW` : '—'}
                  </span>
                </div>
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">UNLOCK TIER</span>
                  <span className="sf-item-hero-val sf-item-hero-val--accent">
                    {b.unlock?.tier != null ? `Tier ${b.unlock.tier}` : '—'}
                  </span>
                </div>
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">BUILD MATERIALS</span>
                  <span className="sf-item-hero-val sf-item-hero-val--accent">{b.buildCost.length}</span>
                </div>
              </div>
            </div>
          </div>

          {b.description && (
            <div className="bld-desc-card">{b.description}</div>
          )}
        </div>

        {/* Right column */}
        <div className="id-col">
          {b.buildCost.length > 0 && (
            <div className="sf-recipes-section">
              <div className="sf-recipes-sec-header">
                <h3 className="sf-recipes-sec-title">CONSTRUCTION COST</h3>
              </div>
              <div className="bld-cost-grid">
                {b.buildCost.map(c => (
                  <button
                    key={c.name}
                    className="sf-recipe-item-chip"
                    onClick={() => c.itemId && onNavigateItem(c.itemId)}
                    disabled={!c.itemId}
                    title={c.name}
                  >
                    <AppImage idKey={c.itemId ?? ''} fallbackUrl={c.itemId ? items[c.itemId]?.imageUrl : undefined} alt={c.name} className="sf-recipe-item-img" />
                    <div className="sf-recipe-item-details">
                      <span className="sf-recipe-item-name">{c.name}</span>
                      <span className="sf-recipe-item-rate">× {c.amount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {b.unlock && (
            <div className="sf-recipes-section">
              <div className="sf-recipes-sec-header">
                <h3 className="sf-recipes-sec-title">UNLOCKED BY</h3>
              </div>
              <div className="bld-unlock-card">
                <span className="bld-unlock-type">{b.unlock.type}</span>
                <div className="bld-unlock-text">
                  <span className="bld-unlock-name">{b.unlock.schematic}</span>
                  {b.unlock.tier != null && <span className="bld-unlock-tier">HUB Tier {b.unlock.tier}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
