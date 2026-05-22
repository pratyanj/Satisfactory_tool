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

  return (
    <div className="id-root">
      {/* Top system bar */}
      <div className="id-sysbar">
        <div className="id-sysbar-stripe" />
        <button className="id-back-btn" onClick={onBack}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          CODEX
        </button>
        <div className="id-sysbar-sep" />
        <span className="id-sysbar-path">
          <span className="id-sysbar-path-dim">ITEM</span>
          <span className="id-sysbar-path-sep"> / </span>
          <span className="id-sysbar-path-cur">{item.name.toUpperCase()}</span>
        </span>
        <div style={{ flex: 1 }} />
        <span className="id-sysbar-status" style={{ color: isRadioactive ? '#ef4444' : '#22c55e' }}>
          <span className="id-sysbar-dot" style={{ background: isRadioactive ? '#ef4444' : '#22c55e' }} />
          {isRadioactive ? 'HAZARD: RADIOACTIVE' : 'SCHEMA: COMPLIANT'}
        </span>
      </div>

      {/* Scrollable body */}
      <div className="id-body">

        {/* ── ROW 1: Hero + Details side by side ─────────────────── */}
        <div className="id-top-row">

          {/* Hero panel */}
          <div className={`id-panel id-hero-panel${isRadioactive ? ' id-panel--danger' : ''}`}>
            <div className="id-panel-header">
              <span className="id-panel-title">{item.name.toUpperCase()}</span>
              {isRadioactive && (
                <span className="id-badge id-badge--danger">☢ RADIOACTIVE</span>
              )}
            </div>
            <div className="id-hero-body">
              <div className="id-hero-img-wrap">
                <div className="id-hero-img-grid" />
                <AppImage idKey={item.id} fallbackUrl={item.imageUrl} alt={item.name} className="id-hero-img" />
                <div className="id-hero-caution-l" />
                <div className="id-hero-caution-r" />
              </div>
              <div className="id-hero-info">
                <div className="id-info-row">
                  <span className="id-info-label">CATEGORY</span>
                  <span className="id-info-val">{item.category}</span>
                </div>
                <div className="id-info-row">
                  <span className="id-info-label">FORM</span>
                  <span className="id-info-val">{form}</span>
                </div>
                <div className="id-info-row">
                  <span className="id-info-label">RADIOACTIVE</span>
                  <span className="id-info-val" style={{ color: isRadioactive ? '#ef4444' : '#22c55e' }}>
                    {isRadioactive ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="id-info-row">
                  <span className="id-info-label">USED IN RECIPES</span>
                  <span className="id-info-val id-info-val--accent">{usedAsIngredient.length}</span>
                </div>
                <div className="id-info-row">
                  <span className="id-info-label">PRODUCED BY RECIPES</span>
                  <span className="id-info-val id-info-val--accent">{producingRecipes.length}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── ROW 2: Recipes ─────────────────────────────────────── */}
        {producingRecipes.length > 0 && (
          <div className="id-panel">
            <div className="id-panel-header">
              <span className="id-panel-title">RECIPES</span>
              <span className="id-panel-count">{producingRecipes.length}</span>
            </div>
            <div className="id-recipe-table-wrap">
              <table className="id-table">
                <thead>
                  <tr>
                    <th>RECIPE NAME</th>
                    <th>INGREDIENTS</th>
                    <th className="id-math-op-col" />
                    <th>PRODUCTS</th>
                    <th>MACHINE</th>
                  </tr>
                </thead>
                <tbody>
                  {producingRecipes.map(r => (
                    <RecipeRow key={r.id} recipe={r} highlightId={itemId} onNavigate={onNavigate} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ROW 3: Used As Ingredient ──────────────────────────── */}
        {usedAsIngredient.length > 0 && (
          <div className="id-panel">
            <div className="id-panel-header">
              <span className="id-panel-title">USAGES AS INGREDIENT</span>
              <span className="id-panel-count">{usedAsIngredient.length}</span>
            </div>
            <div className="id-recipe-table-wrap">
              <table className="id-table">
                <thead>
                  <tr>
                    <th>RECIPE NAME</th>
                    <th>INGREDIENTS</th>
                    <th className="id-math-op-col" />
                    <th>PRODUCTS</th>
                    <th>MACHINE</th>
                  </tr>
                </thead>
                <tbody>
                  {usedAsIngredient.map(r => (
                    <RecipeRow key={r.id} recipe={r} highlightId={itemId} onNavigate={onNavigate} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function RecipeRow({ recipe, highlightId, onNavigate }: { recipe: Recipe; highlightId: string; onNavigate: (id: string) => void }) {
  const machine = machines[recipe.machineId];
  const isAlternate = recipe.id.startsWith('recipe_alternate_');
  const recipeName = recipe.name ?? recipe.id
    .replace(/^recipe_alternate_/, '')
    .replace(/^recipe_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <tr className="id-recipe-row">
      <td className="id-recipe-name-cell">
        {isAlternate && <span className="id-alt-badge">ALT</span>}
        <span className="id-recipe-name">{recipeName}</span>
      </td>
      <td>
        <div className="id-item-chips">
          {recipe.inputs.map((inp, idx) => (
            <React.Fragment key={inp.itemId}>
              {idx > 0 && <span className="id-math-op">+</span>}
              <ItemChip itemId={inp.itemId} rate={inp.rate} highlight={inp.itemId === highlightId} onNavigate={onNavigate} />
            </React.Fragment>
          ))}
        </div>
      </td>
      <td className="id-math-op-col">
        <span className="id-math-op id-math-arrow">→</span>
      </td>
      <td>
        <div className="id-item-chips">
          <ItemChip itemId={recipe.outputItemId} rate={recipe.outputRate} highlight={recipe.outputItemId === highlightId} onNavigate={onNavigate} />
          {recipe.byproducts?.map(bp => (
            <React.Fragment key={bp.itemId}>
              <span className="id-math-op">+</span>
              <ItemChip itemId={bp.itemId} rate={bp.rate} highlight={bp.itemId === highlightId} onNavigate={onNavigate} />
            </React.Fragment>
          ))}
        </div>
      </td>
      <td>
        <div className="id-machine-chip" title={machine?.name ?? recipe.machineId}>
          {machine?.imageUrl && (
            <img src={machine.imageUrl} alt={machine.name} className="id-machine-img" />
          )}
          <span className="id-machine-name">{machine?.name ?? recipe.machineId}</span>
        </div>
      </td>
    </tr>
  );
}

function ItemChip({ itemId, rate, highlight, onNavigate }: { itemId: string; rate: number; highlight: boolean; onNavigate: (id: string) => void }) {
  const item = items[itemId];
  return (
    <button
      className={`id-chip${highlight ? ' id-chip--highlight' : ''}`}
      onClick={() => onNavigate(itemId)}
      title={item?.name ?? itemId}
    >
      <AppImage idKey={itemId} fallbackUrl={item?.imageUrl} alt={item?.name ?? itemId} className="id-chip-img" />
      <span className="id-chip-rate">{fmtRate(rate)}<span className="id-chip-unit">/min</span></span>
    </button>
  );
}
