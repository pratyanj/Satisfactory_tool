/**
 * FICSIT Sandbox — Machine Inspector Panel
 *
 * Shown in the right column when a machine is selected.
 * Provides custom interfaces for production machines (recipe, overclock),
 * power switches (ON/OFF breaker toggle), biomass burners (fuel selection),
 * and general generators (capacity scaling details).
 */

import React, { useCallback, useMemo } from 'react';
import { recipes, machines, items } from '../../engine/data';
import { getRecipesForMachine, computeMachineThroughput } from '../../engine/sandbox/simulation';
import {
  getMachineEntry,
  getMachineName,
  getMachinePowerProduction,
  getMachinePowerUsage,
  BIOMASS_FUELS,
} from '../../engine/sandbox/machineRegistry';
import type { SandboxMachine, SandboxAction, FactoryStats } from '../../engine/sandbox/types';

interface MachineInspectorProps {
  machine: SandboxMachine;
  dispatch: React.Dispatch<SandboxAction>;
  stats: FactoryStats;
}

export function MachineInspector({ machine, dispatch, stats }: MachineInspectorProps) {
  const entry       = getMachineEntry(machine.machineId);
  const accent      = entry?.accentColor ?? '#f48721';

  const handleOverclockChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: 'SET_OVERCLOCK', instanceId: machine.instanceId, overclock: Number(e.target.value) });
    },
    [dispatch, machine.instanceId]
  );

  const handleDelete = useCallback(() => {
    dispatch({ type: 'DELETE_MACHINE', instanceId: machine.instanceId });
  }, [dispatch, machine.instanceId]);

  const handleRotate = useCallback(() => {
    dispatch({ type: 'ROTATE_MACHINE', instanceId: machine.instanceId });
  }, [dispatch, machine.instanceId]);

  // ── Switch Toggling ────────────────────────────────────────────────────────
  const handleSwitchToggle = useCallback(() => {
    dispatch({ type: 'TOGGLE_SWITCH', instanceId: machine.instanceId });
  }, [dispatch, machine.instanceId]);

  // ── Fuel Changing (Biomass Burner) ─────────────────────────────────────────
  const handleFuelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch({ type: 'SET_FUEL', instanceId: machine.instanceId, fuelId: e.target.value });
    },
    [dispatch, machine.instanceId]
  );

  // ── Recipe Changing (Production) ───────────────────────────────────────────
  const handleRecipeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch({ type: 'SET_RECIPE', instanceId: machine.instanceId, recipeId: e.target.value });
    },
    [dispatch, machine.instanceId]
  );

  const isSwitch = machine.machineId === 'power_switch';
  const isBiomass = machine.machineId === 'biomass_burner';
  const isGenerator = entry?.category === 'power' && machine.machineId !== 'power_switch';

  // Overclock values
  const clockPct = machine.overclock ?? 100;

  // ─── Case 1: Power Switch Panel ─────────────────────────────────────────────
  if (isSwitch) {
    const isClosed = machine.switchOn !== false;
    const switchAccent = isClosed ? '#10b981' : '#ef4444';

    return (
      <div className="machine-inspector">
        {/* Header */}
        <div className="inspector-header" style={{ borderColor: switchAccent + '44' }}>
          <div className="inspector-machine-icon" style={{ background: switchAccent + '18', borderColor: switchAccent + '44' }}>
            <span style={{ color: switchAccent, fontSize: 20 }}>⚡</span>
          </div>
          <div className="inspector-machine-title">
            <div className="inspector-machine-name">Power Switch</div>
            <div className="inspector-machine-sub" style={{ color: switchAccent }}>
              1×1 foundation · Grid Isolator
            </div>
          </div>
          <div className="inspector-actions">
            <button className="inspector-icon-btn" onClick={handleRotate} title="Rotate 90°">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
              </svg>
            </button>
            <button className="inspector-icon-btn inspector-delete-btn" onClick={handleDelete} title="Delete switch">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Switch Breaker Control */}
        <div className="inspector-section flex-col items-center">
          <label className="inspector-label">CIRCUIT BREAKER CONTROL</label>
          <button
            className={`power-switch-toggle-btn ${isClosed ? 'is-on' : 'is-off'}`}
            onClick={handleSwitchToggle}
            style={{ '--switch-color': switchAccent } as React.CSSProperties}
          >
            <div className="toggle-switch-handle" />
            <span className="toggle-switch-text">
              {isClosed ? 'BREAKER CLOSED (ON)' : 'BREAKER OPEN (OFF)'}
            </span>
          </button>
          <p className="switch-help-text">
            {isClosed 
              ? 'Grids are bridged. Power flows through this switch.' 
              : 'Grids are isolated. The power flow is cut.'}
          </p>
        </div>

        {/* Position info */}
        <div className="inspector-section inspector-position">
          <div className="inspector-label">POSITION</div>
          <div className="inspector-pos-val">
            ({machine.position.col}, {machine.position.row}) · {machine.rotation}°
          </div>
        </div>
      </div>
    );
  }

  // ─── Case 2: Biomass Burner / Generator Panel ──────────────────────────────
  if (isGenerator) {
    const nominalProd = getMachinePowerProduction(machine.machineId, machine.fuelId);
    const actualProd  = nominalProd * (clockPct / 100);

    let generatorDetails = "";
    if (machine.machineId === 'coal_generator') generatorDetails = "Requires Coal & Water. High carbon footprint.";
    else if (machine.machineId === 'fuel_generator') generatorDetails = "Requires Liquid Fuel. Highly scalable.";
    else if (machine.machineId === 'nuclear_power_plant') generatorDetails = "Requires Uranium Rods & Water. Produces toxic Nuclear Waste.";
    else if (isBiomass) generatorDetails = "Requires Biomass Fuel. Hand-fed or automated in 1.0.";

    return (
      <div className="machine-inspector">
        {/* Header */}
        <div className="inspector-header" style={{ borderColor: accent + '44' }}>
          <div className="inspector-machine-icon" style={{ background: accent + '18', borderColor: accent + '44' }}>
            <span style={{ color: accent, fontSize: 20 }}>⚡</span>
          </div>
          <div className="inspector-machine-title">
            <div className="inspector-machine-name">{getMachineName(machine.machineId)}</div>
            <div className="inspector-machine-sub" style={{ color: accent }}>
              {entry?.footprint.width}×{entry?.footprint.height} foundations · Generator
            </div>
          </div>
          <div className="inspector-actions">
            <button className="inspector-icon-btn" onClick={handleRotate} title="Rotate 90°">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
              </svg>
            </button>
            <button className="inspector-icon-btn inspector-delete-btn" onClick={handleDelete} title="Delete generator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Biomass Fuel Selection */}
        {isBiomass && (
          <div className="inspector-section">
            <label className="inspector-label" htmlFor={`fuel-select-${machine.instanceId}`}>
              BIOMASS FUEL TYPE
            </label>
            <select
              id={`fuel-select-${machine.instanceId}`}
              className="inspector-select"
              value={machine.fuelId ?? 'solid_biofuel'}
              onChange={handleFuelChange}
            >
              {BIOMASS_FUELS.map((f) => (
                <option key={f.fuelId} value={f.fuelId}>
                  {f.name} ({f.powerProduction} MW)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Overclock Slider */}
        <div className="inspector-section">
          <div className="inspector-label-row">
            <label className="inspector-label" htmlFor={`overclock-${machine.instanceId}`}>
              GENERATOR CLOCK SPEED
            </label>
            <span className="inspector-value" style={{ color: clockPct > 100 ? '#fbbf24' : '#22c55e' }}>
              {clockPct}%
            </span>
          </div>
          <input
            id={`overclock-${machine.instanceId}`}
            type="range"
            min={1}
            max={250}
            step={1}
            value={clockPct}
            onChange={handleOverclockChange}
            className="inspector-slider"
            aria-label={`Generator clock: ${clockPct}%`}
            style={{ '--accent': accent } as React.CSSProperties}
          />
          <div className="inspector-slider-ticks">
            <span>1%</span><span>100%</span><span>250%</span>
          </div>
        </div>

        {/* Power Capacity Display */}
        <div className="inspector-section inspector-power info-panel">
          <div className="inspector-label">POWER OUTPUT</div>
          <div className="inspector-power-row">
            <span className="inspector-power-val text-power">{actualProd.toFixed(1)}</span>
            <span className="inspector-power-unit text-power">MW</span>
            {clockPct !== 100 && (
              <span className="inspector-power-base">(base: {nominalProd} MW)</span>
            )}
          </div>
          <p className="switch-help-text" style={{ marginTop: 8 }}>
            {generatorDetails}
          </p>
        </div>

        {/* Position info */}
        <div className="inspector-section inspector-position">
          <div className="inspector-label">POSITION</div>
          <div className="inspector-pos-val">
            ({machine.position.col}, {machine.position.row}) · {machine.rotation}°
          </div>
        </div>
      </div>
    );
  }

  // ─── Case 3: Production/Extraction Machine Panel ────────────────────────────
  const machineData = machines[machine.machineId];
  const availableRecipes = useMemo(() => getRecipesForMachine(machine.machineId), [machine.machineId]);
  const throughput  = computeMachineThroughput(machine);
  const selectedRecipe = recipes.find((r) => r.id === machine.recipeId);

  // Power display
  const basePower = machineData?.powerUsage ?? 0;
  const clockedPower = throughput?.powerMW ?? basePower;

  return (
    <div className="machine-inspector">
      {/* Header */}
      <div className="inspector-header" style={{ borderColor: accent + '44' }}>
        <div className="inspector-machine-icon" style={{ background: accent + '18', borderColor: accent + '44' }}>
          <span style={{ color: accent, fontSize: 20 }}>⚙</span>
        </div>
        <div className="inspector-machine-title">
          <div className="inspector-machine-name">{machineData?.name ?? machine.machineId}</div>
          <div className="inspector-machine-sub" style={{ color: accent }}>
            {entry?.footprint.width}×{entry?.footprint.height} foundations
          </div>
        </div>
        <div className="inspector-actions">
          <button
            className="inspector-icon-btn"
            onClick={handleRotate}
            title="Rotate 90°"
            aria-label="Rotate machine"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
            </svg>
          </button>
          <button
            className="inspector-icon-btn inspector-delete-btn"
            onClick={handleDelete}
            title="Delete machine"
            aria-label="Delete machine"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recipe Selector */}
      <div className="inspector-section">
        <label className="inspector-label" htmlFor={`recipe-select-${machine.instanceId}`}>
          RECIPE
        </label>
        {availableRecipes.length === 0 ? (
          <p className="inspector-empty">No recipes available for this machine.</p>
        ) : (
          <select
            id={`recipe-select-${machine.instanceId}`}
            className="inspector-select"
            value={machine.recipeId ?? ''}
            onChange={handleRecipeChange}
          >
            <option value="">— Select a recipe —</option>
            {availableRecipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name ?? items[r.outputItemId]?.name ?? r.id}
                {r.isAlternate ? ' [ALT]' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Overclock Slider */}
      <div className="inspector-section">
        <div className="inspector-label-row">
          <label className="inspector-label" htmlFor={`overclock-${machine.instanceId}`}>
            OVERCLOCK
          </label>
          <span className="inspector-value" style={{ color: machine.overclock > 100 ? '#f59e0b' : '#22c55e' }}>
            {machine.overclock}%
          </span>
        </div>
        <input
          id={`overclock-${machine.instanceId}`}
          type="range"
          min={1}
          max={250}
          step={1}
          value={machine.overclock}
          onChange={handleOverclockChange}
          className="inspector-slider"
          aria-label={`Overclock: ${machine.overclock}%`}
          style={{ '--accent': accent } as React.CSSProperties}
        />
        <div className="inspector-slider-ticks">
          <span>1%</span><span>100%</span><span>250%</span>
        </div>
      </div>

      {/* Throughput Display */}
      {throughput && selectedRecipe ? (
        <div className="inspector-section">
          <div className="inspector-label">THROUGHPUT</div>
          <div className="inspector-rates">
            {/* Inputs */}
            {selectedRecipe.inputs.map((input) => (
              <div key={input.itemId} className="inspector-rate-row inspector-rate-input">
                <div className="inspector-rate-icon inspector-rate-in">▼</div>
                <span className="inspector-rate-item">{items[input.itemId]?.name ?? input.itemId}</span>
                <span className="inspector-rate-val">{(throughput.inputRates[input.itemId] ?? 0).toFixed(1)}<span className="inspector-rate-unit">/min</span></span>
              </div>
            ))}
            {/* Output */}
            <div className="inspector-rate-row inspector-rate-output">
              <div className="inspector-rate-icon inspector-rate-out" style={{ color: accent }}>▲</div>
              <span className="inspector-rate-item">{items[selectedRecipe.outputItemId]?.name ?? selectedRecipe.outputItemId}</span>
              <span className="inspector-rate-val" style={{ color: accent }}>{throughput.outputRate.toFixed(1)}<span className="inspector-rate-unit">/min</span></span>
            </div>
            {/* Byproducts */}
            {selectedRecipe.byproducts?.map((bp) => (
              <div key={bp.itemId} className="inspector-rate-row inspector-rate-byproduct">
                <div className="inspector-rate-icon" style={{ color: '#a78bfa' }}>◆</div>
                <span className="inspector-rate-item">{items[bp.itemId]?.name ?? bp.itemId}</span>
                <span className="inspector-rate-val" style={{ color: '#a78bfa' }}>{(bp.rate * machine.overclock / 100).toFixed(1)}<span className="inspector-rate-unit">/min</span></span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="inspector-empty-state">
          <span>⚡ Select a recipe to see throughput</span>
        </div>
      )}

      {/* Power Display */}
      <div className="inspector-section inspector-power">
        <div className="inspector-label">POWER</div>
        <div className="inspector-power-row">
          <span className="inspector-power-val">{clockedPower.toFixed(1)}</span>
          <span className="inspector-power-unit">MW</span>
          {machine.overclock !== 100 && (
            <span className="inspector-power-base">(base: {basePower}MW)</span>
          )}
        </div>
      </div>

      {/* Position info */}
      <div className="inspector-section inspector-position">
        <div className="inspector-label">POSITION</div>
        <div className="inspector-pos-val">
          ({machine.position.col}, {machine.position.row}) · {machine.rotation}°
        </div>
      </div>
    </div>
  );
}
