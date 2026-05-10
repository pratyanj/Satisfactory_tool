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
          {/* Hero card */}
          <div className="id-section">
            <h2 className="id-section-title">{item.name}</h2>
            <div className="id-hero">
              <AppImage idKey={item.id} fallbackUrl={item.imageUrl} alt={item.name} className="id-hero-img" />
              <div className="id-hero-meta">
                <span className="id-hero-cat">{item.category}</span>
                <span className="id-hero-form">{form}</span>
                {isRadioactive && <span className="id-hero-radio">☢ Radioactive</span>}
              </div>
            </div>
          </div>

          {/* Recipes */}
          {producingRecipes.length > 0 && (
            <div className="id-section">
              <h3 className="id-section-title">Recipes</h3>
              <div className="id-recipe-table-wrap">
                <table className="id-table">
                  <thead>
                    <tr>
                      <th>Recipe name</th>
                      <th>Ingredients</th>
                      <th className="id-math-op-col"></th>
                      <th>Products</th>
                      <th>Machine</th>
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
        </div>

        {/* Right column */}
        <div className="id-col">
          {/* Details card */}
          <div className="id-section">
            <h3 className="id-section-title">{item.name} details</h3>
            <table className="id-details-table">
              <tbody>
                <tr><td>Form</td><td>{form}</td></tr>
                <tr><td>Category</td><td>{item.category}</td></tr>
                <tr><td>Radioactive</td><td>{isRadioactive ? 'Yes' : 'No'}</td></tr>
                <tr>
                  <td>Used in recipes</td>
                  <td>{usedAsIngredient.length}</td>
                </tr>
                <tr>
                  <td>Produced by recipes</td>
                  <td>{producingRecipes.length}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Used as ingredient */}
          {usedAsIngredient.length > 0 && (
            <div className="id-section">
              <h3 className="id-section-title">Usages as ingredient</h3>
              <div className="id-recipe-table-wrap">
                <table className="id-table">
                  <thead>
                    <tr>
                      <th>Recipe name</th>
                      <th>Ingredients</th>
                      <th className="id-math-op-col"></th>
                      <th>Products</th>
                      <th>Machine</th>
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
    </div>
  );
}

function RecipeRow({ recipe, highlightId, onNavigate }: { recipe: Recipe; highlightId: string; onNavigate: (id: string) => void }) {
  const machine = machines[recipe.machineId];
  const recipeName = recipe.name ?? recipe.id
    .replace(/^recipe_alternate_/, 'Alternate: ')
    .replace(/^recipe_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <tr>
      <td className="id-recipe-name">{recipeName}</td>
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
        <span className="id-math-op">=</span>
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
        <div className="id-chip" style={{ cursor: 'default' }} title={machine?.name ?? recipe.machineId}>
          {machine?.imageUrl && (
            <img src={machine.imageUrl} alt={machine.name} className="id-chip-img" />
          )}
          <span className="id-chip-rate">{machine?.name ?? recipe.machineId}</span>
        </div>
      </td>
    </tr>
  );
}

function ItemChip({ itemId, rate, highlight, onNavigate }: { itemId: string; rate: number; highlight: boolean; onNavigate: (id: string) => void }) {
  const item = items[itemId];
  return (
    <button
      className={`id-chip ${highlight ? 'id-chip--highlight' : ''}`}
      onClick={() => onNavigate(itemId)}
      title={item?.name ?? itemId}
    >
      <AppImage idKey={itemId} fallbackUrl={item?.imageUrl} alt={item?.name ?? itemId} className="id-chip-img" />
      <span className="id-chip-rate">{fmtRate(rate)}/min</span>
    </button>
  );
}
