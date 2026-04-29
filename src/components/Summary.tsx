import React from 'react';
import { SummaryData } from '../engine/solver';
import { items, machines } from '../engine/data';

interface SummaryProps {
  summary: SummaryData;
}

export function Summary({ summary }: SummaryProps) {
  return (
    <div className="bg-[#151619] border border-[#2a2d33] rounded-2xl p-6 text-white h-full flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight text-[#f0f0f0]">Factory Summary</h2>
      
      <div>
        <h3 className="text-xs font-mono tracking-widest text-[#8E9299] uppercase mb-3">Power Required</h3>
        <div className="text-3xl font-light text-orange-400">
          {Math.ceil(summary.totalPower)} <span className="text-lg text-[#8E9299]">MW</span>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-mono tracking-widest text-[#8E9299] uppercase mb-3">Raw Inputs</h3>
        <ul className="space-y-2">
          {Object.entries(summary.rawInputs).map(([itemId, rate]) => (
            <li key={itemId} className="flex justify-between items-center bg-[#1c1e22] px-3 py-2 rounded-lg border border-[#2a2d33]">
              <span className="font-medium text-sm">{items[itemId]?.name || itemId}</span>
              <span className="font-mono text-sm text-blue-400">{rate.toFixed(1)}/min</span>
            </li>
          ))}
          {Object.keys(summary.rawInputs).length === 0 && (
            <div className="text-sm text-[#8E9299]">None</div>
          )}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-mono tracking-widest text-[#8E9299] uppercase mb-3">Buildings</h3>
        <ul className="space-y-2">
          {Object.entries(summary.machineCounts).map(([machineId, count]) => (
            <li key={machineId} className="flex justify-between items-center">
              <span className="text-sm text-[#d1d1d1]">{machines[machineId]?.name || machineId}</span>
              <span className="font-mono text-sm">x{isFinite(count) ? Math.ceil(count * 10) / 10 : Math.ceil(count)}</span>
            </li>
          ))}
          {Object.keys(summary.machineCounts).length === 0 && (
            <div className="text-sm text-[#8E9299]">None</div>
          )}
        </ul>
      </div>
    </div>
  );
}
