import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import React, { useEffect } from 'react';
import { machines } from '../../engine/data';
import { FlipHorizontal } from 'lucide-react';
import { AppImage } from '../AppImage';

export const MachineNode = React.memo(function MachineNode({ id, data }: NodeProps) {
  const machineInfo = machines[data.machineId as string];
  const machineCount = data.machines as number;
  const totalPower = (machineInfo?.powerUsage || 0) * machineCount;
  const { setNodes } = useReactFlow();

  const isFlipped = !!data.isFlipped;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => { updateNodeInternals(id); }, [isFlipped, id, updateNodeInternals]);

  const toggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.map(n => n.id === id ? { ...n, data: { ...n.data, isFlipped: !isFlipped } } : n));
  };

  const inputDetails = (data.inputDetails as any[]) || [];
  const outputRatePerMachine = data.outputRatePerMachine as number || 0;
  const powerPerMachine = data.powerPerMachine as number || 0;

  return (
    <div className="relative group">
      <div className={`bg-[#151619] border border-[#2a2d33] rounded-xl shadow-xl w-[240px] text-white font-sans overflow-hidden group-hover:border-[#4a4d53] transition-colors cursor-pointer flex flex-col relative`}>
        <Handle key={`target-${isFlipped}`} type="target" position={isFlipped ? Position.Right : Position.Left} className="w-3 h-3 bg-blue-500 border-none opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top section: image + item name + rate + machine label */}
      <div className={`flex ${isFlipped ? 'flex-row-reverse' : ''}`}>
        {/* Machine image */}
        <div className={`w-[100px] bg-[#101114] flex items-center justify-center shrink-0 overflow-hidden relative ${isFlipped ? 'border-l border-[#2a2d33]' : 'border-r border-[#2a2d33]'}`} style={{ minHeight: 72 }}>
          {machineInfo?.imageUrl ? (
            <AppImage idKey={data.machineId as string} fallbackUrl={machineInfo.imageUrl} className="w-full h-full object-cover" alt={machineInfo.name} />
          ) : (
            <div className="w-full h-full bg-[#1c1e22]" />
          )}
          <button onClick={toggleFlip} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" title="Flip Machine">
            <FlipHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Item name, rate, machine label */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="bg-[#1c1e22] px-3 py-2 border-b border-[#2a2d33] flex-1">
            <div className="flex justify-between items-start gap-2">
              <div className="text-[10px] font-mono tracking-widest text-[#8E9299] uppercase mb-0.5 truncate flex-1" title={data.item as string}>
                {data.item as string}
              </div>
              <div className="font-mono text-[10px] text-orange-400 shrink-0">{totalPower.toFixed(1)} MW</div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {data.itemImageUrl && (
                <AppImage idKey={data.itemId as string} fallbackUrl={data.itemImageUrl as string} className="w-8 h-8 object-contain shrink-0" alt={data.item as string} />
              )}
              <div className="font-semibold text-sm leading-tight truncate">
                {(data.rate as number).toFixed(1)}/min
              </div>
            </div>
          </div>
          <div className="px-3 flex items-center h-[30px] shrink-0 min-w-0">
            <span className="font-mono text-[11px] text-green-400 truncate flex-1 leading-none" title={data.label as string}>
              {data.label as string}
            </span>
          </div>
        </div>
      </div>

        <Handle key={`source-${isFlipped}`} type="source" position={isFlipped ? Position.Left : Position.Right} className="w-3 h-3 bg-orange-500 border-none opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Hover Floating Card for Recipe details */}
      <div className="absolute top-full left-0 mt-2 w-full hidden group-hover:block border border-[#2a2d33] rounded-xl px-3 py-2 bg-[#151619] shadow-2xl z-[100] space-y-1.5 pointer-events-none text-white font-sans">
        {/* Inputs */}
        {inputDetails.length > 0 && inputDetails.map((inp: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5 text-[10px]">
            <span className="text-blue-400 font-bold w-4 text-center shrink-0">IN</span>
            {inp.imageUrl && (
              <AppImage idKey={inp.itemId} fallbackUrl={inp.imageUrl} className="w-3.5 h-3.5 object-contain shrink-0" alt={inp.name} />
            )}
            <span className="text-[#a0a4ab] truncate flex-1">{inp.name}</span>
            <span className="font-mono text-[#cbd5e1] shrink-0">{inp.ratePerMachine}/m</span>
          </div>
        ))}
        {/* Output */}
        {outputRatePerMachine > 0 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-orange-400 font-bold w-4 text-center shrink-0">OUT</span>
            {data.itemImageUrl && (
              <AppImage idKey={data.itemId as string} fallbackUrl={data.itemImageUrl as string} className="w-3.5 h-3.5 object-contain shrink-0" alt={data.item as string} />
            )}
            <span className="text-[#a0a4ab] truncate flex-1">{data.item as string}</span>
            <span className="font-mono text-[#cbd5e1] shrink-0">{outputRatePerMachine}/m</span>
          </div>
        )}
        {/* Byproducts */}
        {(data.byproductDetails as any[] || []).length > 0 && (data.byproductDetails as any[]).map((bp: any, idx: number) => (
          <div key={`bp-${idx}`} className="flex items-center gap-1.5 text-[10px]">
            <span className="text-orange-400 font-bold w-4 text-center shrink-0">OUT</span>
            {bp.imageUrl && (
              <AppImage idKey={bp.itemId} fallbackUrl={bp.imageUrl} className="w-3.5 h-3.5 object-contain shrink-0" alt={bp.name} />
            )}
            <span className="text-[#a0a4ab] truncate flex-1">{bp.name}</span>
            <span className="font-mono text-[#cbd5e1] shrink-0">{bp.ratePerMachine}/m</span>
          </div>
        ))}
        {/* Power per machine */}
        {powerPerMachine > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] pt-1 mt-1 border-t border-[#2a2d33]">
            <span className="text-yellow-500">⚡</span>
            <span className="text-[#8E9299]">{powerPerMachine} MW/machine</span>
          </div>
        )}
      </div>
    </div>
  );
});
