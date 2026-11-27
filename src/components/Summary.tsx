import React from 'react';
import { Boxes, Cpu, Zap } from 'lucide-react';
import { SummaryData } from '../engine/solver';
import { isFluidItem, items, machines } from '../engine/data';
import { formatMultiplier, hasActiveWorldSettings, type WorldSettings } from '../engine/worldSettings';
import { AppImage } from './AppImage';

interface SummaryProps {
  summary: SummaryData;
  worldSettings?: Partial<WorldSettings>;
}

function formatPowerCompact(mw: number): { main: string; unit: string; sub?: string } {
  const ceilMW = Math.ceil(mw);
  if (ceilMW >= 1000) {
    return {
      main: ceilMW.toLocaleString(),
      unit: 'MW',
      sub: `${(ceilMW / 1000).toFixed(2)} GW`,
    };
  }
  return { main: ceilMW.toLocaleString(), unit: 'MW' };
}

function formatRate(rate: number, itemId: string): string {
  const unit = isFluidItem(itemId) ? 'm³/m' : '/m';
  return `${rate.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;
}

export function Summary({ summary, worldSettings }: SummaryProps) {
  const activeWorld = worldSettings ? hasActiveWorldSettings(worldSettings) : false;
  const worldBadges: string[] = [];
  if (worldSettings) {
    if ((worldSettings.recipeCostMultiplier ?? 1) !== 1) {
      worldBadges.push(`${formatMultiplier(worldSettings.recipeCostMultiplier!)}× Cost`);
    }
    if ((worldSettings.powerMultiplier ?? 1) !== 1) {
      worldBadges.push(`${formatMultiplier(worldSettings.powerMultiplier!)}× Power`);
    }
    if (worldSettings.defaultNodePurity && worldSettings.defaultNodePurity !== 'normal') {
      worldBadges.push(`${worldSettings.defaultNodePurity.toUpperCase()} Nodes`);
    }
  }

  const rawEntries = Object.entries(summary.rawInputs)
    .filter(([, rate]) => rate > 0.001)
    .sort(([, a], [, b]) => b - a);
  const maxRawRate = rawEntries.reduce((max, [, r]) => Math.max(max, r), 0);
  const totalRawRate = rawEntries.reduce((sum, [, r]) => sum + r, 0);

  const buildingEntries = Object.entries(summary.machineCounts)
    .filter(([, count]) => count > 0.001)
    .sort(([, a], [, b]) => b - a);
  const totalBuildings = buildingEntries.reduce((sum, [, count]) => sum + Math.ceil(count), 0);

  const overflowEntries = Object.entries(summary.overflowItems || {})
    .filter(([, rate]) => rate > 0.001)
    .sort(([, a], [, b]) => b - a);

  const power = formatPowerCompact(summary.totalPower);

  return (
    <div
      className="relative w-full h-full text-white flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a1c20 0%, #111315 100%)',
        border: '1px solid #23262d',
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.7)',
      }}
    >
      {/* Top orange accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 40,
          right: 40,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #f48721, transparent)',
          opacity: 0.7,
        }}
      />

      {/* Corner accent – top-left chamfer highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          borderTop: '12px solid #f48721',
          borderRight: '12px solid transparent',
        }}
      />

      {/* Panel header label */}
      <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-[#23262d]">
        <div
          style={{
            width: 3,
            height: 14,
            background: 'linear-gradient(180deg, #f48721, #c45700)',
            borderRadius: 2,
          }}
        />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">
          FICSIT // Production Summary
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
        {activeWorld && worldBadges.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {worldBadges.map((badge) => (
              <span
                key={badge}
                className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                style={{
                  background: 'rgba(244,135,33,0.12)',
                  border: '1px solid rgba(244,135,33,0.35)',
                  color: '#f48721',
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-3.5 flex-1 select-none min-h-0">
        {/* Top KPI Telemetry Strip */}
        <div className="grid grid-cols-3 gap-2">
          {/* Power Required */}
          <div
            className="flex flex-col justify-between px-3 py-2 rounded"
            style={{
              background: 'linear-gradient(180deg, rgba(244,135,33,0.08) 0%, #0d0f12 100%)',
              border: '1px solid rgba(244,135,33,0.25)',
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-mono tracking-[0.18em] text-[#8E9299] uppercase">Power Load</span>
              <Zap size={11} className="text-[#f48721]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1 flex-wrap">
              <span
                className="text-xl font-black text-[#f48721] font-mono leading-none"
                style={{ textShadow: '0 0 10px rgba(244,135,33,0.18)' }}
              >
                {power.main}
              </span>
              <span className="text-[9px] font-bold text-[#8E9299] font-mono uppercase">{power.unit}</span>
              {power.sub && (
                <span className="text-[9px] font-mono text-[#6b7280] ml-auto">{power.sub}</span>
              )}
            </div>
          </div>

          {/* Total Machines */}
          <div
            className="flex flex-col justify-between px-3 py-2 rounded"
            style={{ background: '#0d0f12', border: '1px solid #1e2128' }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-mono tracking-[0.18em] text-[#8E9299] uppercase">Machines</span>
              <Cpu size={11} className="text-[#00e676]" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-[#00e676] font-mono leading-none">
                {totalBuildings.toLocaleString()}
              </span>
              <span className="text-[9px] font-mono text-[#6b7280] ml-auto">
                {buildingEntries.length} {buildingEntries.length === 1 ? 'type' : 'types'}
              </span>
            </div>
          </div>

          {/* Raw Intake */}
          <div
            className="flex flex-col justify-between px-3 py-2 rounded"
            style={{ background: '#0d0f12', border: '1px solid #1e2128' }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-mono tracking-[0.18em] text-[#8E9299] uppercase">Raw Intake</span>
              <Boxes size={11} className="text-[#38bdf8]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-[#38bdf8] font-mono leading-none">
                {Math.round(totalRawRate).toLocaleString()}
              </span>
              <span className="text-[9px] font-mono text-[#8E9299]">/m</span>
              <span className="text-[9px] font-mono text-[#6b7280] ml-auto">
                {rawEntries.length} {rawEntries.length === 1 ? 'src' : 'srcs'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom 2-Column Breakdown: Raw Inputs + Buildings */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Raw Inputs */}
          <div className="md:col-span-5 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[8px] font-mono tracking-[0.22em] text-[#6b7280] uppercase font-bold">
                Raw Inputs
              </span>
              <span className="text-[8px] font-mono text-[#4b5563]">
                {rawEntries.length} {rawEntries.length === 1 ? 'resource' : 'resources'}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-1 sf-tscroll">
              {rawEntries.map(([itemId, rate]) => {
                const item = items[itemId];
                const barPct = maxRawRate > 0 ? Math.max(6, (rate / maxRawRate) * 100) : 0;
                return (
                  <div
                    key={itemId}
                    className="relative shrink-0 min-h-[34px] overflow-hidden rounded px-2.5 py-1.5 flex items-center gap-2 transition-colors hover:border-[#38bdf850]"
                    style={{ background: '#0d0f12', border: '1px solid #1e2128' }}
                  >
                    <div
                      className="w-6 h-6 rounded shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: '#15171c', border: '1px solid #23262e' }}
                    >
                      {(item?.imageUrl || itemId) && (
                        <AppImage
                          idKey={itemId}
                          fallbackUrl={item?.imageUrl}
                          alt={item?.name || itemId}
                          className="w-5 h-5 object-contain"
                        />
                      )}
                    </div>
                    <span className="font-semibold text-[11px] text-[#e4e3e0] truncate flex-1">
                      {item?.name || itemId}
                    </span>
                    <span className="font-mono text-[11px] text-[#38bdf8] font-bold shrink-0">
                      {formatRate(rate, itemId)}
                    </span>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        height: '2px',
                        width: `${barPct}%`,
                        background: 'linear-gradient(90deg, #38bdf8, #0284c7)',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                );
              })}
              {rawEntries.length === 0 && (
                <div className="text-xs font-mono text-[#6b7280] py-2">No raw inputs needed</div>
              )}
            </div>
          </div>

          {/* Buildings */}
          <div className="md:col-span-7 flex flex-col min-h-0 md:border-l md:border-[#23262d] md:pl-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[8px] font-mono tracking-[0.22em] text-[#6b7280] uppercase font-bold">
                Buildings Required
              </span>
              <span className="text-[8px] font-mono text-[#4b5563]">
                {totalBuildings.toLocaleString()} total
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[190px] overflow-y-auto pr-1 sf-tscroll content-start">
              {buildingEntries.map(([machineId, count]) => {
                const machine = machines[machineId];
                const displayCount = isFinite(count) ? Math.ceil(count * 10) / 10 : Math.ceil(count);
                return (
                  <div
                    key={machineId}
                    className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:border-[#f4872145]"
                    style={{ background: '#0d0f12', border: '1px solid #1e2128' }}
                  >
                    <div
                      className="w-6 h-6 rounded shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: '#15171c', border: '1px solid #23262e' }}
                    >
                      {(machine?.imageUrl || machineId) && (
                        <AppImage
                          idKey={machineId}
                          fallbackUrl={machine?.imageUrl}
                          alt={machine?.name || machineId}
                          className="w-5 h-5 object-contain"
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-[#d4d3d0] font-medium truncate flex-1">
                      {machine?.name || machineId}
                    </span>
                    <span className="font-mono text-[#f48721] font-extrabold text-[11px] shrink-0">
                      ×{displayCount}
                    </span>
                  </div>
                );
              })}
              {buildingEntries.length === 0 && (
                <div className="text-xs font-mono text-[#6b7280] py-2">No buildings needed</div>
              )}
            </div>
          </div>
        </div>

        {/* Overflow → Sink (whole-machine mode only) */}
        {overflowEntries.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 px-2.5 py-2 rounded"
            style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}
          >
            <span className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold text-[#22c55e] flex items-center gap-1.5 mr-1">
              <span style={{ width: 6, height: 6, borderRadius: 1, background: '#22c55e' }} />
              Overflow → Sink
            </span>
            {overflowEntries.map(([itemId, rate]) => {
              const item = items[itemId];
              const pts = item?.sinkPoints;
              const ptsPerMin = pts ? pts * rate : null;
              return (
                <div
                  key={itemId}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0d1612] border border-[#22c55e30]"
                >
                  {(item?.imageUrl || itemId) && (
                    <AppImage
                      idKey={itemId}
                      fallbackUrl={item?.imageUrl}
                      alt={item?.name || itemId}
                      className="w-3.5 h-3.5 object-contain shrink-0"
                    />
                  )}
                  <span className="text-[10px] font-semibold text-[#e4e3e0]">{item?.name || itemId}</span>
                  <span className="font-mono text-[10px] font-bold text-[#22c55e]">
                    +{formatRate(rate, itemId)}
                  </span>
                  {ptsPerMin !== null && (
                    <span className="font-mono text-[9px] text-[#6b7280]">
                      ({Math.round(ptsPerMin).toLocaleString()} pts/m)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom edge accent */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 12,
          left: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #2a2d33 40%)',
        }}
      />
      {/* Bottom-right chamfer highlight */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          borderBottom: '12px solid #f4872120',
          borderLeft: '12px solid transparent',
        }}
      />
    </div>
  );
}
