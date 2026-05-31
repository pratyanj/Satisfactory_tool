import React, { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Zap } from 'lucide-react';
import { AppImage } from './AppImage';
import { items, belts, machines, recipes, BeltId, MachineId, RecipeId } from '../engine/data';
import { ItemModal } from './ItemModal';
import { CustomSelect } from './CustomSelect';
import { getAlternateRecipeCandidates, RecipeSelectionMap } from '../engine/solver';

export type TargetMode = 'rate' | 'machine' | 'belt' | 'pipe' | 'resource';

export interface TargetOutput {
  itemId: string;
  rate: number;
  mode: TargetMode;
  machineCount?: number;
  recipeId?: string;
  beltTier?: BeltId;
  beltCount?: number;
  pipeTier?: 'mk1' | 'mk2';
  pipeCount?: number;
  nodePurity?: 'impure' | 'normal' | 'pure';
  nodeMinerId?: MachineId;
  nodeClockSpeed?: number;
}

interface InputFormProps {
  onCalculate: (itemId: string, rate: number, minerId: MachineId, beltId: BeltId, recipeSelections: RecipeSelectionMap, targets?: TargetOutput[]) => void;
  initialValues?: { itemId: string, rate: number, minerId: MachineId, beltId: BeltId, recipeSelections?: RecipeSelectionMap, targets?: TargetOutput[] };
}

