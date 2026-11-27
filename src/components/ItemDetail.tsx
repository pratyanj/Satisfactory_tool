import React from 'react';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
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

function formatRecipeName(recipe: Recipe): string {
  return (
    recipe.name ??
    recipe.id
      .replace(/^recipe_alternate_/, 'Alternate: ')
      .replace(/^recipe_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface Props {
  itemId: string;
  onBack: () => void;
  onNavigate: (id: string) => void;
  onNavigateBuilding: (id: string) => void;
}

export function ItemDetail({ itemId, onBack, onNavigate, onNavigateBuilding }: Props) {
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
      {/* Unified Machined Top Header */}
      <div className="ib-topbar">
        <div className="ib-topbar-inner">
          <div className="ib-topbar-left">
            <button type="button" className="cdx-back-btn ib-back-btn" onClick={onBack}>
              <ArrowLeft size={13} />
              <span>Items</span>
            </button>
            <span className="ib-plate-hazard" aria-hidden="true" />
            <span className="ib-topbar-title">FICSIT // ITEM SPECIFICATION</span>
            <span className="id-breadcrumb">/ {item.name}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="ib-topbar-status">
              <span
                className="ib-status-dot"
                style={isRadioactive ? { background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.75)' } : undefined}
              />
              <span>{isRadioactive ? 'HAZARD // CRITICAL' : 'SCHEMA // COMPLIANT'}</span>
            </div>
            {(producingRecipes.length > 0 || usedAsIngredient.length > 0) && (
              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            )}
          </div>
        </div>
      </div>

      <div className="id-body">
        {/* Left column */}
        <div className="id-col">
          {/* Machined Gunmetal Hero Card */}
          <div className={`sf-item-hero-card ${isRadioactive ? 'sf-item-hero-card--radioactive' : ''}`}>
            <div className="sf-item-hero-header">
              <div className="sf-item-hero-title-wrap">
                <span className="ib-plate-hazard" aria-hidden="true" />
                <span className="sf-item-hero-title">{item.name.toUpperCase()}</span>
              </div>
              {isRadioactive ? (
                <span className="sf-item-hero-hazard">☢ HAZARD</span>
              ) : (
                <span className="sf-item-hero-cat-tag">{item.category}</span>
              )}
            </div>
            <div className="sf-item-hero-body">
              <div className="sf-item-hero-img-wrap">
                <AppImage idKey={item.id} fallbackUrl={item.imageUrl} alt={item.name} className="sf-item-hero-img" />
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
                  <span className="sf-item-hero-label">SINK POINTS</span>
                  <span className="sf-item-hero-val" style={{ color: item.sinkPoints ? '#22c55e' : undefined }}>
                    {item.sinkPoints ? item.sinkPoints.toLocaleString() : '—'}
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
              </div>
              {viewMode === 'flow' ? (
                <div className="sf-recipes-list">
                  {producingRecipes.map(r => (
                    <RecipeCard key={r.id} recipe={r} highlightId={itemId} onNavigate={onNavigate} onNavigateBuilding={onNavigateBuilding} />
                  ))}
                </div>
              ) : (
                <RecipeTable recipes={producingRecipes} highlightId={itemId} onNavigate={onNavigate} onNavigateBuilding={onNavigateBuilding} />
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
              </div>
              {viewMode === 'flow' ? (
                <div className="sf-recipes-list">
                  {usedAsIngredient.map(r => (
                    <RecipeCard key={r.id} recipe={r} highlightId={itemId} onNavigate={onNavigate} onNavigateBuilding={onNavigateBuilding} />
                  ))}
                </div>
              ) : (
                <RecipeTable recipes={usedAsIngredient} highlightId={itemId} onNavigate={onNavigate} onNavigateBuilding={onNavigateBuilding} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecipeCard({ recipe, highlightId, onNavigate, onNavigateBuilding }: { recipe: Recipe; highlightId: string; onNavigate: (id: string) => void; onNavigateBuilding: (id: string) => void }) {
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
          <button
            type="button"
            className="hover:text-[#f48721] transition-colors font-mono text-[9px] tracking-wider text-[#94a3b8] uppercase text-right outline-none cursor-pointer"
            onClick={() => onNavigateBuilding(recipe.machineId)}
            title={`View ${machine.name} specifications`}
          >
            {machine.name} {machine.powerUsage ? `(${machine.powerUsage} MW)` : ''}
          </button>
        )}
      </div>

      {/* Flow area — height driven by item count, so SVG y=50 always = machine vertical center.
          Passed as a CSS var (not `height`) so the mobile media query can override it
          to `auto` and let the stacked layout grow instead of clipping. */}
      <div className="sf-recipe-card-flow" style={{ '--sf-flow-h': `${flowHeight}px` } as React.CSSProperties}>

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

        {/* 3. Central Machine Node — transparent glassmorphic card, clickable */}
        <div className="sf-recipe-flow-machine-wrap">
          <button
            type="button"
            className="sf-recipe-flow-machine-node outline-none cursor-pointer"
            onClick={() => machine && onNavigateBuilding(recipe.machineId)}
            title={machine ? `Click to view ${machine.name} specifications` : 'Craft Bench'}
            style={{ border: 'none', background: 'transparent' }}
          >
            <div className="sf-recipe-flow-machine-glow" />
            <div className="sf-recipe-flow-machine-core">
              {machine ? (
                <AppImage idKey={machine.id} fallbackUrl={machine.imageUrl} alt={machine.name} className="sf-recipe-flow-machine-img" />
              ) : (
                <span className="sf-recipe-flow-machine-placeholder">🔨</span>
              )}
            </div>
          </button>
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
export function RecipeTable({
  recipes,
  highlightId,
  onNavigate,
  onNavigateBuilding,
}: {
  recipes: Recipe[];
  highlightId: string;
  onNavigate: (id: string) => void;
  onNavigateBuilding?: (id: string) => void;
}) {
  return (
    <div className="sf-rt">
      {recipes.map((r) => (
        <RecipeTableRow
          key={r.id}
          recipe={r}
          highlightId={highlightId}
          onNavigate={onNavigate}
          onNavigateBuilding={onNavigateBuilding}
        />
      ))}
    </div>
  );
}

function RecipeIoPill({
  itemId,
  rate,
  isHighlighted,
  isByproduct,
  onNavigate,
}: {
  itemId: string;
  rate: number;
  isHighlighted: boolean;
  isByproduct?: boolean;
  onNavigate: (id: string) => void;
}) {
  const it = items[itemId];
  if (!it) return null;

  return (
    <button
      type="button"
      className={`sf-rt-pill ${isHighlighted ? 'sf-rt-pill--highlight' : ''} ${
        isByproduct ? 'sf-rt-pill--byproduct' : ''
      }`}
      onClick={() => onNavigate(itemId)}
      title={`${it.name} (${fmtRate(rate)}/min)`}
    >
      <span className="sf-rt-pill-img-wrap">
        <AppImage
          idKey={itemId}
          fallbackUrl={it.imageUrl}
          alt={it.name}
          className="sf-rt-pill-img"
        />
      </span>
      <span className="sf-rt-pill-info">
        <span className="sf-rt-pill-name">{it.name}</span>
        <span className="sf-rt-pill-rate">
          {fmtRate(rate)}
          <span className="sf-rt-pill-unit">/m</span>
        </span>
      </span>
    </button>
  );
}

function RecipeTableRow({
  recipe,
  highlightId,
  onNavigate,
  onNavigateBuilding,
}: {
  recipe: Recipe;
  highlightId: string;
  onNavigate: (id: string) => void;
  onNavigateBuilding?: (id: string) => void;
}) {
  const machine = machines[recipe.machineId];
  const isAlternate = recipe.id.startsWith('recipe_alternate_');
  const recipeName = formatRecipeName(recipe);

  const allOutputs = [
    { itemId: recipe.outputItemId, rate: recipe.outputRate, isByproduct: false },
    ...(recipe.byproducts ?? []).map((b) => ({ ...b, isByproduct: true })),
  ];

  return (
    <article className={`sf-rt-row-card ${isAlternate ? 'is-alternate' : ''}`}>
      {/* Header Bar: Recipe Identity + Full Machine Telemetry */}
      <div className="sf-rt-row-head">
        <div className="sf-rt-row-title-wrap">
          {isAlternate && <span className="sf-recipe-card-alt-badge">ALT</span>}
          <span className="sf-rt-recipe-name">{recipeName}</span>
          {recipe.cycleTime != null && (
            <span className="sf-rt-cycle-pill" title="Cycle duration">
              <Clock size={10} />
              <span>{recipe.cycleTime}s</span>
            </span>
          )}
        </div>

        {machine ? (
          <button
            type="button"
            className="sf-rt-machine-btn"
            disabled={!onNavigateBuilding}
            onClick={() => onNavigateBuilding?.(recipe.machineId)}
            title={onNavigateBuilding ? `View ${machine.name} specifications` : machine.name}
          >
            <AppImage
              idKey={machine.id}
              fallbackUrl={machine.imageUrl}
              alt={machine.name}
              className="sf-rt-machine-img"
            />
            <span className="sf-rt-machine-name">{machine.name}</span>
            {machine.powerUsage > 0 && (
              <span className="sf-rt-machine-power">{machine.powerUsage} MW</span>
            )}
          </button>
        ) : (
          <span className="sf-rt-machine-bench">Craft Bench</span>
        )}
      </div>

      {/* Conversion Body: Inputs -> Products */}
      <div className="sf-rt-row-body">
        <div className="sf-rt-io-col">
          <span className="sf-rt-io-label">INPUTS</span>
          <div className="sf-rt-io-pills">
            {recipe.inputs.map((inp) => (
              <RecipeIoPill
                key={inp.itemId}
                itemId={inp.itemId}
                rate={inp.rate}
                isHighlighted={inp.itemId === highlightId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div className="sf-rt-flow-arrow" aria-hidden="true">
          <ArrowRight size={15} />
        </div>

        <div className="sf-rt-io-col sf-rt-io-col--out">
          <span className="sf-rt-io-label">PRODUCTS</span>
          <div className="sf-rt-io-pills">
            {allOutputs.map((out) => (
              <RecipeIoPill
                key={out.itemId}
                itemId={out.itemId}
                rate={out.rate}
                isHighlighted={out.itemId === highlightId}
                isByproduct={out.isByproduct}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
