import React from 'react';
import { items, recipes, machines, type Recipe } from '../engine/data';
import { AppImage } from './AppImage';

// Metadata we can derive from the data
const LIQUID_CATEGORIES = new Set(['Liquids', 'Gas']);
const RADIOACTIVE_ITEMS = new Set([
  'uranium', 'uranium_ore', 'uranium_fuel_rod', 'uranium_waste',
  'plutonium_pellet', 'plutonium_fuel_rod', 'plutonium_waste',
  'encased_uranium_cell', 'encased_plutonium_cell', 'non_fissile_uranium',
  'ficsonium', 'ficsonium_fuel_rod',
]);

function fmtRate(r: number) {
  return Number.isInteger(r) ? `${r}` : r.toFixed(r % 1 === 0.5 ? 1 : 4).replace(/\.?0+$/, '');
}

interface Props {
  itemId: string;
  onBack: () => void;
  onNavigate: (id: string) => void;
}

export function ItemDetail({ itemId, onBack, onNavigate }: Props) {
  const item = items[itemId];
  if (!item) return null;

  const producingRecipes = recipes.filter(r => r.outputItemId === itemId || r.byproducts?.some(b => b.itemId === itemId));
  const usedAsIngredient = recipes.filter(r => r.inputs.some(i => i.itemId === itemId));
  const isLiquid = LIQUID_CATEGORIES.has(item.category);
  const isRadioactive = RADIOACTIVE_ITEMS.has(itemId);
  const form = isLiquid ? (item.category === 'Gas' ? 'Gas' : 'Liquid') : 'Solid';

  // Shared view mode across both recipe sections
  const [viewMode, setViewMode] = React.useState<'flow' | 'table'>('flow');

  return (
    <div className="id-root">
      {/* FICSIT Telemetry Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-2 border-b border-[#2a2d33] bg-[#121316]/60 shrink-0">
        <div style={{
          width: 3, height: 14,
          background: 'linear-gradient(180deg, #f48721, #c45700)',
          borderRadius: 2,
        }} />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">
          FICSIT // Item Specification
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
        <span className="text-[8px] font-mono text-[#6b7280] tracking-widest uppercase">
          {isRadioactive ? 'HAZARD STATUS: CRITICAL' : 'SCHEMA STATUS: COMPLIANT'}
        </span>
      </div>

      {/* Back bar */}
      <div className="id-topbar">
        <button className="id-back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Item Browser
        </button>
        <span className="id-breadcrumb">/ {item.name}</span>
      </div>

      <div className="id-body">
        {/* Left column */}
        <div className="id-col">
          {/* Premium FICSIT Hero Card */}
          <div className={`sf-item-hero-card ${isRadioactive ? 'sf-item-hero-card--radioactive' : ''}`}>
            <div className="sf-item-hero-header">
              <span className="sf-item-hero-title">{item.name.toUpperCase()}</span>
              {isRadioactive && <span className="sf-item-hero-hazard">☢ HAZARD</span>}
            </div>
            <div className="sf-item-hero-body">
              <div className="sf-item-hero-img-wrap">
                <div className="sf-item-hero-img-grid" />
                <AppImage idKey={item.id} fallbackUrl={item.imageUrl} alt={item.name} className="sf-item-hero-img" />
                <div className="sf-item-hero-caution-l" />
                <div className="sf-item-hero-caution-r" />
              </div>
              <div className="sf-item-hero-info">
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">CATEGORY</span>
                  <span className="sf-item-hero-val">{item.category}</span>
                </div>
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">FORM</span>
                  <span className="sf-item-hero-val">{form}</span>
                </div>
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">RADIOACTIVE</span>
                  <span className="sf-item-hero-val" style={{ color: isRadioactive ? '#ef4444' : '#22c55e' }}>
                    {isRadioactive ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">USED IN RECIPES</span>
                  <span className="sf-item-hero-val sf-item-hero-val--accent">{usedAsIngredient.length}</span>
                </div>
                <div className="sf-item-hero-row">
                  <span className="sf-item-hero-label">PRODUCED BY RECIPES</span>
                  <span className="sf-item-hero-val sf-item-hero-val--accent">{producingRecipes.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Producing Recipes section */}
          {producingRecipes.length > 0 && (
            <div className="sf-recipes-section">
              <div className="sf-recipes-sec-header">
                <h3 className="sf-recipes-sec-title">PRODUCING RECIPES</h3>
                <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              </div>
              {viewMode === 'flow' ? (
                <div className="sf-recipes-list">
                  {producingRecipes.map(r => (
                    <RecipeCard key={r.id} recipe={r} highlightId={itemId} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : (
                <RecipeTable recipes={producingRecipes} highlightId={itemId} onNavigate={onNavigate} />
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="id-col">
          {/* Used as ingredient section */}
          {usedAsIngredient.length > 0 && (
            <div className="sf-recipes-section">
              <div className="sf-recipes-sec-header">
                <h3 className="sf-recipes-sec-title">USED AS INGREDIENT</h3>
                <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              </div>
              {viewMode === 'flow' ? (
                <div className="sf-recipes-list">
                  {usedAsIngredient.map(r => (
                    <RecipeCard key={r.id} recipe={r} highlightId={itemId} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : (
                <RecipeTable recipes={usedAsIngredient} highlightId={itemId} onNavigate={onNavigate} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, highlightId, onNavigate }: { recipe: Recipe; highlightId: string; onNavigate: (id: string) => void }) {
  const machine = machines[recipe.machineId];
  const isAlternate = recipe.id.startsWith('recipe_alternate_');
  const recipeName = recipe.name ?? recipe.id
    .replace(/^recipe_alternate_/, 'Alternate: ')
    .replace(/^recipe_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const numInputs = recipe.inputs.length;
  const outputsCount = 1 + (recipe.byproducts?.length ?? 0);

  // Dynamically size the flow area so chips are snug with no wasted space.
  // Each chip is 52px tall with 10px gap between chips.
  // 28px reserved at top for the absolute-positioned INPUTS/OUTPUTS label.
  const CHIP_H = 52;
  const CHIP_GAP = 10;
  const LABEL_H = 28;
  const maxItems = Math.max(numInputs, outputsCount);
  // Height = label area + all chips + gaps between chips + small bottom padding
  const flowHeight = Math.max(140, LABEL_H + maxItems * CHIP_H + (maxItems - 1) * CHIP_GAP + 20);

  return (
    <div className="sf-recipe-card">
      {/* Decorative details */}
      <div className="sf-recipe-card-edge-stripe" />
      <div className="sf-recipe-card-screw sf-recipe-card-screw-tl" />
      <div className="sf-recipe-card-screw sf-recipe-card-screw-tr" />
      <div className="sf-recipe-card-screw sf-recipe-card-screw-bl" />
      <div className="sf-recipe-card-screw sf-recipe-card-screw-br" />

      {/* Header bar */}
      <div className="sf-recipe-card-header">
        <div className="sf-recipe-card-title-group">
          {isAlternate && <span className="sf-recipe-card-alt-badge">ALT</span>}
          <span className="sf-recipe-card-name">{recipeName}</span>
        </div>
        
        {/* Machine name — plain medium text, no card/badge */}
        {machine && (
          <span className="sf-recipe-card-machine-label">{machine.name}</span>
        )}
      </div>

      {/* Flow area — height driven by item count, so SVG y=50 always = machine vertical center */}
      <div className="sf-recipe-card-flow" style={{ height: flowHeight }}>

        {/* 1. INPUTS column */}
        <div className="sf-recipe-card-block sf-recipe-card-block--inputs">
          <span className="sf-recipe-card-block-label">INPUTS</span>
          <div className="sf-recipe-card-items">
            {recipe.inputs.map(inp => (
              <RecipeItemChip
                key={inp.itemId}
                itemId={inp.itemId}
                rate={inp.rate}
                highlight={inp.itemId === highlightId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* 2. Left SVG connector — all input threads fan into machine center */}
        <div className="sf-recipe-flow-connector sf-recipe-flow-connector--left">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {recipe.inputs.map((inp, idx) => {
              // space-evenly: center of chip[i] = (i+1) / (N+1) * 100
              const yStart = ((idx + 1) / (numInputs + 1)) * 100;
              const isHighlight = inp.itemId === highlightId;
              return (
                <React.Fragment key={inp.itemId}>
                  {isHighlight && (
                    <path
                      d={`M 0 ${yStart} C 60 ${yStart}, 60 50, 100 50`}
                      fill="none"
                      stroke="#f48721"
                      strokeWidth="6"
                      opacity="0.3"
                      style={{ filter: 'blur(3px)' }}
                    />
                  )}
                  <path
                    d={`M 0 ${yStart} C 60 ${yStart}, 60 50, 100 50`}
                    fill="none"
                    stroke={isHighlight ? '#f48721' : 'rgba(255,255,255,0.18)'}
                    strokeWidth={isHighlight ? '2' : '1.2'}
                    strokeDasharray={isHighlight ? '0' : '4 3'}
                    opacity={isHighlight ? '1' : '0.65'}
                  />
                </React.Fragment>
              );
            })}
          </svg>
        </div>

        {/* 3. Central Machine Node — transparent glassmorphic card, centered x & y */}
        <div className="sf-recipe-flow-machine-wrap">
          <div className="sf-recipe-flow-machine-node" title={machine?.name ?? 'Craft Bench'}>
            <div className="sf-recipe-flow-machine-glow" />
            <div className="sf-recipe-flow-machine-core">
              {machine && machine.imageUrl ? (
                <img src={machine.imageUrl} alt={machine.name} className="sf-recipe-flow-machine-img" />
              ) : (
                <span className="sf-recipe-flow-machine-placeholder">🔨</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Right SVG connector — threads from machine center to outputs with arrow tips */}
        <div className="sf-recipe-flow-connector sf-recipe-flow-connector--right">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="sf-arrow-dim" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M 0 1 L 6 3.5 L 0 6 Z" fill="rgba(255,255,255,0.3)" />
              </marker>
              <marker id="sf-arrow-hot" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M 0 1 L 6 3.5 L 0 6 Z" fill="#f48721" />
              </marker>
            </defs>

            {/* All output threads: main output (idx=0) + byproducts (idx=1..N) */}
            {[{ itemId: recipe.outputItemId, rate: recipe.outputRate }, ...(recipe.byproducts ?? [])].map((out, idx) => {
              // space-evenly: center of chip[i] = (i+1) / (N+1) * 100
              const yEnd = ((idx + 1) / (outputsCount + 1)) * 100;
              const isHighlight = out.itemId === highlightId;
              return (
                <React.Fragment key={out.itemId}>
                  {isHighlight && (
                    <path
                      d={`M 0 50 C 40 50, 40 ${yEnd}, 100 ${yEnd}`}
                      fill="none"
                      stroke="#f48721"
                      strokeWidth="6"
                      opacity="0.3"
                      style={{ filter: 'blur(3px)' }}
                    />
                  )}
                  <path
                    d={`M 0 50 C 40 50, 40 ${yEnd}, 100 ${yEnd}`}
                    fill="none"
                    stroke={isHighlight ? '#f48721' : 'rgba(255,255,255,0.18)'}
                    strokeWidth={isHighlight ? '2' : '1.2'}
                    strokeDasharray={isHighlight ? '0' : '4 3'}
                    opacity={isHighlight ? '1' : '0.65'}
                    markerEnd={isHighlight ? 'url(#sf-arrow-hot)' : 'url(#sf-arrow-dim)'}
                  />
                </React.Fragment>
              );
            })}
          </svg>
        </div>

        {/* 5. OUTPUTS column */}
        <div className="sf-recipe-card-block sf-recipe-card-block--outputs">
          <span className="sf-recipe-card-block-label">OUTPUTS</span>
          <div className="sf-recipe-card-items">
            <RecipeItemChip
              itemId={recipe.outputItemId}
              rate={recipe.outputRate}
              highlight={recipe.outputItemId === highlightId}
              onNavigate={onNavigate}
            />
            {recipe.byproducts?.map(bp => (
              <RecipeItemChip
                key={bp.itemId}
                itemId={bp.itemId}
                rate={bp.rate}
                highlight={bp.itemId === highlightId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function RecipeItemChip({ itemId, rate, highlight, onNavigate }: { itemId: string; rate: number; highlight: boolean; onNavigate: (id: string) => void }) {
  const item = items[itemId];
  if (!item) return null;
  return (
    <button 
      className={`sf-recipe-item-chip ${highlight ? 'sf-recipe-item-chip--highlight' : ''}`}
      onClick={() => onNavigate(itemId)}
      title={item.name}
    >
      <AppImage idKey={itemId} fallbackUrl={item.imageUrl} alt={item.name} className="sf-recipe-item-img" />
      <div className="sf-recipe-item-details">
        <span className="sf-recipe-item-name">{item.name}</span>
        <span className="sf-recipe-item-rate">
          {fmtRate(rate)} <span className="sf-recipe-item-unit">/min</span>
        </span>
      </div>
    </button>
  );
}

// ============================================================
// View Toggle Button Group
// ============================================================
function ViewToggle({ viewMode, onChange }: { viewMode: 'flow' | 'table'; onChange: (m: 'flow' | 'table') => void }) {
  return (
    <div className="sf-view-toggle">
      {/* Flow / Card view */}
      <button
        className={`sf-view-toggle-btn ${viewMode === 'flow' ? 'sf-view-toggle-btn--active' : ''}`}
        onClick={() => onChange('flow')}
        title="Flow card view"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      </button>
      {/* Table / List view */}
      <button
        className={`sf-view-toggle-btn ${viewMode === 'table' ? 'sf-view-toggle-btn--active' : ''}`}
        onClick={() => onChange('table')}
        title="Table view"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2" width="14" height="2" rx="1" />
          <rect x="1" y="7" width="14" height="2" rx="1" />
          <rect x="1" y="12" width="14" height="2" rx="1" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================
// Table View Components
// ============================================================
function RecipeTable({ recipes, highlightId, onNavigate }: { recipes: Recipe[]; highlightId: string; onNavigate: (id: string) => void }) {
  return (
    <div className="sf-rt">
      {/* Header row */}
      <div className="sf-rt-header">
        <div className="sf-rt-th sf-rt-th--name">RECIPE NAME</div>
        <div className="sf-rt-th sf-rt-th--ingredients">INGREDIENTS</div>
        <div className="sf-rt-th sf-rt-th--products">PRODUCTS</div>
        <div className="sf-rt-th sf-rt-th--machine">MACHINE</div>
      </div>
      {/* Data rows */}
      {recipes.map(r => (
        <RecipeTableRow key={r.id} recipe={r} highlightId={highlightId} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function RecipeTableRow({ recipe, highlightId, onNavigate }: { recipe: Recipe; highlightId: string; onNavigate: (id: string) => void }) {
  const machine = machines[recipe.machineId];
  const isAlternate = recipe.id.startsWith('recipe_alternate_');
  const recipeName = recipe.name ?? recipe.id
    .replace(/^recipe_alternate_/, 'Alternate: ')
    .replace(/^recipe_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const allOutputs = [
    { itemId: recipe.outputItemId, rate: recipe.outputRate },
    ...(recipe.byproducts ?? []),
  ];

  return (
    <div className="sf-rt-row">
      {/* Recipe Name */}
      <div className="sf-rt-td sf-rt-td--name">
        {isAlternate && <span className="sf-recipe-card-alt-badge">ALT</span>}
        <span className="sf-rt-recipe-name">{recipeName}</span>
      </div>

      {/* Ingredients */}
      <div className="sf-rt-td sf-rt-td--ingredients">
        {recipe.inputs.map((inp, idx) => {
          const it = items[inp.itemId];
          if (!it) return null;
          return (
            <React.Fragment key={inp.itemId}>
              <button
                className={`sf-rt-chip ${inp.itemId === highlightId ? 'sf-rt-chip--highlight' : ''}`}
                onClick={() => onNavigate(inp.itemId)}
                title={it.name}
              >
                <AppImage idKey={inp.itemId} fallbackUrl={it.imageUrl} alt={it.name} className="sf-rt-chip-img" />
                <span className="sf-rt-chip-rate">
                  {fmtRate(inp.rate)}<span className="sf-rt-chip-unit">/min</span>
                </span>
              </button>
              {idx < recipe.inputs.length - 1 && <span className="sf-rt-op">+</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Products */}
      <div className="sf-rt-td sf-rt-td--products">
        <span className="sf-rt-op sf-rt-op--eq">=</span>
        {allOutputs.map((out, idx) => {
          const it = items[out.itemId];
          if (!it) return null;
          return (
            <React.Fragment key={out.itemId}>
              <button
                className={`sf-rt-chip ${out.itemId === highlightId ? 'sf-rt-chip--highlight' : ''}`}
                onClick={() => onNavigate(out.itemId)}
                title={it.name}
              >
                <AppImage idKey={out.itemId} fallbackUrl={it.imageUrl} alt={it.name} className="sf-rt-chip-img" />
                <span className="sf-rt-chip-rate">
                  {fmtRate(out.rate)}<span className="sf-rt-chip-unit">/min</span>
                </span>
              </button>
              {idx < allOutputs.length - 1 && <span className="sf-rt-op">+</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Machine */}
      <div className="sf-rt-td sf-rt-td--machine">
        {machine ? (
          <>
            {machine.imageUrl && (
              <img src={machine.imageUrl} alt={machine.name} className="sf-rt-machine-img" />
            )}
            <span className="sf-rt-machine-name">{machine.name}</span>
          </>
        ) : (
          <span className="sf-rt-machine-name" style={{ opacity: 0.4 }}>Craft Bench</span>
        )}
      </div>
    </div>
  );
}