function formatRecipeLabel(recipeId: RecipeId): string {
  return recipeId
    .replace(/^recipe_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function InputForm({ onCalculate, initialValues }: InputFormProps) {
  const [targets, setTargets] = useState<TargetOutput[]>(
    initialValues?.targets || [
      {
        itemId: initialValues?.itemId || 'copper_sheet',
        rate: initialValues?.rate || 120,
        mode: 'rate',
        machineCount: 1,
        beltTier: 'mk1',
        beltCount: 1,
        pipeTier: 'mk1',
        pipeCount: 1,
        nodePurity: 'normal',
        nodeMinerId: 'miner_mk1',
        nodeClockSpeed: 100,
      }
    ]
  );
  const [minerId, setMinerId] = useState<MachineId>(initialValues?.minerId || 'miner_mk1');
  const [beltId, setBeltId] = useState<BeltId>(initialValues?.beltId || 'mk1');
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelectionMap>(initialValues?.recipeSelections || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTargetIndex, setEditingTargetIndex] = useState<number | null>(null);
  const [showAltRecipes, setShowAltRecipes] = useState(false);

  // Synchronize local state when inputs, targets, or selections are modified
  const updateFormState = (
    nextTargets: TargetOutput[],
    nextMinerId: MachineId,
    nextBeltId: BeltId,
    nextRecipeSelections: RecipeSelectionMap
  ) => {
    setTargets(nextTargets);
    setMinerId(nextMinerId);
    setBeltId(nextBeltId);
    setRecipeSelections(nextRecipeSelections);
  };

  React.useEffect(() => {
    if (initialValues) {
      const initialTargets = initialValues.targets || [
        {
          itemId: initialValues.itemId,
          rate: initialValues.rate,
          mode: 'rate',
          machineCount: 1,
          beltTier: 'mk1',
          beltCount: 1,
          pipeTier: 'mk1',
          pipeCount: 1,
          nodePurity: 'normal',
          nodeMinerId: 'miner_mk1',
          nodeClockSpeed: 100,
        }
      ];

      const targetsMatch = JSON.stringify(targets) === JSON.stringify(initialTargets);
      if (!targetsMatch) {
        setTargets(initialTargets);
      }
      if (minerId !== initialValues.minerId) {
        setMinerId(initialValues.minerId);
      }
      if (beltId !== initialValues.beltId) {
        setBeltId(initialValues.beltId);
      }
      const recipesMatch = JSON.stringify(recipeSelections) === JSON.stringify(initialValues.recipeSelections || {});
      if (!recipesMatch) {
        setRecipeSelections(initialValues.recipeSelections || {});
      }
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targets.length > 0) {
      onCalculate(targets[0].itemId, targets[0].rate, minerId, beltId, recipeSelections, targets);
    }
  };

  const availableMiners = Object.values(machines).filter(m => m.id.startsWith('miner'));
  const availableBelts = Object.values(belts);

  const alternateRecipeCandidates = React.useMemo(() => {
    const candidatesMap = new Map<string, any>();
    for (const t of targets) {
      try {
        const itemCandidates = getAlternateRecipeCandidates(t.itemId, recipeSelections);
        for (const cand of itemCandidates) {
          candidatesMap.set(cand.itemId, cand);
        }
      } catch (err) {
        // Safe catch for partial or virtual items
      }
    }
    return Array.from(candidatesMap.values());
  }, [targets, recipeSelections]);

  const handleAlternateRecipeChange = (itemId: string, recipeId: string) => {
    const nextSelections: RecipeSelectionMap = { ...recipeSelections, [itemId]: recipeId };
    updateFormState(targets, minerId, beltId, nextSelections);
  };

  const altCount = Object.keys(recipeSelections).length;

  return (
    <div className="relative w-full">
      {/* ── FICSIT Industrial Production Control Panel ── */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full text-white bg-transparent"
      >
        {/* Slanted Background & Border decoration */}
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

        {/* Corner accent */}
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

        {/* ── Dynamic Target Outputs Stack ── */}
        <div className="relative z-10 p-4 flex flex-col gap-3">
          <style dangerouslySetInnerHTML={{ __html: `
            .sf-scrollable-targets::-webkit-scrollbar {
              width: 4px;
            }
            .sf-scrollable-targets::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.15);
              border-radius: 2px;
            }
            .sf-scrollable-targets::-webkit-scrollbar-thumb {
              background: #2a2d33;
              border-radius: 2px;
            }
            .sf-scrollable-targets::-webkit-scrollbar-thumb:hover {
              background: #f48721;
            }
          ` }} />
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono tracking-[0.2em] text-[#8e9299] uppercase font-bold">Planned Target Outputs</span>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1.5 sf-scrollable-targets">
              {targets.map((target, idx) => {
              const itemData = items[target.itemId];
              return (
                <div key={idx} className="flex items-center gap-3.5 flex-wrap bg-[#121316] border border-[#23262d] p-2.5 rounded relative">
                  
                  {/* Target Item Selection */}
                  <div className="flex flex-col gap-1 flex-grow min-w-[150px]">
                    <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Item</label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTargetIndex(idx);
                        setIsModalOpen(true);
                      }}
                      className="sf-input-container flex items-center justify-between w-full px-2.5 py-1.5 outline-none group text-white bg-[#0a0b0d]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded shrink-0 overflow-hidden flex items-center justify-center bg-[#15171b] border border-[#2a2d33]">
                          {itemData?.imageUrl && (
                            <AppImage idKey={itemData.id} fallbackUrl={itemData.imageUrl} alt={itemData.name} className="w-full h-full object-contain" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-[#e4e3e0]">{itemData?.name || 'Select Item'}</span>
                      </div>
                      <ChevronDown size={12} className="text-[#8E9299] group-hover:text-[#f48721] transition-colors" />
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex flex-col gap-1 w-28 flex-shrink-0">
                    <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Mode</label>
                    <select
                      value={target.mode || 'rate'}
                      onChange={(e) => {
                        const newTargets = [...targets];
                        const mode = e.target.value as TargetMode;
                        newTargets[idx].mode = mode;
                        
                        // Initialize defaults for modes
                        if (mode === 'machine' && !newTargets[idx].recipeId) {
                          newTargets[idx].machineCount = 1;
                          const availableRecipes = recipes.filter(r => r.outputItemId === target.itemId);
                          newTargets[idx].recipeId = availableRecipes[0]?.id || '';
                        } else if (mode === 'belt' && !newTargets[idx].beltTier) {
                          newTargets[idx].beltTier = 'mk1';
                          newTargets[idx].beltCount = 1;
                        } else if (mode === 'pipe' && !newTargets[idx].pipeTier) {
                          newTargets[idx].pipeTier = 'mk1';
                          newTargets[idx].pipeCount = 1;
                        } else if (mode === 'resource' && !newTargets[idx].nodePurity) {
                          newTargets[idx].nodePurity = 'normal';
                          newTargets[idx].nodeMinerId = 'miner_mk1';
                          newTargets[idx].nodeClockSpeed = 100;
                        }
                        updateFormState(newTargets, minerId, beltId, recipeSelections);
                      }}
                      className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                    >
                      <option value="rate">Items/min</option>
                      <option value="machine">Machines</option>
                      <option value="belt">Belts</option>
                      <option value="pipe">Pipes</option>
                      <option value="resource">Resource Node</option>
                    </select>
                  </div>

                  {/* Context-aware dynamic inputs */}
                  {target.mode === 'rate' && (
                    <div className="flex flex-col gap-1 w-20 flex-shrink-0">
                      <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Rate/m</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={target.rate}
                        onChange={(e) => {
                          const newTargets = [...targets];
                          newTargets[idx].rate = Math.max(1, Number(e.target.value));
                          updateFormState(newTargets, minerId, beltId, recipeSelections);
                        }}
                        className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                      />
                    </div>
                  )}

                  {target.mode === 'machine' && (
                    <>
                      <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Recipe</label>
                        <select
                          value={target.recipeId || ''}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].recipeId = e.target.value;
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        >
                          {recipes.filter(r => r.outputItemId === target.itemId).map(r => (
                            <option key={r.id} value={r.id}>
                              {formatRecipeLabel(r.id)} ({r.outputRate}/m)
                            </option>
                          ))}
                          {recipes.filter(r => r.outputItemId === target.itemId).length === 0 && (
                            <option value="">No standard recipes</option>
                          )}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Machines</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={target.machineCount ?? 1}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].machineCount = Math.max(0.1, Number(e.target.value));
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        />
                      </div>
                    </>
                  )}

                  {target.mode === 'belt' && (
                    <>
                      <div className="flex flex-col gap-1 w-28 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Belt Tier</label>
                        <select
                          value={target.beltTier || 'mk1'}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].beltTier = e.target.value as BeltId;
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        >
                          {availableBelts.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.capacity}/m)</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Belts</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={target.beltCount ?? 1}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].beltCount = Math.max(0.1, Number(e.target.value));
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        />
                      </div>
                    </>
                  )}

                  {target.mode === 'pipe' && (
                    <>
                      <div className="flex flex-col gap-1 w-28 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Pipe Tier</label>
                        <select
                          value={target.pipeTier || 'mk1'}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].pipeTier = e.target.value as 'mk1' | 'mk2';
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        >
                          <option value="mk1">Mk.1 Pipe (300/m)</option>
                          <option value="mk2">Mk.2 Pipe (600/m)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Pipes</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={target.pipeCount ?? 1}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].pipeCount = Math.max(0.1, Number(e.target.value));
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        />
                      </div>
                    </>
                  )}

                  {target.mode === 'resource' && (
                    <>
                      <div className="flex flex-col gap-1 w-20 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Purity</label>
                        <select
                          value={target.nodePurity || 'normal'}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].nodePurity = e.target.value as 'impure' | 'normal' | 'pure';
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        >
                          <option value="impure">Impure</option>
                          <option value="normal">Normal</option>
                          <option value="pure">Pure</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 w-24 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Miner</label>
                        <select
                          value={target.nodeMinerId || 'miner_mk1'}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].nodeMinerId = e.target.value as MachineId;
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        >
                          {availableMiners.map(m => (
                            <option key={m.id} value={m.id}>{m.name.replace('Miner ', '')}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 w-14 flex-shrink-0">
                        <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Clock %</label>
                        <input
                          type="number"
                          step="25"
                          min="1"
                          max="250"
                          value={target.nodeClockSpeed ?? 100}
                          onChange={(e) => {
                            const newTargets = [...targets];
                            newTargets[idx].nodeClockSpeed = Math.max(1, Number(e.target.value));
                            updateFormState(newTargets, minerId, beltId, recipeSelections);
                          }}
                          className="sf-input-container w-full text-white px-2.5 py-1.5 outline-none font-mono text-xs bg-[#0a0b0d]"
                        />
                      </div>
                    </>
                  )}

                  {/* Remove target row */}
                  {targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newTargets = targets.filter((_, i) => i !== idx);
                        updateFormState(newTargets, minerId, beltId, recipeSelections);
                      }}
                      className="text-[#8e9299] hover:text-[#ef4444] transition-colors p-1"
                      title="Remove output target"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const newTargets = [...targets, {
                  itemId: 'iron_plate',
                  rate: 60,
                  mode: 'rate',
                  machineCount: 1,
                  beltTier: 'mk1',
                  beltCount: 1,
                  pipeTier: 'mk1',
                  pipeCount: 1,
                  nodePurity: 'normal',
                  nodeMinerId: 'miner_mk1',
                  nodeClockSpeed: 100,
                }];
                updateFormState(newTargets, minerId, beltId, recipeSelections);
              }}
              className="sf-secondary-btn py-1 px-3 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5 border border-[#2a2d33] hover:border-[#f48721]/60"
            >
              ＋ Add Target
            </button>
          </div>
        </div>

        {/* ── Hardware & Alternate Recipes Controls row ── */}
        <div className="relative z-10 flex flex-row items-end gap-3.5 flex-wrap p-3.5 border-t border-[#2a2d33] bg-[#14161a]/30">

          {/* ── Miner Tier ── */}
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Miner Tier (Fallback)</label>
            <CustomSelect
              value={minerId}
              onChange={(val) => updateFormState(targets, val as MachineId, beltId, recipeSelections)}
              options={availableMiners.map(m => ({ value: m.id, label: m.name }))}
            />
          </div>

          {/* ── Belt Tier (Primary/Diagnostics) ── */}
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Belt Tier</label>
            <CustomSelect
              value={beltId}
              onChange={(val) => updateFormState(targets, minerId, val as BeltId, recipeSelections)}
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
                  }}
                  title="Reset all alternate recipes"
                  className="p-1.5 text-[#8E9299] hover:text-[#f48721] transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>

            {/* Alt Recipes Dropdown Panel */}
            {showAltRecipes && (
              <div
                className="absolute shadow-2xl z-50"
                style={{
                  bottom: '100%',
                  right: 0,
                  marginBottom: '6px',
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
              className="sf-primary-btn font-bold tracking-[0.15em] uppercase relative overflow-hidden"
              style={{ padding: '8px 22px', fontSize: 11 }}
            >
              <span className="sf-btn-scanner absolute inset-0 pointer-events-none z-10" />
              <span className="relative z-20">Calculate Flow</span>
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingTargetIndex(null);
        }}
        onSelect={(id) => {
          if (editingTargetIndex !== null) {
            const newTargets = [...targets];
            newTargets[editingTargetIndex].itemId = id;
            
            // Adjust recipeId if item changed in machine mode
            if (newTargets[editingTargetIndex].mode === 'machine') {
              const availableRecipes = recipes.filter(r => r.outputItemId === id);
              newTargets[editingTargetIndex].recipeId = availableRecipes[0]?.id || '';
            }
            updateFormState(newTargets, minerId, beltId, recipeSelections);
          }
        }}
      />
    </div>
  );
}
