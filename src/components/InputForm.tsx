import React, { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Zap } from 'lucide-react';
import { AppImage } from './AppImage';
import { items, belts, machines, BeltId, MachineId, RecipeId } from '../engine/data';
import { ItemModal } from './ItemModal';
import { CustomSelect } from './CustomSelect';
import { getAlternateRecipeCandidates, RecipeSelectionMap } from '../engine/solver';

interface InputFormProps {
  onCalculate: (itemId: string, rate: number, minerId: MachineId, beltId: BeltId, recipeSelections: RecipeSelectionMap) => void;
  initialValues?: { itemId: string, rate: number, minerId: MachineId, beltId: BeltId, recipeSelections?: RecipeSelectionMap };
}

function formatRecipeLabel(recipeId: RecipeId): string {
  return recipeId
    .replace(/^recipe_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

const StepperButton = ({ value, onClick }: { value: number; onClick: () => void }) => {
  const isPos = value > 0;
  const label = isPos ? `+${value}` : `${value}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 text-[9px] font-mono font-black border transition-all select-none hover:text-[#f48721] bg-[#1a1c20] text-[#8e9299] border-[#2a2d33] hover:border-[#f48721]/50 cursor-pointer h-7 flex items-center justify-center"
      style={{
        clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
      }}
    >
      {label}
    </button>
  );
};

export function InputForm({ onCalculate, initialValues }: InputFormProps) {
  const [selectedItem, setSelectedItem] = useState<string>(initialValues?.itemId || 'copper_sheet');
  const [rate, setRate] = useState<number>(initialValues?.rate || 120);
  const [minerId, setMinerId] = useState<MachineId>(initialValues?.minerId || 'miner_mk1');
  const [beltId, setBeltId] = useState<BeltId>(initialValues?.beltId || 'mk1');
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelectionMap>(initialValues?.recipeSelections || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAltRecipes, setShowAltRecipes] = useState(false);

  React.useEffect(() => {
    if (initialValues) {
      setSelectedItem(initialValues.itemId);
      setRate(initialValues.rate);
      setMinerId(initialValues.minerId);
      setBeltId(initialValues.beltId);
      setRecipeSelections(initialValues.recipeSelections || {});
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && rate > 0) {
      onCalculate(selectedItem, rate, minerId, beltId, recipeSelections);
    }
  };

  const availableMiners = Object.values(machines).filter(m => m.id.startsWith('miner'));
  const availableBelts = Object.values(belts);
  const selectedItemData = items[selectedItem as keyof typeof items];
  const alternateRecipeCandidates = React.useMemo(
    () => getAlternateRecipeCandidates(selectedItem, recipeSelections),
    [selectedItem, recipeSelections]
  );

  const handleAlternateRecipeChange = (itemId: string, recipeId: string) => {
    const nextSelections: RecipeSelectionMap = { ...recipeSelections, [itemId]: recipeId };
    setRecipeSelections(nextSelections);
    if (selectedItem && rate > 0) {
      onCalculate(selectedItem, rate, minerId, beltId, nextSelections);
    }
  };

  const altCount = Object.keys(recipeSelections).length;

  return (
    <div className="relative w-full">
      {/* ── FICSIT Industrial Production Control Panel ── */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full text-white bg-transparent"
      >
        {/* Slanted Background & Border decoration (non-clipping parent context) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #1e2024 0%, #13151a 100%)',
            border: '1px solid #2a2d33',
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.6)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Top orange accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 40, right: 40, height: '2px',
          background: 'linear-gradient(90deg, transparent, #f48721, transparent)',
          opacity: 0.7,
          zIndex: 10,
        }} />

        {/* Corner accent – top-left chamfer highlight */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 0, height: 0,
          borderTop: '12px solid #f48721', borderRight: '12px solid transparent',
          zIndex: 10,
        }} />

        {/* Panel header label */}
        <div className="relative z-10 flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-[#2a2d33]">
          <div style={{
            width: 3, height: 14,
            background: 'linear-gradient(180deg, #f48721, #c45700)',
            borderRadius: 2,
          }} />
          <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">
            FICSIT // Production Control
          </span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
          <Zap size={10} className="text-[#f48721] opacity-60" />
        </div>

        {/* Controls row */}
        <div className="relative z-10 flex flex-row items-end gap-3.5 flex-wrap p-3.5">

          {/* ── Target Item ── */}
          <div className="flex flex-col gap-1 flex-[2] min-w-[180px]">
            <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Target Item</label>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="sf-input-container flex items-center justify-between w-full px-2.5 py-1.5 outline-none group text-white"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: '#1a1c20', border: '1px solid #2a2d33' }}>
                  {selectedItemData?.imageUrl && (
                    <AppImage idKey={selectedItemData.id} fallbackUrl={selectedItemData.imageUrl} alt={selectedItemData.name} className="w-full h-full object-contain" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#e4e3e0]">{selectedItemData?.name || 'Select Item'}</span>
              </div>
              <ChevronDown size={12} className="text-[#8E9299] group-hover:text-[#f48721] transition-colors" />
            </button>
          </div>

          {/* ── Rate ── */}
          <div className="flex flex-col gap-1 flex-shrink-0 min-w-[200px]">
            <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Rate / m</label>
            <div className="flex items-center gap-1">
              <StepperButton value={-50} onClick={() => setRate(prev => Math.max(1, prev - 50))} />
              <StepperButton value={-10} onClick={() => setRate(prev => Math.max(1, prev - 10))} />
              <input
                type="number"
                step="1"
                min="1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="sf-input-container text-center text-white px-2 py-1 outline-none font-mono text-xs w-16 h-7"
              />
              <StepperButton value={10} onClick={() => setRate(prev => prev + 10)} />
              <StepperButton value={50} onClick={() => setRate(prev => prev + 50)} />
            </div>
          </div>

          {/* ── Miner Tier ── */}
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Miner Tier</label>
            <CustomSelect
              value={minerId}
              onChange={(val) => setMinerId(val as MachineId)}
              options={availableMiners.map(m => ({ value: m.id, label: m.name }))}
            />
          </div>

          {/* ── Belt Tier ── */}
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Belt Tier</label>
            <CustomSelect
              value={beltId}
              onChange={(val) => setBeltId(val as BeltId)}
              options={availableBelts.map(b => ({ value: b.id, label: b.name }))}
            />
          </div>

          {/* ── Alt Recipes ── */}
          <div className="relative flex flex-col gap-1 flex-1 min-w-[130px] z-20">
            <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Alt Recipes</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAltRecipes(!showAltRecipes)}
                className="sf-input-container px-2.5 py-1.5 flex items-center gap-2 outline-none text-[#8E9299] hover:text-white font-mono text-xs transition-colors w-full"
              >
                {altCount > 0 && (
                  <span style={{
                    background: '#f48721', color: '#000', fontSize: 9,
                    fontWeight: 700, borderRadius: 2, padding: '1px 5px',
                    fontFamily: 'monospace',
                  }}>{altCount}</span>
                )}
                <span className="uppercase text-[10px] tracking-widest flex-1 text-left">
                  {altCount > 0 ? 'Active' : 'None'}
                </span>
                {showAltRecipes ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {altCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRecipeSelections({});
                    onCalculate(selectedItem, rate, minerId, beltId, {});
                  }}
                  title="Reset all alternate recipes"
                  className="p-1.5 text-[#8E9299] hover:text-[#f48721] transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>

            {/* Alt Recipes Dropdown Panel (positioned locally relative to trigger column, overflow-safe) */}
            {showAltRecipes && (
              <div
                className="absolute shadow-2xl z-50"
                style={{
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: 340,
                  background: 'linear-gradient(180deg, #1a1c20 0%, #111315 100%)',
                  border: '1px solid #2a2d33',
                  clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.04)',
                }}
              >
                {/* Panel header */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #2a2d33' }}>
                  <div style={{ width: 2, height: 10, background: '#f48721', borderRadius: 1 }} />
                  <span className="text-[9px] font-mono tracking-widest text-[#f48721] uppercase">Alternate Recipes</span>
                </div>
                {/* Corner accent */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTop: '10px solid #f48721', borderRight: '10px solid transparent' }} />

                <div className="p-3 flex flex-col gap-2.5 max-h-72 overflow-y-auto">
                  {alternateRecipeCandidates.length === 0 ? (
                    <div className="text-[10px] text-[#6b7280] font-mono px-2 py-1.5" style={{ border: '1px solid #2a2d33', background: '#0d0f11' }}>
                      No alternate recipes available for this production chain.
                    </div>
                  ) : (
                    alternateRecipeCandidates.map((candidate) => (
                      <div key={candidate.itemId} className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono tracking-widest text-[#8E9299] uppercase">
                          {items[candidate.itemId]?.name || candidate.itemId}
                        </label>
                        <CustomSelect
                          value={candidate.selectedRecipeId}
                          onChange={(value) => handleAlternateRecipeChange(candidate.itemId, value)}
                          options={candidate.recipes.map((recipe) => {
                            const inputNames = recipe.inputs.map(i => items[i.itemId]?.name || i.itemId).join(', ');
                            return {
                              value: recipe.id,
                              label: `${formatRecipeLabel(recipe.id)} (${recipe.outputRate}/m) [${inputNames}]`,
                            };
                          })}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Calculate button ── */}
          <div className="ml-auto px-1 py-1.5 flex items-end flex-shrink-0">
            <button
              type="submit"
              className="font-bold tracking-[0.15em] uppercase relative overflow-hidden flex items-center gap-3 bg-[#f48721] text-black hover:bg-[#ff9a3c] transition-all cursor-pointer shadow-[0_0_15px_rgba(244,135,33,0.3)] hover:shadow-[0_0_20px_rgba(244,135,33,0.5)] h-8 font-mono"
              style={{
                padding: '4px 10px 4px 16px',
                fontSize: 10,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              <span>Calculate Flow</span>
              <div 
                className="w-5 h-5 flex items-center justify-center bg-[#8b3e00] text-white shrink-0"
                style={{
                  clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
                }}
              >
                <span className="text-[8px] leading-none select-none">▶</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom edge accent */}
        <div style={{
          position: 'absolute', bottom: 0, right: 12, left: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, #2a2d33 40%)',
          zIndex: 10,
        }} />
        {/* Bottom-right chamfer highlight */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0, width: 0, height: 0,
          borderBottom: '12px solid #f4872120', borderLeft: '12px solid transparent',
          zIndex: 10,
        }} />
      </form>

      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(id) => setSelectedItem(id)}
      />
    </div>
  );
}

