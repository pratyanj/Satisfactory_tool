import React from 'react';
import { SummaryData } from '../engine/solver';
import { items, machines } from '../engine/data';
import { AppImage } from './AppImage';
import { Zap } from 'lucide-react';

interface SummaryProps {
  summary: SummaryData;
}

export function Summary({ summary }: SummaryProps) {
  // Compute maximum values for scaling the progress bars dynamically
  const rawEntries = Object.entries(summary.rawInputs);
  const maxRawRate = rawEntries.length > 0 ? Math.max(...rawEntries.map(([_, rate]) => rate)) : 1;

  const machineEntries = Object.entries(summary.machineCounts);

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
      <div className="flex flex-row flex-wrap gap-4 items-stretch p-3 flex-1 select-none">
        
        {/* Power Required: Concentric Holographic Emitter platform */}
        <div className="flex flex-col gap-1 min-w-[120px] items-center justify-center relative overflow-hidden px-2 border-r border-[#2a2d33]/30">
          <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase z-10 select-none">Power Required</label>
          
          <div className="relative flex items-center justify-center w-full h-18 mt-1.5 select-none">
            {/* Concentric glow rings */}
            <div className="absolute bottom-0 w-24 h-4 bg-[#f48721]/5 rounded-[50%] border border-[#f48721]/20 blur-[0.5px] animate-pulse" />
            <div className="absolute bottom-1 w-16 h-3 bg-[#f48721]/10 rounded-[50%] border border-[#f48721]/30 blur-[1px] animate-ping" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-2 w-8 h-2 bg-[#f48721]/25 rounded-[50%] blur-[2px]" />
            {/* Hologram vertical beam */}
            <div className="absolute bottom-2 w-16 h-12 bg-gradient-to-t from-[#f48721]/15 to-transparent blur-md pointer-events-none" style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0% 100%)' }} />
            
            {/* Hologram Icon - Zap */}
            <div className="absolute bottom-3.5 flex flex-col items-center">
              <Zap size={20} className="text-[#f48721] drop-shadow-[0_0_8px_rgba(244,135,33,0.8)] animate-bounce" style={{ animationDuration: '3s' }} />
            </div>

            {/* Giant Monospace Power Number */}
            <div className="absolute top-0 text-xl font-black text-[#f48721] font-mono tracking-tight text-center drop-shadow-[0_0_10px_rgba(244,135,33,0.25)]">
              {Math.ceil(summary.totalPower)}
            </div>
            
            {/* MW Label */}
            <div className="absolute bottom-0 text-[8px] font-bold text-[#8e9299] tracking-widest font-mono uppercase">
              MW
            </div>
          </div>
        </div>

        {/* Raw Inputs */}
        <div className="flex flex-col flex-1 min-w-[180px] pl-1">
          <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase mb-1.5">Raw Inputs</label>
          <ul className="space-y-1.5 max-h-[105px] overflow-y-auto pr-1">
            {rawEntries.map(([itemId, rate]) => {
              const pct = maxRawRate > 0 ? (rate / maxRawRate) * 100 : 0;
              return (
                <li
                  key={itemId}
                  className="flex flex-col bg-[#17191d]/60 p-1.5 border border-[#2a2d33]/50 transition-colors hover:border-[#f4872130]"
                  style={{
                    clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)'
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {items[itemId]?.imageUrl && (
                        <AppImage idKey={itemId} fallbackUrl={items[itemId].imageUrl} className="w-4 h-4 object-contain shrink-0" alt={items[itemId].name} />
                      )}
                      <span className="font-bold text-[10px] text-[#e4e3e0] tracking-wide truncate">{items[itemId]?.name || itemId}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#06b6d4] font-bold shrink-0">{rate.toFixed(1)} /m</span>
                  </div>
                  <div className="w-full bg-[#0d0e11] h-1 border border-[#2a2d33]/30 overflow-hidden mt-1 relative rounded-[1px]">
                    <div
                      className="h-full bg-gradient-to-r from-[#0891b2] to-[#06b6d4] transition-all duration-500 relative"
                      style={{
                        width: `${pct}%`,
                        boxShadow: '0 0 4px rgba(6, 182, 212, 0.4)',
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
        <div className="flex flex-col flex-1 min-w-[180px] border-l border-[#2a2d33]/30 pl-3">
          <label className="text-[9px] font-mono tracking-[0.2em] text-[#6b7280] uppercase mb-1.5">Buildings</label>
          <ul className="space-y-1.5 max-h-[105px] overflow-y-auto pr-1">
            {machineEntries.map(([machineId, count]) => {
              const countVal = isFinite(count) ? Math.ceil(count * 10) / 10 : Math.ceil(count);
              return (
                <li
                  key={machineId}
                  className="flex items-center justify-between bg-[#17191d]/60 px-2 py-1 border border-[#2a2d33]/40 transition-colors hover:border-[#f4872120] min-h-[26px]"
                  style={{
                    clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)'
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {machines[machineId]?.imageUrl && (
                      <AppImage idKey={machineId} fallbackUrl={machines[machineId].imageUrl} className="w-4 h-4 object-contain shrink-0" alt={machines[machineId].name} />
                    )}
                    <span className="text-[#e4e3e0] text-[10px] tracking-wide font-medium truncate">{machines[machineId]?.name || machineId}</span>
                  </div>
                  <span className="font-mono text-[#f48721] font-bold text-[10px] shrink-0 ml-2">x{countVal}</span>
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
