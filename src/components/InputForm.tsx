import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Globe, RotateCcw, Zap } from 'lucide-react';
import { AppImage } from './AppImage';
import { items, belts, machines, recipes, BeltId, MachineId, RecipeId } from '../engine/data';
import {
  DEFAULT_WORLD_SETTINGS,
  MAX_WORLD_MULTIPLIER,
  MIN_WORLD_MULTIPLIER,
  NODE_PURITY_OPTIONS,
  POWER_MULTIPLIER_PRESETS,
  RECIPE_COST_PRESETS,
  formatMultiplier,
  hasActiveWorldSettings,
  normalizeMultiplier,
  type NodePurity,
} from '../engine/worldSettings';
import { ItemModal } from './ItemModal';
import { CustomSelect } from './CustomSelect';
import { getAlternateRecipeCandidates, analyzeChainUsage, RecipeSelectionMap } from '../engine/solver';

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
  onCalculate: (
    itemId: string,
    rate: number,
    minerId: MachineId,
    beltId: BeltId,
    recipeSelections: RecipeSelectionMap,
    targets?: TargetOutput[],
    pipeTier?: 'mk1' | 'mk2',
    extractorTier?: string,
    overclock?: number,
    somersloopMultiplier?: number,
    wholeMachineMode?: boolean,
    availableInputs?: Record<string, number>,
    costMultiplier?: number,
    powerMultiplier?: number,
    disableAnimations?: boolean,
    defaultNodePurity?: NodePurity
  ) => void;
  initialValues?: {
    itemId: string;
    rate: number;
    minerId: MachineId;
    beltId: BeltId;
    recipeSelections?: RecipeSelectionMap;
    targets?: TargetOutput[];
    pipeTier?: 'mk1' | 'mk2';
    extractorTier?: string;
    overclock?: number;
    somersloopMultiplier?: number;
    wholeMachineMode?: boolean;
    availableInputs?: Record<string, number>;
    costMultiplier?: number;
    powerMultiplier?: number;
    disableAnimations?: boolean;
    defaultNodePurity?: NodePurity;
  };
}

interface MultiplierSelectorProps {
  label: string;
  hint: string;
  value: number;
  presets: readonly number[];
  onChange: (next: number) => void;
}

