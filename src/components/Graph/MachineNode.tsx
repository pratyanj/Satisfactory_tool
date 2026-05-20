import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import React, { useEffect } from 'react';
import { machines } from '../../engine/data';
import { FlipHorizontal, Star } from 'lucide-react';
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
      <div 
        className={`bg-[#151619] border border-[#2a2d33] shadow-2xl w-[220px] text-white font-sans overflow-hidden group-hover:border-[#f48721]/60 transition-all duration-300 cursor-pointer flex flex-row relative h-[72px]`}
        style={{
          background: 'linear-gradient(135deg, #1e2024 0%, #13151a 100%)',
          clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        }}
      >
        <Handle key={`target-${isFlipped}`} type="target" position={isFlipped ? Position.Right : Position.Left} className="w-2.5 h-2.5 bg-[#06b6d4] border-none opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Slanted graphite card body */}
        <div className={`flex flex-1 ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Left section: Item Image with dark background */}
          <div 
            className={`w-[64px] bg-[#0c0d10] flex items-center justify-center shrink-0 overflow-hidden relative ${isFlipped ? 'border-l border-[#2a2d33]/60' : 'border-r border-[#2a2d33]/60'}`}
          >
            {data.itemImageUrl ? (
              <AppImage idKey={data.itemId as string} fallbackUrl={data.itemImageUrl as string} className="w-11 h-11 object-contain" alt={data.item as string} />
            ) : (
              <div className="w-full h-full bg-[#1c1e22]" />
            )}
            <button onClick={toggleFlip} className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" title="Flip Node direction">
              <FlipHorizontal className="w-4 h-4 text-[#f48721]" />
            </button>
          </div>

          {/* Right section: Item details + rate + machine label */}
          <div className="flex-1 flex flex-col justify-between py-1.5 px-3.5 min-w-0 select-none">
            {/* Row 1: Item Name (uppercase) & Power */}
            <div className="flex justify-between items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-[#8e9299] uppercase truncate flex-1" title={data.item as string}>
                {data.item as string}
              </span>
              <span className="font-mono text-[9px] text-[#f48721] shrink-0 font-medium">{totalPower.toFixed(1)} MW</span>
            </div>

            {/* Row 2: Flow Rate */}
            <div className="font-mono text-[13px] font-black text-[#06b6d4] leading-none tracking-tight">
              {(data.rate as number).toFixed(1)}/m
            </div>

            {/* Row 3: Machine & Count */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <span className="font-mono text-[9px] text-[#10b981] font-medium truncate flex-1" title={data.label as string}>
                {data.label as string}
              </span>
              {data.isAlternate && (
                <div title="Alternate Recipe" className="flex items-center shrink-0">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        <Handle key={`source-${isFlipped}`} type="source" position={isFlipped ? Position.Left : Position.Right} className="w-2.5 h-2.5 bg-[#f48721] border-none opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Hover Floating Card for Recipe details */}
      <div className="sf-tooltip whitespace-nowrap min-w-max">
        {/* Inputs */}
        {inputDetails.length > 0 && inputDetails.map((inp: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 font-mono text-[11px] mb-1">
            <span className="text-blue-400 font-bold w-6 text-center shrink-0 border-r border-[#2a2d33] pr-1">IN</span>
            {inp.imageUrl && (
              <AppImage idKey={inp.itemId} fallbackUrl={inp.imageUrl} className="w-3.5 h-3.5 object-contain shrink-0" alt={inp.name} />
            )}
            <span className="text-[#a0a4ab] flex-1">{inp.name}</span>
            <span className="text-[#e4e3e0] shrink-0 text-right min-w-[50px]">{inp.ratePerMachine}/m</span>
          </div>
        ))}
        {/* Output */}
        {outputRatePerMachine > 0 && (
          <div className="flex items-center gap-2 font-mono text-[11px] mb-1">
            <span className="text-orange-400 font-bold w-6 text-center shrink-0 border-r border-[#2a2d33] pr-1">OUT</span>
            {data.itemImageUrl && (
              <AppImage idKey={data.itemId as string} fallbackUrl={data.itemImageUrl as string} className="w-3.5 h-3.5 object-contain shrink-0" alt={data.item as string} />
            )}
            <span className="text-[#a0a4ab] flex-1">{data.item as string}</span>
            <span className="text-[#e4e3e0] shrink-0 text-right min-w-[50px]">{outputRatePerMachine}/m</span>
          </div>
        )}
        {/* Byproducts */}
        {(data.byproductDetails as any[] || []).length > 0 && (data.byproductDetails as any[]).map((bp: any, idx: number) => (
          <div key={`bp-${idx}`} className="flex items-center gap-2 font-mono text-[11px] mb-1">
            <span className="text-orange-400 font-bold w-6 text-center shrink-0 border-r border-[#2a2d33] pr-1">OUT</span>
            {bp.imageUrl && (
              <AppImage idKey={bp.itemId} fallbackUrl={bp.imageUrl} className="w-3.5 h-3.5 object-contain shrink-0" alt={bp.name} />
            )}
            <span className="text-[#a0a4ab] flex-1">{bp.name}</span>
            <span className="text-[#e4e3e0] shrink-0 text-right min-w-[50px]">{bp.ratePerMachine}/m</span>
          </div>
        ))}
        {/* Power per machine */}
        {powerPerMachine > 0 && (
          <div className="flex items-center gap-2 font-mono text-[11px] pt-1 mt-2 border-t border-[#2a2d33]">
            <span className="text-yellow-500 w-6 text-center">⚡</span>
            <span className="text-[#8E9299]">{powerPerMachine} MW/machine</span>
          </div>
        )}
      </div>
    </div>
  );
});
