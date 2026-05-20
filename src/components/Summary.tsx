import React from 'react';
import { SummaryData } from '../engine/solver';
import { items, machines } from '../engine/data';

interface SummaryProps {
  summary: SummaryData;
}

export function Summary({ summary }: SummaryProps) {
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
          <ul className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
            {Object.entries(summary.rawInputs).map(([itemId, rate]) => (
              <li key={itemId} className="flex justify-between items-center bg-[#17191d] px-2.5 py-1.5 border border-[#2a2d33] transition-colors hover:border-[#f4872130]" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                <span className="font-bold text-[11px] text-[#e4e3e0] tracking-wide">{items[itemId]?.name || itemId}</span>
                <span className="font-mono text-[11px] text-blue-400 font-bold">{rate.toFixed(1)}/m</span>
              </li>
            ))}
            {Object.keys(summary.rawInputs).length === 0 && (
              <div className="text-xs font-mono text-[#6b7280]">No raw inputs needed</div>
            )}
          </ul>
        </div>

        {/* Buildings */}
        <div className="flex flex-col flex-1 min-w-[200px] border-l border-[#2a2d33]/50 pl-4">
          <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase mb-2">Buildings</label>
          <ul className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
            {Object.entries(summary.machineCounts).map(([machineId, count]) => (
              <li key={machineId} className="flex justify-between items-center text-xs border-b border-[#2a2d33]/40 pb-1 last:border-b-0">
                <span className="text-[#c4c7cd] text-[11px] tracking-wide font-medium">{machines[machineId]?.name || machineId}</span>
                <span className="font-mono text-[#f48721] font-bold text-[11px]">x{isFinite(count) ? Math.ceil(count * 10) / 10 : Math.ceil(count)}</span>
              </li>
            ))}
            {Object.keys(summary.machineCounts).length === 0 && (
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
