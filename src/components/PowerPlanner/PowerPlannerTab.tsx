import React, { useMemo, useState } from 'react';
import type { ParsedSave } from '../../types/save';
import type {
  PowerFuelType,
  PowerOptimizeGoal,
  PowerPlannerInput,
  PowerUnit,
  SimulationSpikeEvent,
} from '../../types/power';
import { planPower } from '../../engine/power/planner/powerPlanner';
import { optimizeFuelStrategies } from '../../engine/power/optimization/fuelOptimizer';
import { simulatePowerGrid } from '../../engine/power/simulation/powerSimulation';
import { planNuclearPower } from '../../engine/power/nuclear/nuclearPlanner';
import { analyzeSavePowerGrid } from '../../engine/power/analyzer/savePowerAnalyzer';
import { TreeList } from '../TreeList';
import { FactoryGraph } from '../Graph/FactoryGraph';
import { items } from '../../engine/data';
import { mapPowerPlanToGraph } from '../../engine/power/planner/powerGraphMapper';

type PowerSubTab = 'planner' | 'optimizer' | 'simulation' | 'nuclear' | 'save_analyzer';

interface PowerPlannerTabProps {
  parsedSave: ParsedSave | null;
}

const FUEL_TYPES: { value: PowerFuelType; label: string }[] = [
  { value: 'biomass', label: 'Biomass' },
  { value: 'coal', label: 'Coal' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'turbofuel', label: 'Turbofuel' },
  { value: 'rocket_fuel', label: 'Rocket Fuel' },
  { value: 'nuclear', label: 'Nuclear' },
  { value: 'geothermal', label: 'Geothermal' },
];

const OPTIMIZE_GOALS: { value: PowerOptimizeGoal; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'lowest_oil', label: 'Lowest Oil Usage' },
  { value: 'lowest_sulfur', label: 'Lowest Sulfur Usage' },
  { value: 'highest_density', label: 'Highest Power Density' },
  { value: 'lowest_startup_power', label: 'Lowest Startup Load' },
];

const SIMULATION_SPIKES: SimulationSpikeEvent[] = [
  { startMinute: 4, durationMinutes: 2, deltaMW: 1800, label: 'Train Surge' },
  { startMinute: 10, durationMinutes: 3, deltaMW: 3200, label: 'Refinery Startup' },
  { startMinute: 18, durationMinutes: 2, deltaMW: 4500, label: 'Particle Burst' },
];

function formatPower(mw: number): string {
  if (mw >= 1000000) return `${(mw / 1000000).toFixed(2)} TW`;
  if (mw >= 1000) return `${(mw / 1000).toFixed(2)} GW`;
  return `${mw.toFixed(1)} MW`;
}

