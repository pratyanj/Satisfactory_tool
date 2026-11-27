import React from 'react';
import { ArrowLeft, FileText, Lock } from 'lucide-react';
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
      <div className="ib-topbar">
        <div className="ib-topbar-inner">
          <div className="ib-topbar-left">
            <button type="button" className="cdx-back-btn ib-back-btn" onClick={onBack}>
              <ArrowLeft size={13} />
              <span>Buildings</span>
            </button>
            <span className="ib-plate-hazard" aria-hidden="true" />
            <span className="ib-topbar-title">FICSIT // BUILDING SPECIFICATION</span>
            <span className="id-breadcrumb">/ {b.name}</span>
          </div>
          <div className="ib-topbar-status">
            <span className="ib-status-dot" />
            <span>SCHEMA // COMPLIANT</span>
          </div>
        </div>
      </div>

      <div className="id-body">
        {/* Left column */}
        <div className="id-col">
          <div className="sf-item-hero-card">
            <div className="sf-item-hero-header">
              <div className="sf-item-hero-title-wrap">
                <span className="ib-plate-hazard" aria-hidden="true" />
                <span className="sf-item-hero-title">{b.name.toUpperCase()}</span>
              </div>
              <span className="sf-item-hero-cat-tag">{b.category}</span>
            </div>
            <div className="sf-item-hero-body">
              <div className="sf-item-hero-img-wrap">
                <AppImage idKey={b.id} fallbackUrl={b.imageUrl} alt={b.name} className="sf-item-hero-img" />
              </div>
              <div className="sf-item-hero-info">
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">CATEGORY</span>
                  <span className="sf-item-hero-val">{b.category}</span>
                </div>
                {generatorInfo ? (
                  <div className="sf-item-hero-row">
                    <span className="sf-item-hero-label">POWER GENERATED</span>
                    <span className="sf-item-hero-val" style={{ color: '#4ade80' }}>
                      {generatorInfo.powerGen}
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
            <div className="bld-desc-plate">
              <div className="bld-desc-head">
                <FileText size={11} />
                <span>SPECIFICATION NOTES</span>
              </div>
              <div className="bld-desc-body">{b.description}</div>
            </div>
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
                    type="button"
                    className="bld-cost-card"
                    onClick={() => c.itemId && onNavigateItem(c.itemId)}
                    disabled={!c.itemId}
                    title={`${c.name} × ${c.amount}`}
                  >
                    <span className="bld-cost-img-well">
                      <AppImage
                        idKey={c.itemId ?? ''}
                        fallbackUrl={c.itemId ? items[c.itemId]?.imageUrl : undefined}
                        alt={c.name}
                        className="bld-cost-img"
                      />
                    </span>
                    <span className="bld-cost-name">{c.name}</span>
                    <span className="bld-cost-qty">×{c.amount}</span>
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
                      type="button"
                      className="bld-cost-card"
                      onClick={() => onNavigateItem(f.itemId)}
                      title={it.name}
                    >
                      <span className="bld-cost-img-well">
                        <AppImage idKey={f.itemId} fallbackUrl={it.imageUrl} alt={it.name} className="bld-cost-img" />
                      </span>
                      <span className="bld-cost-meta">
                        <span className="bld-cost-name">{it.name}</span>
                        {f.water && (
                          <span className="bld-cost-sub">+{f.water} Water/m</span>
                        )}
                      </span>
                      <span className="bld-cost-qty">{f.rate}/m</span>
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
              <div className="bld-unlock-plate">
                <div className="bld-unlock-card">
                  <span className="bld-unlock-badge">
                    <Lock size={11} />
                    <span>{b.unlock.type}</span>
                  </span>
                  <div className="bld-unlock-text">
                    <span className="bld-unlock-name">{b.unlock.schematic}</span>
                    {b.unlock.tier != null && <span className="bld-unlock-tier">HUB Tier {b.unlock.tier}</span>}
                  </div>
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
