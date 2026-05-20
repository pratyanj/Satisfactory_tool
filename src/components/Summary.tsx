import React from 'react';
import { SummaryData } from '../engine/solver';
import { items, machines } from '../engine/data';

interface SummaryProps {
  summary: SummaryData;
}

export function Summary({ summary }: SummaryProps) {
  // Compute maximum values for scaling the progress bars dynamically
  const rawEntries = Object.entries(summary.rawInputs);
  const maxRawRate = rawEntries.length > 0 ? Math.max(...rawEntries.map(([_, rate]) => rate)) : 1;

  const machineEntries = Object.entries(summary.machineCounts);
  const maxMachineCount = machineEntries.length > 0 ? Math.max(...machineEntries.map(([_, count]) => count)) : 1;

  return (
    <div
      className="relative w-full h-full text-white flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1e2024 0%, #13151a 100%)',
        border: '1px solid #2a2d33',
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Top orange accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 40, right: 40, height: '2px',
        background: 'linear-gradient(90deg, transparent, #f48721, transparent)',
        opacity: 0.7,
      }} />

      {/* Corner accent – top-left chamfer highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 0, height: 0,
        borderTop: '12px solid #f48721', borderRight: '12px solid transparent',
      }} />

      {/* Panel header label */}
      <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-[#2a2d33]">
        <div style={{
          width: 3, height: 14,
          background: 'linear-gradient(180deg, #f48721, #c45700)',
          borderRadius: 2,
        }} />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">
          FICSIT // Production Summary
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
      </div>

      {/* Content */}
      <div className="flex flex-row flex-wrap gap-5 items-stretch p-3.5 flex-1 select-none">
        
        {/* Power Required */}
        <div className="flex flex-col gap-1 min-w-[120px] justify-center">
          <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase">Power Required</label>
          <div className="text-3xl font-black text-[#f48721] font-mono flex items-baseline gap-1" style={{ textShadow: '0 0 10px rgba(244,135,33,0.15)' }}>
            {Math.ceil(summary.totalPower)}
            <span className="text-[10px] font-bold text-[#8E9299] tracking-wider uppercase">MW</span>
          </div>
        </div>

        {/* Raw Inputs */}
        <div className="flex flex-col flex-1 min-w-[200px] border-l border-[#2a2d33]/50 pl-4">
          <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase mb-2">Raw Inputs</label>
          <ul className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
            {rawEntries.map(([itemId, rate]) => {
              const pct = maxRawRate > 0 ? (rate / maxRawRate) * 100 : 0;
              return (
                <li
                  key={itemId}
                  className="flex flex-col bg-[#17191d] p-2 border border-[#2a2d33] transition-colors hover:border-[#f4872130]"
                  style={{
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)'
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-[11px] text-[#e4e3e0] tracking-wide">{items[itemId]?.name || itemId}</span>
                    <span className="font-mono text-[11px] text-blue-400 font-bold">{rate.toFixed(1)}/m</span>
                  </div>
                  <div className="w-full bg-[#0d0e11] h-1 border border-[#2a2d33]/60 overflow-hidden mt-1 relative rounded-sm">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 relative"
                      style={{
                        width: `${pct}%`,
                        boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)',
                        backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.15) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.15) 75%, transparent 75%, transparent)',
                        backgroundSize: '8px 8px'
                      }}
                    />
                  </div>
                </li>
              );
            })}
            {rawEntries.length === 0 && (
              <div className="text-xs font-mono text-[#6b7280]">No raw inputs needed</div>
            )}
          </ul>
        </div>

        {/* Buildings */}
        <div className="flex flex-col flex-1 min-w-[200px] border-l border-[#2a2d33]/50 pl-4">
          <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase mb-2">Buildings</label>
          <ul className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
            {machineEntries.map(([machineId, count]) => {
              const pct = maxMachineCount > 0 ? (count / maxMachineCount) * 100 : 0;
              const countVal = isFinite(count) ? Math.ceil(count * 10) / 10 : Math.ceil(count);
              return (
                <li
                  key={machineId}
                  className="flex flex-col bg-[#17191d] p-2 border border-[#2a2d33] transition-colors hover:border-[#f4872130]"
                  style={{
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)'
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[#e4e3e0] text-[11px] tracking-wide font-bold">{machines[machineId]?.name || machineId}</span>
                    <span className="font-mono text-[#f48721] font-bold text-[11px]">x{countVal}</span>
                  </div>
                  <div className="w-full bg-[#0d0e11] h-1 border border-[#2a2d33]/60 overflow-hidden mt-1 relative rounded-sm">
                    <div
                      className="h-full bg-gradient-to-r from-[#f48721] to-[#e66c00] transition-all duration-500 relative"
                      style={{
                        width: `${pct}%`,
                        boxShadow: '0 0 6px rgba(244, 135, 33, 0.4)',
                        backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.15) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.15) 75%, transparent 75%, transparent)',
                        backgroundSize: '8px 8px'
                      }}
                    />
                  </div>
                </li>
              );
            })}
            {machineEntries.length === 0 && (
              <div className="text-xs font-mono text-[#6b7280]">No buildings needed</div>
            )}
          </ul>
        </div>

      </div>

      {/* Bottom edge accent */}
      <div style={{
        position: 'absolute', bottom: 0, right: 12, left: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, #2a2d33 40%)',
      }} />
      {/* Bottom-right chamfer highlight */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0, width: 0, height: 0,
        borderBottom: '12px solid #f4872120', borderLeft: '12px solid transparent',
      }} />
    </div>
  );
}
