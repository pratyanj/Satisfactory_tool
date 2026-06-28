import React from 'react';
import { buildings, items, recipes, getBuildingMachineId } from '../engine/data';
import { AppImage } from './AppImage';
import { RecipeTable } from './ItemDetail';

const GENERATOR_SPECS: Record<string, {
  powerGen: string;
  fuels: Array<{ itemId: string; rate: number; water?: number }>;
}> = {
  generator_biomass_automated: {
    powerGen: '30 MW',
    fuels: [
      { itemId: 'solid_biofuel', rate: 4.5 },
      { itemId: 'biomass', rate: 9 },
    ],
  },
  generator_coal: {
    powerGen: '75 MW',
    fuels: [
      { itemId: 'coal', rate: 15, water: 45 },
      { itemId: 'compacted_coal', rate: 7.14, water: 45 },
    ],
  },
  generator_fuel: {
    powerGen: '250 MW',
    fuels: [
      { itemId: 'fuel', rate: 20 },
      { itemId: 'turbofuel', rate: 7.5 },
      { itemId: 'rocket_fuel', rate: 4.167 },
      { itemId: 'ionized_fuel', rate: 3 },
    ],
  },
  generator_nuclear: {
    powerGen: '2500 MW',
    fuels: [
      { itemId: 'uranium_fuel_rod', rate: 0.2, water: 240 },
      { itemId: 'plutonium_fuel_rod', rate: 0.1, water: 240 },
    ],
  },
  generator_geo_thermal: {
    powerGen: '50 - 150 MW (Fluctuates, Avg 100 MW)',
    fuels: [],
  },
};

interface Props {
  buildingId: string;
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
}

export function BuildingDetail({ buildingId, onBack, onNavigateItem }: Props) {
  const b = buildings[buildingId];
  if (!b) return null;

  const generatorInfo = GENERATOR_SPECS[b.id];

  // Every recipe this machine can run, so users see its full production menu.
  const machineId = getBuildingMachineId(b);
  const machineRecipes = machineId ? recipes.filter(r => r.machineId === machineId) : [];

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
                {GENERATOR_SPECS[b.id] ? (
                  <div className="sf-item-hero-row">
                    <span className="sf-item-hero-label">POWER GENERATED</span>
                    <span className="sf-item-hero-val" style={{ color: '#22c55e' }}>
                      {GENERATOR_SPECS[b.id].powerGen}
                    </span>
                  </div>
                ) : (
                  <div className="sf-item-hero-row">
                    <span className="sf-item-hero-label">POWER USE</span>
                    <span className="sf-item-hero-val" style={{ color: b.powerConsumption ? '#f48721' : undefined }}>
                      {b.powerConsumption ? `${b.powerConsumption} MW` : '—'}
                    </span>
                  </div>
                )}
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

          {generatorInfo && generatorInfo.fuels.length > 0 && (
            <div className="sf-recipes-section">
              <div className="sf-recipes-sec-header">
                <h3 className="sf-recipes-sec-title">SUPPORTED FUELS</h3>
              </div>
              <div className="bld-cost-grid">
                {generatorInfo.fuels.map(f => {
                  const it = items[f.itemId];
                  if (!it) return null;
                  return (
                    <button
                      key={f.itemId}
                      className="sf-recipe-item-chip"
                      onClick={() => onNavigateItem(f.itemId)}
                      title={it.name}
                    >
                      <AppImage idKey={f.itemId} fallbackUrl={it.imageUrl} alt={it.name} className="sf-recipe-item-img" />
                      <div className="sf-recipe-item-details">
                        <span className="sf-recipe-item-name">{it.name}</span>
                        <span className="sf-recipe-item-rate">
                          {f.rate} /min {f.water ? `(+ ${f.water} Water/min)` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
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

        {/* Full-width: every recipe this machine can produce */}
        {machineRecipes.length > 0 && (
          <div className="sf-recipes-section bld-recipes-full">
            <div className="sf-recipes-sec-header">
              <h3 className="sf-recipes-sec-title">PRODUCIBLE RECIPES</h3>
              <span className="sf-recipes-sec-count">{machineRecipes.length}</span>
            </div>
            <RecipeTable recipes={machineRecipes} highlightId="" onNavigate={onNavigateItem} />
          </div>
        )}
      </div>
    </div>
  );
}
