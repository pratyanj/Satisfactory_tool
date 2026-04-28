import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import React, { useEffect } from 'react';
import { machines } from '../../engine/data';
import { FlipHorizontal } from 'lucide-react';

export function MachineNode({ id, data }: NodeProps) {
  const machineInfo = machines[data.machineId as string];
  const totalPower = (machineInfo?.powerUsage || 0) * (data.machines as number);
  const { setNodes } = useReactFlow();

  const isFlipped = !!data.isFlipped;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [isFlipped, id, updateNodeInternals]);

  const toggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.map(n => n.id === id ? { ...n, data: { ...n.data, isFlipped: !isFlipped } } : n));
  };

  return (
    <div className={`bg-[#151619] border border-[#2a2d33] rounded-xl shadow-xl w-[260px] h-[92px] text-white font-sans overflow-hidden hover:border-[#4a4d53] transition-colors cursor-pointer group flex relative ${isFlipped ? 'flex-row-reverse' : ''}`}>
      <Handle key={`target-${isFlipped}`} type="target" position={isFlipped ? Position.Right : Position.Left} className="w-3 h-3 bg-blue-500 border-none opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Left side: Image */}
      <div className={`w-[72px] bg-[#101114] flex items-center justify-center shrink-0 overflow-hidden relative ${isFlipped ? 'border-l border-[#2a2d33]' : 'border-r border-[#2a2d33]'}`}>
        {machineInfo?.imageUrl ? (
          <img src={`https://wsrv.nl/?url=${encodeURIComponent(machineInfo.imageUrl)}&w=128&output=webp&maxage=30d`} crossOrigin="anonymous" className="w-full h-full object-cover" alt={machineInfo.name} />
        ) : (
          <div className="w-full h-full bg-[#1c1e22]" />
        )}
        <button onClick={toggleFlip} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" title="Flip Machine">
          <FlipHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="bg-[#1c1e22] px-3 py-2 border-b border-[#2a2d33] flex-1 relative">
          <div className="flex justify-between items-start gap-2">
            <div className="text-[10px] font-mono tracking-widest text-[#8E9299] uppercase mb-0.5 truncate flex-1" title={data.item as string}>
              {data.item as string}
            </div>
            <div className="font-mono text-[10px] text-orange-400 shrink-0">{totalPower.toFixed(1)} MW</div>
          </div>
          <div className="font-semibold text-sm leading-tight truncate" title={`${(data.rate as number).toFixed(1)}/min`}>
            <span>{(data.rate as number).toFixed(1)}/min</span>
          </div>
        </div>
        
        <div className="px-3 flex items-center h-[34px] shrink-0 min-w-0 group/bottom relative">
          <span className="font-mono text-xs text-green-400 truncate flex-1" title={`${data.label} x${Math.ceil((data.machines as number) * 10) / 10}`}>
            {data.label as string} <span className="text-[#8E9299]">x{Math.ceil((data.machines as number) * 10) / 10}</span>
          </span>
        </div>
      </div>

      <Handle key={`source-${isFlipped}`} type="source" position={isFlipped ? Position.Left : Position.Right} className="w-3 h-3 bg-orange-500 border-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