function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}h ${m}m`;
}

function parseNumber(value: string, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function PowerPlannerTab({ parsedSave }: PowerPlannerTabProps) {
  const [activeTab, setActiveTab] = useState<PowerSubTab>('planner');
  const [plannerView, setPlannerView] = useState<'graph' | 'tree'>('graph');
  const [optimizeFor, setOptimizeFor] = useState<PowerOptimizeGoal>('lowest_oil');
  const [input, setInput] = useState<PowerPlannerInput>({
    targetPower: 120,
    unit: 'GW',
    fuelType: 'turbofuel',
    reservePercent: 30,
    allowOverclock: true,
    generatorClockSpeed: 1,
    allowAlternateRecipes: true,
    preferredComplexity: 'balanced',
    minerId: 'miner_mk3',
  });

  const plan = useMemo(() => planPower(input), [input]);
  const powerGraph = useMemo(() => mapPowerPlanToGraph(plan), [plan]);
  const optimizer = useMemo(() => optimizeFuelStrategies(input, optimizeFor), [input, optimizeFor]);
  const saveAnalysis = useMemo(() => (parsedSave ? analyzeSavePowerGrid(parsedSave) : null), [parsedSave]);
  const nuclearPlan = useMemo(() => planNuclearPower({
    targetPower: input.targetPower,
    unit: input.unit,
    reservePercent: input.reservePercent,
    allowAlternateRecipes: input.allowAlternateRecipes,
    generatorClockSpeed: input.generatorClockSpeed,
    currentWasteContainers: 120,
  }), [input]);

  const [simulationDuration, setSimulationDuration] = useState(30);
  const [simulationBaselineMW, setSimulationBaselineMW] = useState(98000);
  const [batteryCount, setBatteryCount] = useState(12);
  const [batteryStoredMWh, setBatteryStoredMWh] = useState(2400);
  const [batteryOutputMWPerUnit, setBatteryOutputMWPerUnit] = useState(100);
  const [fuelStarvationAtMinute, setFuelStarvationAtMinute] = useState<number | ''>('');

  const simulation = useMemo(() => {
    const starvation = fuelStarvationAtMinute === '' ? undefined : fuelStarvationAtMinute;
    return simulatePowerGrid({
      durationMinutes: simulationDuration,
      baselineConsumptionMW: simulationBaselineMW,
      plannedProductionMW: plan.plannedPowerMW,
      batteryCount,
      batteryStoredMWh,
      batteryMaxOutputMW: batteryOutputMWPerUnit,
      spikes: SIMULATION_SPIKES,
      fuelStarvationAtMinute: starvation,
    });
  }, [
    batteryCount,
    batteryOutputMWPerUnit,
    batteryStoredMWh,
    fuelStarvationAtMinute,
    plan.plannedPowerMW,
    simulationBaselineMW,
    simulationDuration,
  ]);

  return (
    <div className="tab-content p-4 gap-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'planner', label: 'Planner' },
          { id: 'optimizer', label: 'Optimizer' },
          { id: 'simulation', label: 'Simulation' },
          { id: 'nuclear', label: 'Nuclear' },
          { id: 'save_analyzer', label: 'Save Analyzer' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PowerSubTab)}
            className={`sf-secondary-btn px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${
              activeTab === tab.id ? 'ring-1 ring-[#f48721] text-white' : ''
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 bg-[#101216] border border-[#22252c] rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-black tracking-wider uppercase text-[#f48721]">Power Inputs</h3>

          <label className="text-xs text-[#8E9299] font-bold uppercase">
            Target Power
            <input
              type="number"
              min={1}
              step={1}
              value={input.targetPower}
              onChange={(e) => setInput((prev) => ({ ...prev, targetPower: parseNumber(e.target.value, prev.targetPower) }))}
              className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="text-xs text-[#8E9299] font-bold uppercase">
            Unit
            <select
              value={input.unit}
              onChange={(e) => setInput((prev) => ({ ...prev, unit: e.target.value as PowerUnit }))}
              className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-sm text-white"
            >
              <option value="MW">MW</option>
              <option value="GW">GW</option>
              <option value="TW">TW</option>
            </select>
          </label>

          <label className="text-xs text-[#8E9299] font-bold uppercase">
            Fuel Type
            <select
              value={input.fuelType}
              onChange={(e) => setInput((prev) => ({ ...prev, fuelType: e.target.value as PowerFuelType }))}
              className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-sm text-white"
            >
              {FUEL_TYPES.map((fuel) => (
                <option key={fuel.value} value={fuel.value}>{fuel.label}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-[#8E9299] font-bold uppercase">
            Reserve Percent
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={input.reservePercent}
              onChange={(e) => setInput((prev) => ({ ...prev, reservePercent: parseNumber(e.target.value, prev.reservePercent) }))}
              className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-[#c4c7cd] font-bold uppercase">
            <input
              type="checkbox"
              checked={input.allowOverclock}
              onChange={(e) => setInput((prev) => ({ ...prev, allowOverclock: e.target.checked }))}
            />
            Allow Overclock
          </label>

          <label className="text-xs text-[#8E9299] font-bold uppercase">
            Generator Clock
            <input
              type="number"
              min={1}
              max={2.5}
              step={0.1}
              value={input.generatorClockSpeed}
              onChange={(e) => setInput((prev) => ({ ...prev, generatorClockSpeed: parseNumber(e.target.value, prev.generatorClockSpeed) }))}
              className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-[#c4c7cd] font-bold uppercase">
            <input
              type="checkbox"
              checked={input.allowAlternateRecipes}
              onChange={(e) => setInput((prev) => ({ ...prev, allowAlternateRecipes: e.target.checked }))}
            />
            Alternate Recipes
          </label>

          <label className="text-xs text-[#8E9299] font-bold uppercase">
            Preferred Complexity
            <select
              value={input.preferredComplexity}
              onChange={(e) => setInput((prev) => ({ ...prev, preferredComplexity: e.target.value as PowerPlannerInput['preferredComplexity'] }))}
              className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-sm text-white"
            >
              <option value="low">Low</option>
              <option value="balanced">Balanced</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="xl:col-span-2 bg-[#101216] border border-[#22252c] rounded-xl p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
              <div className="text-[10px] uppercase text-[#8E9299] font-bold">Planned Output</div>
              <div className="text-xl font-black text-white">{formatPower(plan.plannedPowerMW)}</div>
            </div>
            <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
              <div className="text-[10px] uppercase text-[#8E9299] font-bold">Reserve</div>
              <div className="text-xl font-black text-[#f48721]">{formatPower(plan.reserveMW)}</div>
            </div>
            <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
              <div className="text-[10px] uppercase text-[#8E9299] font-bold">Efficiency</div>
              <div className="text-xl font-black text-[#6ee7b7]">{plan.efficiencyPercent.toFixed(1)}%</div>
            </div>
          </div>

          {activeTab === 'planner' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlannerView('graph')}
                  className={`sf-secondary-btn px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    plannerView === 'graph' ? 'ring-1 ring-[#f48721] text-white' : ''
                  }`}
                >
                  Graph View
                </button>
                <button
                  onClick={() => setPlannerView('tree')}
                  className={`sf-secondary-btn px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    plannerView === 'tree' ? 'ring-1 ring-[#f48721] text-white' : ''
                  }`}
                >
                  Tree View
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299] font-bold mb-2">Generator Breakdown</div>
                  <div className="text-sm text-white font-bold mb-1">
                    {plan.generatorMachineName}: {plan.generatorCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#a0a4ab]">
                    Per generator: {plan.perGeneratorPowerMW.toFixed(1)} MW
                  </div>
                  {plan.fuelItemId && (
                    <div className="text-xs text-[#a0a4ab] mt-1">
                      Fuel: {(items[plan.fuelItemId]?.name || plan.fuelItemId)} {plan.fuelRatePerMin.toFixed(1)}/min
                    </div>
                  )}
                  <div className="text-xs text-[#a0a4ab] mt-1">
                    Water: {plan.waterRatePerMin.toFixed(1)} m3/min
                  </div>
                  <div className="text-xs text-[#a0a4ab] mt-1">
                    Startup Power: {plan.startupPowerMW.toFixed(1)} MW
                  </div>
                </div>

                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299] font-bold mb-2">Machine Counts</div>
                  <div className="max-h-44 overflow-y-auto text-xs text-[#d0d3d8] space-y-1">
                    {plan.buildingCounts.map((entry) => (
                      <div key={entry.id} className="flex justify-between gap-2">
                        <span>{entry.name}</span>
                        <span className="font-mono">{entry.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                <div className="text-[10px] uppercase text-[#8E9299] font-bold mb-2">Raw Resource Inputs (/min)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-[#d0d3d8]">
                  {Object.entries(plan.rawResourceInputs).map(([itemId, rate]) => (
                    <div key={itemId} className="flex justify-between gap-2">
                      <span>{items[itemId]?.name || itemId}</span>
                      <span className="font-mono">{rate.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {plan.warnings.length > 0 && (
                <div className="bg-[#2b180e] border border-[#f48721]/40 rounded p-3 text-xs text-[#ffd8b5]">
                  {plan.warnings.map((warning) => (
                    <div key={warning}>- {warning}</div>
                  ))}
                </div>
              )}

              {plannerView === 'graph' ? (
                <div className="border border-[#242832] rounded overflow-hidden h-[620px] bg-[#0b0c0e]">
                  <FactoryGraph
                    initialNodes={powerGraph.nodes}
                    initialEdges={powerGraph.edges}
                    beltId="mk5"
                  />
                </div>
              ) : (
                plan.fuelChainRoot && plan.fuelChainSummary && (
                  <div className="border border-[#242832] rounded overflow-hidden">
                    <TreeList rootNode={plan.fuelChainRoot} summary={plan.fuelChainSummary} />
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === 'optimizer' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs uppercase font-bold text-[#8E9299]">Optimize For</label>
                <select
                  value={optimizeFor}
                  onChange={(e) => setOptimizeFor(e.target.value as PowerOptimizeGoal)}
                  className="bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-xs text-white"
                >
                  {OPTIMIZE_GOALS.map((goal) => (
                    <option key={goal.value} value={goal.value}>{goal.label}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-[#d0d3d8]">{optimizer.recommendation}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-[#8E9299] uppercase border-b border-[#2a2d33]">
                      <th className="py-2">Fuel</th>
                      <th className="py-2">Power</th>
                      <th className="py-2">Oil/min</th>
                      <th className="py-2">Sulfur/min</th>
                      <th className="py-2">Machines</th>
                      <th className="py-2">Startup MW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimizer.strategies.map((strategy) => {
                      const isBest = optimizer.best?.fuelType === strategy.fuelType;
                      return (
                        <tr key={strategy.fuelType} className={`border-b border-[#1d2129] ${isBest ? 'bg-[#f48721]/10' : ''}`}>
                          <td className="py-2 font-bold text-white">{strategy.fuelType}</td>
                          <td className="py-2">{formatPower(strategy.plannedPowerMW)}</td>
                          <td className="py-2">{strategy.oilPerMin.toFixed(1)}</td>
                          <td className="py-2">{strategy.sulfurPerMin.toFixed(1)}</td>
                          <td className="py-2">{strategy.machineCount.toLocaleString()}</td>
                          <td className="py-2">{strategy.startupPowerMW.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'simulation' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="text-xs text-[#8E9299] font-bold uppercase">
                  Duration (min)
                  <input
                    type="number"
                    min={1}
                    value={simulationDuration}
                    onChange={(e) => setSimulationDuration(parseNumber(e.target.value, simulationDuration))}
                    className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-xs text-white"
                  />
                </label>
                <label className="text-xs text-[#8E9299] font-bold uppercase">
                  Baseline Load (MW)
                  <input
                    type="number"
                    min={0}
                    value={simulationBaselineMW}
                    onChange={(e) => setSimulationBaselineMW(parseNumber(e.target.value, simulationBaselineMW))}
                    className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-xs text-white"
                  />
                </label>
                <label className="text-xs text-[#8E9299] font-bold uppercase">
                  Fuel Starvation Minute
                  <input
                    type="number"
                    min={0}
                    value={fuelStarvationAtMinute}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFuelStarvationAtMinute(value === '' ? '' : parseNumber(value, 0));
                    }}
                    className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-xs text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="text-xs text-[#8E9299] font-bold uppercase">
                  Battery Count
                  <input
                    type="number"
                    min={0}
                    value={batteryCount}
                    onChange={(e) => setBatteryCount(parseNumber(e.target.value, batteryCount))}
                    className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-xs text-white"
                  />
                </label>
                <label className="text-xs text-[#8E9299] font-bold uppercase">
                  Battery Stored (MWh)
                  <input
                    type="number"
                    min={0}
                    value={batteryStoredMWh}
                    onChange={(e) => setBatteryStoredMWh(parseNumber(e.target.value, batteryStoredMWh))}
                    className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-xs text-white"
                  />
                </label>
                <label className="text-xs text-[#8E9299] font-bold uppercase">
                  Battery Output / Unit (MW)
                  <input
                    type="number"
                    min={0}
                    value={batteryOutputMWPerUnit}
                    onChange={(e) => setBatteryOutputMWPerUnit(parseNumber(e.target.value, batteryOutputMWPerUnit))}
                    className="mt-1 w-full bg-[#0b0c0e] border border-[#2a2d33] rounded px-3 py-2 text-xs text-white"
                  />
                </label>
              </div>

              <div className="text-xs text-[#8E9299]">
                Spike Events: {SIMULATION_SPIKES.map((spike) => `${spike.label} (+${spike.deltaMW}MW @${spike.startMinute}m)`).join(', ')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299]">Minimum Reserve</div>
                  <div className="text-lg font-black text-white">{simulation.minimumReserveMW.toFixed(1)} MW</div>
                </div>
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299]">Blackout</div>
                  <div className={`text-lg font-black ${simulation.blackoutMinute === null ? 'text-[#6ee7b7]' : 'text-[#ef4444]'}`}>
                    {simulation.blackoutMinute === null ? 'No' : `Minute ${simulation.blackoutMinute}`}
                  </div>
                </div>
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299]">Survived</div>
                  <div className="text-lg font-black text-white">{simulation.survivedDurationMinutes} min</div>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto border border-[#242832] rounded">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#8E9299] uppercase border-b border-[#242832]">
                      <th className="py-2">Min</th>
                      <th className="py-2">Prod</th>
                      <th className="py-2">Use</th>
                      <th className="py-2">Reserve</th>
                      <th className="py-2">Battery Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.timeline.map((point) => (
                      <tr key={point.minute} className={`border-b border-[#1d2129] ${point.blackout ? 'bg-[#3a1317]' : ''}`}>
                        <td className="py-1 text-center">{point.minute}</td>
                        <td className="py-1 text-center">{Math.round(point.productionMW)}</td>
                        <td className="py-1 text-center">{Math.round(point.consumptionMW)}</td>
                        <td className={`py-1 text-center ${point.reserveMW < 0 ? 'text-[#ef4444]' : 'text-[#6ee7b7]'}`}>
                          {Math.round(point.reserveMW)}
                        </td>
                        <td className="py-1 text-center">{Math.round(point.batteryOutputMW)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'nuclear' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299]">Nuclear Output</div>
                  <div className="text-xl font-black text-white">{formatPower(nuclearPlan.plan.plannedPowerMW)}</div>
                </div>
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299]">Plants</div>
                  <div className="text-xl font-black text-white">{nuclearPlan.plan.generatorCount.toLocaleString()}</div>
                </div>
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299]">Uranium Waste</div>
                  <div className="text-xl font-black text-[#f48721]">{nuclearPlan.uraniumWastePerMin.toFixed(1)}/min</div>
                </div>
                <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                  <div className="text-[10px] uppercase text-[#8E9299]">Storage Demand</div>
                  <div className="text-xl font-black text-white">{nuclearPlan.industrialContainersPerHour.toFixed(2)} ISC/hour</div>
                </div>
              </div>

              <div className="bg-[#0c0d10] border border-[#242832] rounded p-3 text-sm text-[#d0d3d8]">
                Current storage fill estimate (120 industrial containers):{' '}
                <span className="font-black text-white">
                  {nuclearPlan.timeToFillCurrentStorageMinutes === null
                    ? '-'
                    : formatMinutes(nuclearPlan.timeToFillCurrentStorageMinutes)}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'save_analyzer' && (
            <div className="flex flex-col gap-4">
              {!saveAnalysis ? (
                <div className="text-sm text-[#8E9299]">
                  No parsed save loaded. Upload a save in `Save Game Map` or `Diagnostics` to run real grid analysis.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                      <div className="text-[10px] uppercase text-[#8E9299]">Production</div>
                      <div className="text-lg font-black text-white">{formatPower(saveAnalysis.productionMW)}</div>
                    </div>
                    <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                      <div className="text-[10px] uppercase text-[#8E9299]">Consumption</div>
                      <div className="text-lg font-black text-white">{formatPower(saveAnalysis.consumptionMW)}</div>
                    </div>
                    <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                      <div className="text-[10px] uppercase text-[#8E9299]">Reserve</div>
                      <div className={`text-lg font-black ${saveAnalysis.reserveMW < 0 ? 'text-[#ef4444]' : 'text-[#6ee7b7]'}`}>
                        {formatPower(saveAnalysis.reserveMW)}
                      </div>
                    </div>
                    <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                      <div className="text-[10px] uppercase text-[#8E9299]">Health Score</div>
                      <div className="text-lg font-black text-[#f48721]">{saveAnalysis.healthScore}/100</div>
                    </div>
                  </div>

                  <div className="bg-[#0c0d10] border border-[#242832] rounded p-3 text-sm text-[#d0d3d8]">
                    Grid stability: <span className="font-black text-white">{saveAnalysis.gridStability}%</span>
                  </div>

                  <div className="bg-[#0c0d10] border border-[#242832] rounded p-3">
                    <div className="text-[10px] uppercase text-[#8E9299] mb-2 font-bold">Recommendations</div>
                    <div className="space-y-2">
                      {saveAnalysis.recommendations.map((recommendation) => (
                        <div key={recommendation.id} className="text-sm text-[#d0d3d8]">
                          <span className={`uppercase text-[10px] font-black mr-2 ${
                            recommendation.priority === 'critical'
                              ? 'text-[#ef4444]'
                              : recommendation.priority === 'warning'
                                ? 'text-[#f59e0b]'
                                : 'text-[#60a5fa]'
                          }`}>
                            {recommendation.priority}
                          </span>
                          {recommendation.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
