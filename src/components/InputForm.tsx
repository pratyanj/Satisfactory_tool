import React, { useState } from 'react';
import { Settings2, Zap, Play } from 'lucide-react';
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

export function InputForm({ onCalculate, initialValues }: InputFormProps) {
  const [selectedItem, setSelectedItem] = useState<string>(initialValues?.itemId || 'copper_sheet');
  const [rate, setRate] = useState<number>(initialValues?.rate || 120);
  const [minerId, setMinerId] = useState<MachineId>(initialValues?.minerId || 'miner_mk1');
  const [beltId, setBeltId] = useState<BeltId>(initialValues?.beltId || 'mk1');
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelectionMap>(initialValues?.recipeSelections || {});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state if initialValues changes (e.g. from URL load)
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

  const producibleItems = Object.values(items).filter(item => 
    !['copper_ore', 'iron_ore', 'limestone', 'coal'].includes(item.id)
  );
  
  const availableMiners = Object.values(machines).filter(m => m.id.startsWith('miner'));
  const availableBelts = Object.values(belts);

  const selectedItemData = items[selectedItem as keyof typeof items];
  const alternateRecipeCandidates = React.useMemo(
    () => getAlternateRecipeCandidates(selectedItem, recipeSelections),
    [selectedItem, recipeSelections]
  );

  const handleAlternateRecipeChange = (itemId: string, recipeId: string) => {
    const nextSelections: RecipeSelectionMap = {
      ...recipeSelections,
      [itemId]: recipeId,
    };
    setRecipeSelections(nextSelections);
    if (selectedItem && rate > 0) {
      onCalculate(selectedItem, rate, minerId, beltId, nextSelections);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-[#151619] border border-[#2a2d33] rounded-2xl p-6 text-white w-full max-w-sm flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#f0f0f0] mb-1">Production Goal</h2>
          <p className="text-xs text-[#8E9299]">Calculate your optimal factory layout.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase">Target Item</label>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-between w-full bg-[#1c1e22] border border-[#2a2d33] rounded-lg px-3 py-2 outline-none hover:border-orange-500 transition-colors group focus:border-orange-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-[#242528] flex items-center justify-center p-0.5">
                {selectedItemData?.imageUrl ? (
                  <AppImage idKey={selectedItemData.id} fallbackUrl={selectedItemData.imageUrl} alt={selectedItemData.name} className="w-full h-full object-contain" />
                ) : null}
              </div>
              <span className="text-sm font-medium">{selectedItemData?.name || 'Select Item'}</span>
            </div>
            <div className="text-[#8E9299] group-hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </button>
        </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase">Rate (per min)</label>
        <input 
          type="number" 
          step="1"
          min="1"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="bg-[#1c1e22] border border-[#2a2d33] rounded-lg px-3 py-2.5 outline-none focus:border-orange-500 transition-colors font-mono text-sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase text-[10px]">Miner Tier</label>
          <CustomSelect 
            value={minerId}
            onChange={(val) => setMinerId(val as MachineId)}
            options={availableMiners.map(m => ({ value: m.id, label: m.name }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase text-[10px]">Belt Tier</label>
          <CustomSelect 
            value={beltId}
            onChange={(val) => setBeltId(val as BeltId)}
            options={availableBelts.map(b => ({ value: b.id, label: b.name }))}
          />
        </div>
      </div>

      <div className="border-t border-[#2a2d33] pt-4 flex flex-col gap-3">
        <div>
          <h3 className="text-xs font-mono tracking-widest text-[#8E9299] uppercase">Alternate Recipes</h3>
          <p className="text-[11px] text-[#6f7681] mt-1">Choose recipes for items used in this production chain.</p>
        </div>

        {alternateRecipeCandidates.length === 0 ? (
          <div className="text-xs text-[#8E9299] bg-[#1c1e22] border border-[#2a2d33] rounded-lg px-3 py-2">
            No alternate recipes available for this goal.
          </div>
        ) : (
          alternateRecipeCandidates.map((candidate) => (
            <div key={candidate.itemId} className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#b8bec9]">
                {items[candidate.itemId]?.name || candidate.itemId}
              </label>
              <CustomSelect
                value={candidate.selectedRecipeId}
                onChange={(value) => handleAlternateRecipeChange(candidate.itemId, value)}
                options={candidate.recipes.map((recipe) => ({
                  value: recipe.id,
                  label: `${formatRecipeLabel(recipe.id)} (${recipe.outputRate}/min)`,
                }))}
              />
            </div>
          ))
        )}
      </div>

      <button 
        type="submit"
        className="mt-2 bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 px-4 rounded-lg transition-colors active:scale-[0.98] transform flex justify-center items-center gap-2"
      >
        <span>Calculate Flow</span>
      </button>
    </form>
    
    <ItemModal 
      isOpen={isModalOpen} 
      onClose={() => setIsModalOpen(false)} 
      onSelect={(id) => setSelectedItem(id)} 
    />
  </>
  );
}