/** Shared preset + custom multiplier control for World Settings (DRY). */
function MultiplierSelector({ label, hint, value, presets, onChange }: MultiplierSelectorProps) {
  const [draft, setDraft] = useState<string>(formatMultiplier(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(formatMultiplier(value));
    }
  }, [value, isEditing]);

  const commitDraft = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      const normalized = normalizeMultiplier(parsed, 1);
      onChange(normalized);
      setDraft(formatMultiplier(normalized));
    } else {
      setDraft(formatMultiplier(value));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono tracking-[0.18em] text-[#8E9299] uppercase font-semibold">{label}</span>
          <span className="text-[9px] font-mono text-[#555b66]">{hint}</span>
        </div>
        <span
          className="text-xs font-black font-mono px-1.5 py-0.5 rounded"
          style={{
            background: Math.abs(value - 1) > 1e-9 ? 'rgba(244,135,33,0.14)' : '#121418',
            border: `1px solid ${Math.abs(value - 1) > 1e-9 ? '#f4872150' : '#23262d'}`,
            color: Math.abs(value - 1) > 1e-9 ? '#f48721' : '#d4d3d0',
          }}
        >
          {formatMultiplier(value)}×
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {presets.map((preset) => {
          const isActive = Math.abs(value - preset) < 1e-6;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className="px-2 py-1 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer"
              style={{
                background: isActive ? '#f48721' : '#0d0f12',
                border: `1px solid ${isActive ? '#f48721' : '#23262d'}`,
                color: isActive ? '#000' : '#8E9299',
              }}
            >
              {formatMultiplier(preset)}×
            </button>
          );
        })}

        <div className="flex items-center gap-1 ml-auto px-2 py-0.5 rounded" style={{ background: '#0d0f12', border: '1px solid #23262d' }}>
          <span className="text-[8px] font-mono uppercase tracking-wider text-[#555b66]">Custom</span>
          <input
            type="number"
            min={MIN_WORLD_MULTIPLIER}
            max={MAX_WORLD_MULTIPLIER}
            step="any"
            value={draft}
            aria-label={`${label} custom value`}
            onFocus={() => setIsEditing(true)}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              const parsed = parseFloat(raw);
              if (Number.isFinite(parsed) && parsed >= MIN_WORLD_MULTIPLIER && parsed <= MAX_WORLD_MULTIPLIER) {
                onChange(normalizeMultiplier(parsed, 1));
              }
            }}
            onBlur={() => {
              setIsEditing(false);
              commitDraft(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsEditing(false);
                commitDraft(draft);
              }
            }}
            className="w-12 text-right text-[10px] font-mono font-bold text-[#e4e3e0] bg-transparent border-none outline-none"
          />
          <span className="text-[9px] font-mono text-[#555b66]">×</span>
        </div>
      </div>
    </div>
  );
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
        itemId: initialValues?.itemId || 'reinforced_iron_plate',
        rate: initialValues?.rate || 120,
        mode: 'rate',
        machineCount: 1,
        beltTier: 'mk1',
        beltCount: 1,
        pipeTier: 'mk1',
        pipeCount: 1,
        nodeMinerId: 'miner_mk1',
        nodeClockSpeed: 100,
      }
    ]
  );
  const [minerId, setMinerId] = useState<MachineId>(initialValues?.minerId || 'miner_mk1');
  const [beltId, setBeltId] = useState<BeltId>(initialValues?.beltId || 'mk1');
  
  // New States
  const [pipeTier, setPipeTier] = useState<'mk1' | 'mk2'>(initialValues?.pipeTier || 'mk1');
  const [extractorTier, setExtractorTier] = useState<string>(initialValues?.extractorTier || 'mk1');
  const [overclock, setOverclock] = useState<number>(initialValues?.overclock ?? 100);
  const [somersloopMultiplier, setSomersloopMultiplier] = useState<number>(initialValues?.somersloopMultiplier ?? 1);
  const [wholeMachineMode, setWholeMachineMode] = useState<boolean>(initialValues?.wholeMachineMode ?? false);
  const [costMultiplier, setCostMultiplier] = useState<number>(initialValues?.costMultiplier ?? DEFAULT_WORLD_SETTINGS.recipeCostMultiplier);
  const [powerMultiplier, setPowerMultiplier] = useState<number>(initialValues?.powerMultiplier ?? DEFAULT_WORLD_SETTINGS.powerMultiplier);
  const [defaultNodePurity, setDefaultNodePurity] = useState<NodePurity>(initialValues?.defaultNodePurity ?? DEFAULT_WORLD_SETTINGS.defaultNodePurity);
  const [disableAnimations, setDisableAnimations] = useState<boolean>(initialValues?.disableAnimations ?? false);
  const [isWorldSettingsOpen, setIsWorldSettingsOpen] = useState<boolean>(() =>
    hasActiveWorldSettings({
      recipeCostMultiplier: initialValues?.costMultiplier,
      powerMultiplier: initialValues?.powerMultiplier,
      defaultNodePurity: initialValues?.defaultNodePurity,
    })
  );
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Items the user already has available (imports). The solver consumes these
  // and only produces the shortfall. Stored as rows; sent as a {itemId: rate} map.
  const [availableInputs, setAvailableInputs] = useState<{ itemId: string; rate: number }[]>(
    () => Object.entries(initialValues?.availableInputs || {}).map(([itemId, rate]) => ({ itemId, rate }))
  );
  const [isInputsOpen, setIsInputsOpen] = useState((Object.keys(initialValues?.availableInputs || {}).length) > 0);
  const [editingSupplyIndex, setEditingSupplyIndex] = useState<number | null>(null);

  const [recipeSelections, setRecipeSelections] = useState<RecipeSelectionMap>(initialValues?.recipeSelections || {});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTargetIndex, setEditingTargetIndex] = useState<number | null>(null);
  const [showAltRecipes, setShowAltRecipes] = useState(false);

  // Synchronize local state when inputs, targets, or selections are modified
  const updateFormState = (
    nextTargets: TargetOutput[],
    nextMinerId: MachineId = minerId,
    nextBeltId: BeltId = beltId,
    nextRecipeSelections: RecipeSelectionMap = recipeSelections
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
      if (initialValues.pipeTier && pipeTier !== initialValues.pipeTier) {
        setPipeTier(initialValues.pipeTier);
      }
      if (initialValues.extractorTier && extractorTier !== initialValues.extractorTier) {
        setExtractorTier(initialValues.extractorTier);
      }
      if (initialValues.overclock !== undefined && overclock !== initialValues.overclock) {
        setOverclock(initialValues.overclock);
      }
      if (initialValues.somersloopMultiplier !== undefined && somersloopMultiplier !== initialValues.somersloopMultiplier) {
        setSomersloopMultiplier(initialValues.somersloopMultiplier);
      }
      if (initialValues.wholeMachineMode !== undefined && wholeMachineMode !== initialValues.wholeMachineMode) {
        setWholeMachineMode(initialValues.wholeMachineMode);
      }
      if (initialValues.costMultiplier !== undefined && costMultiplier !== initialValues.costMultiplier) {
        setCostMultiplier(initialValues.costMultiplier);
      }
      if (initialValues.powerMultiplier !== undefined && powerMultiplier !== initialValues.powerMultiplier) {
        setPowerMultiplier(initialValues.powerMultiplier);
      }
      if (initialValues.defaultNodePurity !== undefined && defaultNodePurity !== initialValues.defaultNodePurity) {
        setDefaultNodePurity(initialValues.defaultNodePurity);
      }
      if (initialValues.disableAnimations !== undefined && disableAnimations !== initialValues.disableAnimations) {
        setDisableAnimations(initialValues.disableAnimations);
      }
      // NOTE: availableInputs is intentionally NOT synced from initialValues here.
      // It is user-driven local state pushed to the plan on Calculate; syncing it
      // back would wipe a just-added row whenever App re-issues lastInput.
      const recipesMatch = JSON.stringify(recipeSelections) === JSON.stringify(initialValues.recipeSelections || {});
      if (!recipesMatch) {
        setRecipeSelections(initialValues.recipeSelections || {});
      }
    }
  }, [initialValues]);

  // Collapse the supply rows into a {itemId: rate} map (last entry wins on dupes).
  const buildAvailableInputsMap = (): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const inp of availableInputs) {
      if (inp.itemId && items[inp.itemId] && inp.rate > 0) {
        map[inp.itemId] = (map[inp.itemId] || 0) + inp.rate;
      }
    }
    return map;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targets.length > 0) {
      onCalculate(
        targets[0].itemId,
        targets[0].rate,
        minerId,
        beltId,
        recipeSelections,
        targets,
        pipeTier,
        extractorTier,
        overclock,
        somersloopMultiplier,
        wholeMachineMode,
        buildAvailableInputsMap(),
        costMultiplier,
        powerMultiplier,
        disableAnimations,
        defaultNodePurity
      );
    }
  };

  const availableMiners = Object.values(machines).filter(m => m.id.startsWith('miner'));
  const availableBelts = Object.values(belts);

  // Inspect the production chain so we only surface controls that are relevant:
  // the extractor tier (only when a fluid extractor is used) and the pipe tier
  // (only when the chain actually transports a fluid).
  const chainUsage = React.useMemo(() => {
    try {
      return analyzeChainUsage(targets.map(t => t.itemId), recipeSelections);
    } catch {
      // On any analysis failure, fall back to showing the controls.
      return { machineIds: new Set<MachineId>(), usesExtractor: true, usesFluid: true };
    }
  }, [targets, recipeSelections]);
  const hardwareColumns = 2 + (chainUsage.usesExtractor ? 1 : 0) + (chainUsage.usesFluid ? 1 : 0);

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
      <form onSubmit={handleSubmit} className="relative w-full text-white bg-transparent">

        {/* Panel background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #1a1c20 0%, #111315 100%)',
          border: '1px solid #23262d',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.7)',
          zIndex: 0, pointerEvents: 'none',
        }} />
        <div style={{ position: 'absolute', top: 0, left: 40, right: 40, height: '2px', background: 'linear-gradient(90deg, transparent, #f48721, transparent)', opacity: 0.6, zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTop: '12px solid #f48721', borderRight: '12px solid transparent', zIndex: 10 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderBottom: '12px solid #f4872115', borderLeft: '12px solid transparent', zIndex: 10 }} />

        {/* ── Header ── */}
        <div className="relative z-10 flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-[#23262d]">
          <div style={{ width: 3, height: 14, background: 'linear-gradient(180deg, #f48721, #c45700)', borderRadius: 2 }} />
          <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">FICSIT // Production Control</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872125, transparent)' }} />
          <Zap size={10} className="text-[#f48721] opacity-50" />
        </div>

        {/* ── Zone 1: Target Outputs ── */}
        <div className="relative z-10 px-4 pt-3 pb-2 flex flex-col gap-2">
          <style dangerouslySetInnerHTML={{ __html: `
            .sf-tscroll::-webkit-scrollbar { width: 3px; }
            .sf-tscroll::-webkit-scrollbar-track { background: transparent; }
            .sf-tscroll::-webkit-scrollbar-thumb { background: #2a2d33; border-radius: 2px; }
            .sf-tscroll::-webkit-scrollbar-thumb:hover { background: #f48721; }
            .sf-trow { transition: border-color 0.15s; }
            .sf-trow:hover { border-color: #343740 !important; }
          ` }} />

          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono tracking-[0.25em] text-[#555b66] uppercase">Target Outputs</span>
            <button
              type="button"
              onClick={() => {
                const newTargets = [...targets, {
                  itemId: 'iron_plate', rate: 60, mode: 'rate' as const,
                  machineCount: 1, beltTier: 'mk1' as const, beltCount: 1,
                  pipeTier: 'mk1' as const, pipeCount: 1,
                  nodeMinerId: 'miner_mk1' as const, nodeClockSpeed: 100,
                }];
                updateFormState(newTargets, minerId, beltId, recipeSelections);
              }}
              className="flex items-center gap-1 text-[9px] font-mono tracking-widest uppercase text-[#f48721] hover:text-[#ffaa55] transition-colors"
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Add Target
            </button>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[210px] sf-tscroll">
            {targets.map((target, idx) => {
              const itemData = items[target.itemId];
              return (
                <div
                  key={idx}
                  className="sf-trow flex items-center gap-2 px-2.5 py-2 rounded"
                  style={{ background: '#0d0f12', border: '1px solid #1e2128' }}
                >
                  {/* Item picker button */}
                  <button
                    type="button"
                    onClick={() => { setEditingTargetIndex(idx); setIsModalOpen(true); }}
                    className="flex items-center gap-2 flex-1 min-w-0 group"
                    style={{ outline: 'none' }}
                  >
                    <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: '#15171b' }}>
                      {itemData?.imageUrl && (
                        <AppImage idKey={itemData.id} fallbackUrl={itemData.imageUrl} alt={itemData.name} className="w-full h-full object-contain" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#d4d3d0] group-hover:text-white transition-colors truncate">{itemData?.name || 'Select Item'}</span>
                    <ChevronDown size={10} className="text-[#555b66] group-hover:text-[#f48721] transition-colors shrink-0 ml-auto" />
                  </button>

                  <div style={{ width: 1, height: 20, background: '#23262d', flexShrink: 0 }} />

                  {/* Mode selector */}
                  <select
                    value={target.mode || 'rate'}
                    onChange={(e) => {
                      const newTargets = [...targets];
                      const mode = e.target.value as TargetMode;
                      newTargets[idx].mode = mode;
                      if (mode === 'machine' && !newTargets[idx].recipeId) {
                        newTargets[idx].machineCount = 1;
                        const ar = recipes.filter(r => r.outputItemId === target.itemId);
                        newTargets[idx].recipeId = ar[0]?.id || '';
                      } else if (mode === 'belt' && !newTargets[idx].beltTier) {
                        newTargets[idx].beltTier = 'mk1'; newTargets[idx].beltCount = 1;
                      } else if (mode === 'pipe' && !newTargets[idx].pipeTier) {
                        newTargets[idx].pipeTier = 'mk1'; newTargets[idx].pipeCount = 1;
                      } else if (mode === 'resource' && !newTargets[idx].nodeMinerId) {
                        newTargets[idx].nodeMinerId = 'miner_mk1'; newTargets[idx].nodeClockSpeed = 100;
                      }
                      updateFormState(newTargets, minerId, beltId, recipeSelections);
                    }}
                    className="text-[10px] font-mono text-[#8E9299] bg-transparent border-none outline-none cursor-pointer shrink-0"
                    style={{ WebkitAppearance: 'none' }}
                  >
                    <option value="rate">Items/min</option>
                    <option value="machine">Machines</option>
                    <option value="belt">Belts</option>
                    <option value="pipe">Pipes</option>
                    <option value="resource">Resource Node</option>
                  </select>

                  {/* Rate value — accepts both integers (120) and decimals (10.8) */}
                  {(target.mode === 'rate' || !target.mode) && (
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={target.rate}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        if (isNaN(parsed) || parsed <= 0) return;
                        const n = [...targets];
                        n[idx].rate = Math.round(parsed * 1000) / 1000;
                        updateFormState(n, minerId, beltId, recipeSelections);
                      }}
                      className="w-16 text-right text-xs font-mono font-bold text-[#f48721] bg-transparent border-none outline-none shrink-0"
                    />
                  )}

                  {/* Machine mode */}
                  {target.mode === 'machine' && (
                    <>
                      <select
                        value={target.recipeId || ''}
                        onChange={(e) => { const n = [...targets]; n[idx].recipeId = e.target.value; updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="text-[10px] font-mono text-[#8E9299] bg-transparent border-none outline-none cursor-pointer flex-1 min-w-0"
                        style={{ WebkitAppearance: 'none' }}
                      >
                        {recipes.filter(r => r.outputItemId === target.itemId).map(r => (
                          <option key={r.id} value={r.id}>{r.name || formatRecipeLabel(r.id)} ({r.outputRate}/m)</option>
                        ))}
                        {recipes.filter(r => r.outputItemId === target.itemId).length === 0 && <option value="">No recipes</option>}
                      </select>
                      <input
                        type="number" step="0.1" min="0.1" value={target.machineCount ?? 1}
                        onChange={(e) => { const n = [...targets]; n[idx].machineCount = Math.max(0.1, Number(e.target.value)); updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="w-12 text-right text-xs font-mono font-bold text-[#f48721] bg-transparent border-none outline-none shrink-0"
                      />
                    </>
                  )}

                  {/* Belt mode */}
                  {target.mode === 'belt' && (
                    <>
                      <select
                        value={target.beltTier || 'mk1'}
                        onChange={(e) => { const n = [...targets]; n[idx].beltTier = e.target.value as BeltId; updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="text-[10px] font-mono text-[#8E9299] bg-transparent border-none outline-none cursor-pointer shrink-0"
                        style={{ WebkitAppearance: 'none' }}
                      >
                        {availableBelts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <input
                        type="number" step="0.1" min="0.1" value={target.beltCount ?? 1}
                        onChange={(e) => { const n = [...targets]; n[idx].beltCount = Math.max(0.1, Number(e.target.value)); updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="w-12 text-right text-xs font-mono font-bold text-[#f48721] bg-transparent border-none outline-none shrink-0"
                      />
                    </>
                  )}

                  {/* Pipe mode */}
                  {target.mode === 'pipe' && (
                    <>
                      <select
                        value={target.pipeTier || 'mk1'}
                        onChange={(e) => { const n = [...targets]; n[idx].pipeTier = e.target.value as 'mk1' | 'mk2'; updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="text-[10px] font-mono text-[#8E9299] bg-transparent border-none outline-none cursor-pointer shrink-0"
                        style={{ WebkitAppearance: 'none' }}
                      >
                        <option value="mk1">Mk.1 (300/m)</option>
                        <option value="mk2">Mk.2 (600/m)</option>
                      </select>
                      <input
                        type="number" step="0.1" min="0.1" value={target.pipeCount ?? 1}
                        onChange={(e) => { const n = [...targets]; n[idx].pipeCount = Math.max(0.1, Number(e.target.value)); updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="w-12 text-right text-xs font-mono font-bold text-[#f48721] bg-transparent border-none outline-none shrink-0"
                      />
                    </>
                  )}

                  {/* Resource mode */}
                  {target.mode === 'resource' && (
                    <>
                      <select
                        value={target.nodePurity || defaultNodePurity}
                        onChange={(e) => { const n = [...targets]; n[idx].nodePurity = e.target.value as NodePurity; updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="text-[10px] font-mono text-[#8E9299] bg-transparent border-none outline-none cursor-pointer shrink-0"
                        style={{ WebkitAppearance: 'none' }}
                      >
                        <option value="impure">Impure</option>
                        <option value="normal">Normal</option>
                        <option value="pure">Pure</option>
                      </select>
                      <select
                        value={target.nodeMinerId || 'miner_mk1'}
                        onChange={(e) => { const n = [...targets]; n[idx].nodeMinerId = e.target.value as MachineId; updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="text-[10px] font-mono text-[#8E9299] bg-transparent border-none outline-none cursor-pointer shrink-0"
                        style={{ WebkitAppearance: 'none' }}
                      >
                        {availableMiners.map(m => <option key={m.id} value={m.id}>{m.name.replace('Miner ', '')}</option>)}
                      </select>
                      <input
                        type="number" step="25" min="1" max="250" value={target.nodeClockSpeed ?? 100}
                        onChange={(e) => { const n = [...targets]; n[idx].nodeClockSpeed = Math.max(1, Number(e.target.value)); updateFormState(n, minerId, beltId, recipeSelections); }}
                        className="w-12 text-right text-xs font-mono font-bold text-[#f48721] bg-transparent border-none outline-none shrink-0"
                      />
                      <span className="text-[9px] text-[#555b66] font-mono shrink-0">%</span>
                    </>
                  )}

                  {/* Remove */}
                  {targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => { const n = targets.filter((_, i) => i !== idx); updateFormState(n, minerId, beltId, recipeSelections); }}
                      className="shrink-0 text-[#2e323b] hover:text-[#ef4444] transition-colors ml-1"
                      title="Remove"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Zone 1.5: Available Inputs (imports the user already has) ── */}
        <div className="relative z-10 px-4 pb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsInputsOpen(o => !o)}
              className="flex items-center gap-1.5 text-[8px] font-mono tracking-[0.25em] uppercase transition-colors"
              style={{ color: availableInputs.length > 0 ? '#2dd4bf' : '#555b66' }}
            >
              {isInputsOpen ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
              <span>Available Inputs</span>
              {availableInputs.length > 0 && (
                <span style={{ background: '#2dd4bf', color: '#000', fontSize: 8, fontWeight: 800, borderRadius: 2, padding: '0 4px' }}>{availableInputs.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setIsInputsOpen(true); setAvailableInputs(prev => [...prev, { itemId: 'iron_ingot', rate: 60 }]); }}
              className="flex items-center gap-1 text-[9px] font-mono tracking-widest uppercase text-[#2dd4bf] hover:text-[#5eead4] transition-colors"
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Add Input
            </button>
          </div>

          {isInputsOpen && (
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[160px] sf-tscroll">
              {availableInputs.length === 0 ? (
                <div className="text-[9px] font-mono text-[#555b66] leading-relaxed px-2.5 py-2 rounded" style={{ background: '#0d0f12', border: '1px solid #1e2128' }}>
                  Declare items you already produce or import. The planner consumes them as free sources and only builds the shortfall.
                </div>
              ) : availableInputs.map((inp, idx) => {
                const itemData = items[inp.itemId];
                return (
                  <div key={idx} className="sf-trow flex items-center gap-2 px-2.5 py-2 rounded" style={{ background: '#0d0f12', border: '1px solid #1e2128' }}>
                    <button
                      type="button"
                      onClick={() => { setEditingSupplyIndex(idx); setIsModalOpen(true); }}
                      className="flex items-center gap-2 flex-1 min-w-0 group"
                      style={{ outline: 'none' }}
                    >
                      <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: '#15171b' }}>
                        {itemData?.imageUrl && (
                          <AppImage idKey={itemData.id} fallbackUrl={itemData.imageUrl} alt={itemData.name} className="w-full h-full object-contain" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[#d4d3d0] group-hover:text-white transition-colors truncate">{itemData?.name || 'Select Item'}</span>
                      <ChevronDown size={10} className="text-[#555b66] group-hover:text-[#2dd4bf] transition-colors shrink-0 ml-auto" />
                    </button>

                    <div style={{ width: 1, height: 20, background: '#23262d', flexShrink: 0 }} />

                    <input
                      type="number" step="any" min="0.001" value={inp.rate}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        const n = [...availableInputs];
                        n[idx].rate = isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 1000) / 1000;
                        setAvailableInputs(n);
                      }}
                      className="w-16 text-right text-xs font-mono font-bold text-[#2dd4bf] bg-transparent border-none outline-none shrink-0"
                    />
                    <span className="text-[9px] text-[#555b66] font-mono shrink-0">/min</span>

                    <button
                      type="button"
                      onClick={() => setAvailableInputs(availableInputs.filter((_, i) => i !== idx))}
                      className="shrink-0 text-[#2e323b] hover:text-[#ef4444] transition-colors ml-1"
                      title="Remove"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Zone 2: Hardware Settings ── */}
        <div className="relative z-10 px-4 py-3 border-t border-[#1e2128]" style={{ background: 'rgba(0,0,0,0.15)' }}>
          {/* Hardware tier grid — Extractor & Pipe appear only when the chain uses them */}
          <div className="grid gap-2 mb-2.5" style={{ gridTemplateColumns: `repeat(${hardwareColumns}, minmax(0, 1fr))` }}>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-mono tracking-[0.2em] text-[#445060] uppercase">Miner</span>
              <CustomSelect
                value={minerId}
                onChange={(val) => updateFormState(targets, val as MachineId, beltId, recipeSelections)}
                options={availableMiners.map(m => ({ value: m.id, label: m.name }))}
              />
            </div>
            {chainUsage.usesExtractor && (
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono tracking-[0.2em] text-[#445060] uppercase">Extractor</span>
                <CustomSelect
                  value={extractorTier}
                  onChange={(val) => setExtractorTier(val)}
                  options={[
                    { value: 'mk1', label: 'Mk.1 · 100%' },
                    { value: 'mk2', label: 'Mk.2 · 200%' },
                    { value: 'mk3', label: 'Mk.3 · 250%' },
                  ]}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-mono tracking-[0.2em] text-[#445060] uppercase">Belt</span>
              <CustomSelect
                value={beltId}
                onChange={(val) => updateFormState(targets, minerId, val as BeltId, recipeSelections)}
                options={availableBelts.map(b => ({ value: b.id, label: b.name }))}
              />
            </div>
            {chainUsage.usesFluid && (
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono tracking-[0.2em] text-[#445060] uppercase">Pipe</span>
                <CustomSelect
                  value={pipeTier}
                  onChange={(val) => setPipeTier(val as 'mk1' | 'mk2')}
                  options={[
                    { value: 'mk1', label: 'Mk.1 · 300/m' },
                    { value: 'mk2', label: 'Mk.2 · 600/m' },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Alt Recipes */}
            <div className="relative z-20">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAltRecipes(!showAltRecipes)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors rounded"
                  style={{
                    background: '#0d0f12', border: '1px solid #1e2128',
                    color: altCount > 0 ? '#f48721' : '#555b66',
                  }}
                >
                  {altCount > 0 && (
                    <span style={{ background: '#f48721', color: '#000', fontSize: 8, fontWeight: 800, borderRadius: 2, padding: '0 4px' }}>{altCount}</span>
                  )}
                  <span>Alt Recipes</span>
                  {showAltRecipes ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
                {altCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRecipeSelections({}); }}
                    className="p-1 text-[#445060] hover:text-[#f48721] transition-colors"
                    title="Reset alt recipes"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>

              {showAltRecipes && (
                <div
                  className="absolute shadow-2xl z-50"
                  style={{
                    bottom: 'calc(100% + 6px)', left: 0, width: 320,
                    background: 'linear-gradient(180deg, #1a1c20 0%, #111315 100%)',
                    border: '1px solid #2a2d33',
                    clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTop: '10px solid #f48721', borderRight: '10px solid transparent' }} />
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2d33]">
                    <div style={{ width: 2, height: 10, background: '#f48721', borderRadius: 1 }} />
                    <span className="text-[9px] font-mono tracking-widest text-[#f48721] uppercase">Alternate Recipes</span>
                  </div>
                  <div className="p-3 flex flex-col gap-2.5 max-h-64 overflow-y-auto">
                    {alternateRecipeCandidates.length === 0 ? (
                      <div className="text-[10px] text-[#555b66] font-mono px-2 py-2" style={{ border: '1px solid #1e2128', background: '#0d0f11' }}>
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
                              const rName = recipe.name || formatRecipeLabel(recipe.id);
                              const machName = machines[recipe.machineId]?.name || recipe.machineId;
                              const power = machines[recipe.machineId]?.powerUsage || 0;
                              const inputsStr = recipe.inputs
                                .map((inp) => `${inp.rate}/m ${items[inp.itemId]?.name || inp.itemId}`)
                                .join(', ');
                              return {
                                value: recipe.id,
                                label: `${rName} (${recipe.outputRate}/m) - In: ${inputsStr} (${machName}, ${power} MW)`,
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

            {/* World Settings (Satisfactory 1.2 Game Modes) toggle */}
            {(() => {
              const worldActive = hasActiveWorldSettings({
                recipeCostMultiplier: costMultiplier,
                powerMultiplier,
                defaultNodePurity,
              });
              const activeSummaryParts: string[] = [];
              if (Math.abs(costMultiplier - 1) > 1e-9) activeSummaryParts.push(`${formatMultiplier(costMultiplier)}× Cost`);
              if (Math.abs(powerMultiplier - 1) > 1e-9) activeSummaryParts.push(`${formatMultiplier(powerMultiplier)}× Pwr`);
              if (defaultNodePurity !== 'normal') activeSummaryParts.push(defaultNodePurity.toUpperCase());
              return (
                <button
                  type="button"
                  onClick={() => setIsWorldSettingsOpen(v => !v)}
                  title="Satisfactory 1.2 World Settings / Game Mode Multipliers (Recipe Cost, Power Consumption, Node Purity)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all rounded shrink-0"
                  style={{
                    background: isWorldSettingsOpen || worldActive ? 'rgba(244,135,33,0.10)' : '#0d0f12',
                    border: `1px solid ${isWorldSettingsOpen || worldActive ? '#f4872150' : '#1e2128'}`,
                    color: isWorldSettingsOpen || worldActive ? '#f48721' : '#8E9299',
                  }}
                >
                  <Globe size={10} />
                  <span>World Settings</span>
                  {activeSummaryParts.length > 0 && (
                    <span
                      style={{
                        background: '#f48721',
                        color: '#000',
                        fontSize: 8,
                        fontWeight: 800,
                        borderRadius: 2,
                        padding: '0 4px',
                      }}
                    >
                      {activeSummaryParts.join(' · ')}
                    </span>
                  )}
                  {isWorldSettingsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
              );
            })()}

            {/* Machine Tuning toggle */}
            {(() => {
              const isTuned = overclock !== 100 || somersloopMultiplier !== 1 || disableAnimations;
              return (
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all rounded shrink-0"
                  style={{
                    background: isAdvancedOpen ? 'rgba(244,135,33,0.08)' : '#0d0f12',
                    border: `1px solid ${isAdvancedOpen ? '#f4872140' : '#1e2128'}`,
                    color: isAdvancedOpen ? '#f48721' : (isTuned ? '#f4872190' : '#555b66'),
                  }}
                >
                  <Zap size={10} />
                  <span>{isTuned ? 'Tuned' : 'Tuning'}</span>
                  {isAdvancedOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
              );
            })()}

            {/* Whole Machines toggle — round machines up to whole units and sink the surplus */}
            <button
              type="button"
              onClick={() => setWholeMachineMode(v => !v)}
              title="Round every machine up to a whole unit (no fractional clocks); route the surplus to an Awesome Sink"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all rounded shrink-0"
              style={{
                background: wholeMachineMode ? 'rgba(34,197,94,0.10)' : '#0d0f12',
                border: `1px solid ${wholeMachineMode ? '#22c55e55' : '#1e2128'}`,
                color: wholeMachineMode ? '#22c55e' : '#555b66',
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                  background: wholeMachineMode ? '#22c55e' : 'transparent',
                  border: `1px solid ${wholeMachineMode ? '#22c55e' : '#3a3d44'}`,
                }}
              />
              <span>Whole Machines</span>
            </button>

            {/* Calculate */}
            <button
              type="submit"
              className="sf-primary-btn font-bold tracking-[0.15em] uppercase relative overflow-hidden shrink-0 w-full sm:w-auto sm:ml-auto"
              style={{ padding: '7px 20px', fontSize: 11 }}
            >
              <span className="sf-btn-scanner absolute inset-0 pointer-events-none z-10" />
              <span className="relative z-20">Calculate Flow</span>
            </button>
          </div>
        </div>

        {/* ── Zone 2.5: World Settings Panel (Satisfactory 1.2 Game Modes) ── */}
        {isWorldSettingsOpen && (
          <div
            className="relative z-10 flex flex-col gap-3.5 px-4 py-3 border-t border-[#1e2128]"
            style={{ background: 'linear-gradient(180deg, #101217 0%, #0b0c0f 100%)' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: '1px', background: 'linear-gradient(90deg, transparent, #f4872145, transparent)' }} />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe size={11} className="text-[#f48721]" />
                <span className="text-[9px] font-mono tracking-[0.22em] text-[#f48721] uppercase font-bold">
                  World Settings // Game Mode Multipliers (1.2)
                </span>
              </div>
              {hasActiveWorldSettings({
                recipeCostMultiplier: costMultiplier,
                powerMultiplier,
                defaultNodePurity,
              }) && (
                <button
                  type="button"
                  onClick={() => {
                    setCostMultiplier(DEFAULT_WORLD_SETTINGS.recipeCostMultiplier);
                    setPowerMultiplier(DEFAULT_WORLD_SETTINGS.powerMultiplier);
                    setDefaultNodePurity(DEFAULT_WORLD_SETTINGS.defaultNodePurity);
                  }}
                  className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[#8E9299] hover:text-[#f48721] transition-colors cursor-pointer"
                  title="Reset World Settings to 1× Vanilla defaults"
                >
                  <RotateCcw size={10} />
                  <span>Reset 1×</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <MultiplierSelector
                label="Recipe Parts Cost Multiplier"
                hint="Scales recipe inputs (solids round per cycle, min 1; fluids scale continuously; outputs stay 1×)"
                value={costMultiplier}
                presets={RECIPE_COST_PRESETS}
                onChange={setCostMultiplier}
              />

              <div className="h-px bg-[#1e2128] w-full" />

              <MultiplierSelector
                label="Power Consumption Multiplier"
                hint="Scales power draw across all production buildings and extractors"
                value={powerMultiplier}
                presets={POWER_MULTIPLIER_PRESETS}
                onChange={setPowerMultiplier}
              />

              <div className="h-px bg-[#1e2128] w-full" />

              {/* Default Resource Node Purity */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono tracking-[0.18em] text-[#8E9299] uppercase font-semibold">
                    Default Resource Node Purity
                  </span>
                  <span className="text-[9px] font-mono text-[#555b66]">
                    Baseline purity for miners when no per-node override is set
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-[#0d0f12] border border-[#23262d] rounded p-0.5">
                  {NODE_PURITY_OPTIONS.map((opt) => {
                    const isActive = defaultNodePurity === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDefaultNodePurity(opt.value)}
                        className="px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer"
                        style={{
                          background: isActive ? '#f48721' : 'transparent',
                          color: isActive ? '#000' : '#8E9299',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {Math.abs(costMultiplier - 1) > 1e-9 && (
              <div
                className="text-[9px] font-mono leading-relaxed px-2.5 py-1.5 rounded"
                style={{
                  background: 'rgba(244,135,33,0.06)',
                  border: '1px solid rgba(244,135,33,0.2)',
                  color: '#d4a373',
                }}
              >
                Satisfactory 1.2 rule: Solid inputs round per craft cycle to whole integers (min 1) while fluids scale continuously; outputs &amp; byproducts remain 1×. Click <strong>Calculate Flow</strong> to apply changes.
              </div>
            )}
          </div>
        )}

        {/* ── Zone 3: Machine Tuning Panel ── */}
        {isAdvancedOpen && (
          <div
            className="relative z-10 flex flex-col gap-3.5 px-4 py-3 border-t border-[#1e2128]"
            style={{ background: 'linear-gradient(180deg, #0e1014 0%, #0b0c0f 100%)' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: '1px', background: 'linear-gradient(90deg, transparent, #f4872130, transparent)' }} />

            {/* First Row: Overclock and Somersloop */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Overclock value */}
              <div className="flex flex-col gap-0.5 shrink-0" style={{ minWidth: 80 }}>
                <span className="text-[8px] font-mono tracking-[0.2em] text-[#445060] uppercase">Overclock</span>
                <span className="text-xl font-black font-mono leading-none" style={{ color: overclock > 100 ? '#f48721' : overclock < 100 ? '#22c55e' : '#8E9299' }}>
                  {overclock}<span className="text-[10px] text-[#445060]">%</span>
                </span>
              </div>

              {/* Slider */}
              <div className="flex items-center gap-2 flex-grow min-w-[150px]">
                <span className="text-[9px] font-mono text-[#333840]">1</span>
                <input
                  type="range" min="1" max="250" value={overclock}
                  onChange={(e) => setOverclock(Number(e.target.value))}
                  className="flex-grow cursor-pointer"
                  style={{ accentColor: '#f48721', height: 4, outline: 'none' }}
                />
                <span className="text-[9px] font-mono text-[#333840]">250</span>
              </div>

              <div style={{ width: 1, height: 28, background: '#1e2128', flexShrink: 0 }} className="hidden md:block" />

              {/* Somersloop */}
              <div className="flex flex-col gap-0.5 shrink-0" style={{ minWidth: 100 }}>
                <span className="text-[8px] font-mono tracking-[0.2em] text-[#445060] uppercase">Somersloop</span>
                <CustomSelect
                  value={String(somersloopMultiplier)}
                  onChange={(val) => setSomersloopMultiplier(Number(val))}
                  options={[
                    { value: '1', label: '1× Standard' },
                    { value: '2', label: '2× Boost' },
                  ]}
                />
              </div>

              {somersloopMultiplier > 1 && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded shrink-0 text-[9px] font-mono"
                  style={{ background: 'rgba(244,135,33,0.07)', border: '1px solid rgba(244,135,33,0.15)', color: '#f48721' }}
                >
                  <Zap size={9} /> 2× output · 4× power
                </div>
              )}
            </div>

            {/* Separator Line */}
            <div className="h-px bg-[#1e2128] w-full" />

            {/* Second Row: Edge Flow Animation Option */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setDisableAnimations(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all rounded justify-start text-left"
                style={{
                  background: disableAnimations ? 'rgba(239,68,68,0.08)' : '#0d0f12',
                  border: `1px solid ${disableAnimations ? '#ef444455' : '#1e2128'}`,
                  color: disableAnimations ? '#ef4444' : '#555b66',
                }}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                    background: disableAnimations ? '#ef4444' : 'transparent',
                    border: `1px solid ${disableAnimations ? '#ef4444' : '#3a3d44'}`,
                  }}
                />
                <span>Disable Edge Flow Animations</span>
              </button>
            </div>

          </div>
        )}
      </form>

      <ItemModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTargetIndex(null); setEditingSupplyIndex(null); }}
        onSelect={(id) => {
          if (editingSupplyIndex !== null) {
            const n = [...availableInputs];
            n[editingSupplyIndex].itemId = id;
            setAvailableInputs(n);
          } else if (editingTargetIndex !== null) {
            const newTargets = [...targets];
            newTargets[editingTargetIndex].itemId = id;
            if (newTargets[editingTargetIndex].mode === 'machine') {
              const ar = recipes.filter(r => r.outputItemId === id);
              newTargets[editingTargetIndex].recipeId = ar[0]?.id || '';
            }
            updateFormState(newTargets, minerId, beltId, recipeSelections);
          }
        }}
      />
    </div>
  );
}
