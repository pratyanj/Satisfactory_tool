import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import React, { useEffect } from 'react';
import { machines } from '../../engine/data';
import { FlipHorizontal } from 'lucide-react';

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
    <div className={`bg-[#151619] border border-[#2a2d33] rounded-xl shadow-xl w-[320px] text-white font-sans overflow-hidden hover:border-[#4a4d53] transition-colors cursor-pointer group flex flex-col relative`}>
      <Handle key={`target-${isFlipped}`} type="target" position={isFlipped ? Position.Right : Position.Left} className="w-3 h-3 bg-blue-500 border-none opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top section: image + item name + rate + machine label */}
      <div className={`flex ${isFlipped ? 'flex-row-reverse' : ''}`}>
        {/* Machine image */}
        <div className={`w-[72px] bg-[#101114] flex items-center justify-center shrink-0 overflow-hidden relative ${isFlipped ? 'border-l border-[#2a2d33]' : 'border-r border-[#2a2d33]'}`} style={{ minHeight: 72 }}>
          {machineInfo?.imageUrl ? (
            <img src={`https://wsrv.nl/?url=${encodeURIComponent(machineInfo.imageUrl)}&w=128&output=webp&maxage=30d`} crossOrigin="anonymous" className="w-full h-full object-cover" alt={machineInfo.name} loading="lazy" />
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
            <div className="font-semibold text-sm leading-tight truncate">
              {(data.rate as number).toFixed(1)}/min
            </div>
          </div>
          <div className="px-3 flex items-center h-[30px] shrink-0 min-w-0">
            <span className="font-mono text-[11px] text-green-400 truncate flex-1 leading-none" title={data.label as string}>
              {data.label as string}
            </span>
          </div>
        </div>
      </div>

      {/* Recipe details section */}
      <div className="border-t border-[#2a2d33] px-3 py-1.5 bg-[#101114] space-y-1">
        {/* Inputs */}
        {inputDetails.length > 0 && inputDetails.map((inp: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5 text-[10px]">
            <span className="text-blue-400 font-bold w-4 text-center shrink-0">IN</span>
            {inp.imageUrl && (
              <img src={`https://wsrv.nl/?url=${encodeURIComponent(inp.imageUrl)}&w=32&output=webp`} className="w-3.5 h-3.5 object-contain shrink-0" alt={inp.name} />
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
              <img src={`https://wsrv.nl/?url=${encodeURIComponent(data.itemImageUrl as string)}&w=32&output=webp`} className="w-3.5 h-3.5 object-contain shrink-0" alt={data.item as string} />
            )}
            <span className="text-[#a0a4ab] truncate flex-1">{data.item as string}</span>
            <span className="font-mono text-[#cbd5e1] shrink-0">{outputRatePerMachine}/m</span>
          </div>
        )}
        {/* Power per machine */}
        {powerPerMachine > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] pt-0.5 border-t border-[#1c1e22]">
            <span className="text-yellow-500">⚡</span>
            <span className="text-[#8E9299]">{powerPerMachine} MW/machine</span>
          </div>
        )}
      </div>

      <Handle key={`source-${isFlipped}`} type="source" position={isFlipped ? Position.Left : Position.Right} className="w-3 h-3 bg-orange-500 border-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
});
