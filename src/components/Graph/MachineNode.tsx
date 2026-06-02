import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import React, { useEffect } from 'react';
import { machines } from '../../engine/data';
import { FlipHorizontal, Star } from 'lucide-react';
import { AppImage } from '../AppImage';

export const MachineNode = React.memo(function MachineNode({ id, data, selected }: NodeProps) {
  const machineInfo = machines[data.machineId as string];
  const machineName = (machineInfo?.name || (data.machineName as string) || (data.label as string) || (data.machineId as string) || 'Machine');
  const machineImageUrl = machineInfo?.imageUrl || (data.machineImageUrl as string | undefined);
  const machineSecondaryImageUrl = data.machineSecondaryImageUrl as string | undefined;
  const machinePowerPerMachine = (data.powerPerMachine as number) ?? machineInfo?.powerUsage ?? 0;
  const machineCount = data.machines as number;
  const totalPower = machinePowerPerMachine * machineCount;
  const { setNodes } = useReactFlow();

  const isFlipped = !!data.isFlipped;
  const updateNodeInternals = useUpdateNodeInternals();

  const diagnosticsStatus = data.diagnosticsStatus as 'idle' | 'starved' | 'clogged' | undefined;
  const diagnosticsSeverity = data.diagnosticsSeverity as 'critical' | 'warning' | 'info' | undefined;

  const glowStyle = diagnosticsSeverity === 'critical'
    ? { boxShadow: '0 0 25px rgba(255, 23, 68, 0.85)', borderColor: '#ff1744' }
    : diagnosticsSeverity === 'warning'
    ? { boxShadow: '0 0 20px rgba(255, 145, 0, 0.7)', borderColor: '#ff9100' }
    : {};


  useEffect(() => {
    updateNodeInternals(id);
  }, [isFlipped, id, updateNodeInternals]);

  const toggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, isFlipped: !isFlipped } } : n
      )
    );
  };

  const inputDetails = (data.inputDetails as any[]) || [];
  const outputRatePerMachine = data.outputRatePerMachine as number || 0;

  if (data.machineId === 'product_output' || data.machineId === 'byproduct_output' || id.startsWith('product-output') || id.startsWith('byproduct-output')) {
    const rate = data.rate as number;
    const itemName = data.item as string;
    const itemImageUrl = data.itemImageUrl as string;
    const isByproduct = data.machineId === 'byproduct_output' || id.startsWith('byproduct-output');
    const accent = isByproduct ? '#a78bfa' : '#f48721';
    const accentRgb = isByproduct ? '167,139,250' : '244,135,33';
    return (
      <div className="relative group flex flex-col items-center justify-center p-2">
        <Handle
          key={`target-${isFlipped}`}
          type="target"
          position={isFlipped ? Position.Right : Position.Left}
          className="w-3 h-3 bg-blue-500 border-none opacity-0 group-hover:opacity-100 transition-opacity z-30"
        />
        <div
          className="w-24 h-24 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all duration-300 relative cursor-pointer"
          style={{
            background: 'radial-gradient(circle, #252830 0%, #0f1013 100%)',
            borderColor: `rgba(${accentRgb},0.5)`,
            boxShadow: `0 0 20px rgba(${accentRgb},0.3)`,
          }}
        >
          {/* Animated pulsing orbit glow */}
          <div className="absolute inset-0 rounded-full border border-dashed animate-[spin_20s_linear_infinite]" style={{ borderColor: `rgba(${accentRgb},0.2)` }} />

          {itemImageUrl && (
            <AppImage
              idKey={data.itemId as string}
              fallbackUrl={itemImageUrl}
              className="w-[70%] h-[70%] object-contain filter drop-shadow(0 8px 12px rgba(0,0,0,0.7))"
              alt={itemName}
            />
          )}
        </div>
        <div className="mt-3 text-center select-none font-mono text-[14px] font-bold text-white bg-[#0f1013]/90 px-3 py-1 rounded-full border border-[#23252a] shadow-[0_2px_8px_rgba(0,0,0,0.5)] tracking-wide">
          {isByproduct && (
            <span className="block text-[8px] font-black tracking-[0.18em] uppercase" style={{ color: accent }}>Byproduct</span>
          )}
          <span style={{ color: accent }} className="font-black mr-1">{Number(rate.toFixed(2)).toString()}</span>
          {itemName}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative group">
      {/* React Flow Connection Handles (swapped when node is flipped) */}
      <Handle
        key={`target-${isFlipped}`}
        type="target"
        position={isFlipped ? Position.Right : Position.Left}
        className="w-3 h-3 bg-blue-500 border-none opacity-0 group-hover:opacity-100 transition-opacity z-30"
      />

      {/* Main Premium Beveled Card */}
      <div 
        className={`sf-machine-card-frame ${selected ? 'border-[#f48721]' : ''}`}
        style={{
          ...glowStyle,
          borderColor: selected ? '#f48721' : glowStyle.borderColor,
          boxShadow: glowStyle.boxShadow,
        }}
      >
        {/* Bezel Corner Screws/Rivets */}
        <div className="sf-card-screw sf-card-screw-tl" />
        <div className="sf-card-screw sf-card-screw-tr" />
        <div className="sf-card-screw sf-card-screw-bl" />
        <div className="sf-card-screw sf-card-screw-br" />

        {/* Outer Bezel Hazard Stripes */}
        <div className="sf-card-stripes-tl" />
        <div className="sf-card-stripes-tr" />

        {/* Left/Right Flex Layout (mirrored when flipped) */}
        <div className={`flex w-full h-full ${isFlipped ? 'flex-row-reverse' : ''}`}>
          
          {/* LEFT HALF: Machine Image + Caution Tape */}
          <div className="sf-card-left-panel">
            {machineImageUrl ? (
              <AppImage
                idKey={data.machineId as string}
                fallbackUrl={machineImageUrl}
                secondaryFallbackUrl={machineSecondaryImageUrl}
                className="w-[85%] h-[85%] object-contain select-none pointer-events-none z-10"
                alt={machineName}
              />
            ) : (
              <div className="w-full h-full bg-[#1c1e22]/20" />
            )}

            {/* Alternate Recipe Star Indicator */}
            {data.isAlternate && (
              <div
                title="Alternate Recipe"
                className="absolute top-2 left-2 z-20 flex items-center justify-center bg-[#1a1c1f]/85 p-0.5 rounded border border-yellow-500/30"
              >
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              </div>
            )}

            {/* Caution Stripes Overlay on Base Feet */}
            <div className="sf-card-caution-corner-l" />
            <div className="sf-card-caution-corner-r" />

            {/* Hover-to-Flip Button */}
            <button
              onClick={toggleFlip}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer z-20"
              title="Flip Machine Direction"
            >
              <FlipHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* RIGHT HALF: Item details, rates, machine arrays */}
          <div className="flex-1 p-2 py-[10px] flex flex-col justify-between h-full bg-[#08090a] box-border relative">
            
            {/* Header: Octagon Machine Icon + Item Produced + Power Stats */}
            <div className="flex items-center justify-between bg-[#121316]/95 border border-[#23252a] rounded-lg p-1 h-9 box-border relative overflow-hidden">
              {/* Octagon orange machine badge */}
              <div className="w-6 h-6 flex items-center justify-center bg-[#f48721] sf-octagon-badge shrink-0">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 20h18" />
                  <path d="M5 20v-5h6v5" />
                  <rect x="13" y="8" width="6" height="12" />
                  <path d="M8 15h.01" />
                </svg>
              </div>

              {/* Item Name */}
              <div
                className="font-bold tracking-wider text-white text-[10px] truncate uppercase ml-1.5 flex-1 select-none pr-1 flex items-center gap-1"
                title={data.item as string}
              >
                <span className="truncate">{data.item as string}</span>
                {diagnosticsStatus && (
                  <span className={`text-[6px] font-black tracking-tighter uppercase px-1 rounded animate-pulse shrink-0 ${
                    diagnosticsStatus === 'starved' ? 'bg-[#ff9100] text-black animate-pulse' : 'bg-[#ff1744] text-white animate-bounce'
                  }`}>
                    {diagnosticsStatus}
                  </span>
                )}
              </div>

              {/* Total Power Usage badge */}
              <div
                className="text-[#f48721] font-mono font-bold text-[8px] tracking-tight bg-[#191a1e] border border-[#2d2f36] px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5 select-none"
                title="Total Power Consumption"
              >
                <span className="text-[7.5px]">⚡</span> {totalPower.toFixed(1)} MW
              </div>
            </div>


            {/* Middle: Item Produced Icon + Production Rate Value */}
            <div className="flex items-center gap-2 w-full my-1">
              {/* Item Icon Frame */}
              <div className="w-[52px] h-[52px] bg-[#121316]/95 border border-[#23252a] rounded-lg p-1 flex items-center justify-center shrink-0 shadow-inner overflow-hidden relative">
                {data.itemImageUrl && (
                  <AppImage
                    idKey={data.itemId as string}
                    fallbackUrl={data.itemImageUrl as string}
                    className="w-full h-full object-contain filter drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    alt={data.item as string}
                  />
                )}
              </div>

              {/* Rate counters */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[7.5px] font-extrabold tracking-widest text-[#7e828a] uppercase select-none">
                    PRODUCTION RATE
                  </span>
                  {/* Decorative industrial line-flow */}
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-[#23252a] via-[#3a3d45] to-transparent ml-1.5 relative flex items-center">
                    <div className="w-[3px] h-[3px] rounded-full bg-[#f48721] absolute left-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="flex items-baseline mt-0 flex-wrap gap-y-1">
                  <span className="text-xl font-extrabold font-mono tracking-tight text-white select-none">
                    {(data.rate as number).toFixed(1)}
                  </span>
                  <span className="text-[#f48721] font-bold text-xs ml-0.5 select-none mr-2">
                    /min
                  </span>
                  {data.clockSpeed !== undefined && data.clockSpeed !== 100 && (
                    <span 
                      className="px-1 py-0.5 rounded text-[8px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono font-bold shrink-0 select-none mr-1"
                      title={`Overclocked to ${data.clockSpeed}%`}
                    >
                      {data.clockSpeed}%
                    </span>
                  )}
                  {data.somerslooped && (
                    <span 
                      className="px-1 py-0.5 rounded text-[8px] bg-purple-500/25 text-purple-300 border border-purple-500/40 font-mono font-bold shrink-0 select-none animate-pulse" 
                      title="Somerslooped: 2x Productivity"
                    >
                      🌀 2x
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: Machine Category + Array size count */}
            <div className="flex items-center gap-2 bg-[#0d0e11] border border-[#1c1d20] rounded-lg p-1 h-9 w-full box-border">
              {/* Green octagon constructor badge */}
              <div className="w-6 h-6 flex items-center justify-center bg-[#00e676]/10 border border-[#00e676]/30 sf-octagon-badge shrink-0">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#00e676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 20h18" />
                  <path d="M5 20v-5h6v5" />
                  <rect x="13" y="8" width="6" height="12" />
                  <path d="M8 15h.01" />
                </svg>
              </div>

              {/* Machine label & Count */}
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-extrabold tracking-widest text-[#7e828a] uppercase select-none truncate">
                    {machineName}
                  </span>
                </div>
                <div className="text-[#00e676] font-mono font-black text-sm leading-none select-none flex items-center gap-0.5">
                  x <span className="text-base">{Math.ceil(machineCount * 10) / 10}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      <Handle
        key={`source-${isFlipped}`}
        type="source"
        position={isFlipped ? Position.Left : Position.Right}
        className="w-3 h-3 bg-orange-500 border-none opacity-0 group-hover:opacity-100 transition-opacity z-30"
      />

      {/* Floating Detailed Hover Tooltip for Recipe Inputs/Outputs */}
      <div className="sf-machine-tooltip whitespace-nowrap min-w-[280px] z-50 p-3 bg-[#0d0e11]/95 border border-[#2a2d33] rounded-lg shadow-2xl backdrop-blur-md">
        {/* Bezel Corner Screws/Rivets */}
        <div className="sf-card-screw sf-card-screw-tl" />
        <div className="sf-card-screw sf-card-screw-tr" />
        <div className="sf-card-screw sf-card-screw-bl" />
        <div className="sf-card-screw sf-card-screw-br" />

        <div className="relative z-20 flex flex-col gap-2.5">
          {/* Header Specifications */}
          <div className="border-b border-[#2a2d33]/60 pb-1.5 shrink-0">
            <span className="text-[7.5px] font-black tracking-widest text-[#f48721] font-mono uppercase block">
              FICSIT DIAGNOSTIC SHEET
            </span>
            <span className="text-[11px] font-bold text-white uppercase block tracking-wide">
              {machineName} Array <span className="text-[#00e676] font-mono">x{Number(machineCount.toFixed(2))}</span>
            </span>
          </div>

          {/* Rates Table */}
          <div className="flex flex-col gap-1.5">
            {/* Inputs */}
            {inputDetails.length > 0 &&
              inputDetails.map((inp: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 font-mono text-[10.5px]">
                  <span className="text-blue-400 font-bold w-6 text-center shrink-0 border-r border-[#2a2d33] pr-1">
                    IN
                  </span>
                  {inp.imageUrl && (
                    <AppImage
                      idKey={inp.itemId}
                      fallbackUrl={inp.imageUrl}
                      className="w-3.5 h-3.5 object-contain shrink-0"
                      alt={inp.name}
                    />
                  )}
                  <span className="text-[#a0a4ab] flex-grow truncate max-w-[120px]">{inp.name}</span>
                  <span className="text-[#e4e3e0] shrink-0 text-right font-bold ml-2">
                    {Number(inp.ratePerMachine.toFixed(1))}/m <span className="text-[9px] text-[#8E9299] font-normal">(Total: {Number((inp.ratePerMachine * machineCount).toFixed(1))}/m)</span>
                  </span>
                </div>
              ))}

            {/* Output */}
            {outputRatePerMachine > 0 && (
              <div className="flex items-center gap-2 font-mono text-[10.5px]">
                <span className="text-orange-400 font-bold w-6 text-center shrink-0 border-r border-[#2a2d33] pr-1">
                  OUT
                </span>
                {data.itemImageUrl && (
                  <AppImage
                    idKey={data.itemId as string}
                    fallbackUrl={data.itemImageUrl as string}
                    className="w-3.5 h-3.5 object-contain shrink-0"
                    alt={data.item as string}
                  />
                )}
                <span className="text-[#a0a4ab] flex-grow truncate max-w-[120px]">{data.item as string}</span>
                <span className="text-orange-300 shrink-0 text-right font-bold ml-2">
                  {Number(outputRatePerMachine.toFixed(1))}/m <span className="text-[9px] text-[#8E9299] font-normal">(Total: {Number((outputRatePerMachine * machineCount).toFixed(1))}/m)</span>
                </span>
              </div>
            )}

            {/* Byproducts */}
            {((data.byproductDetails as any[]) || []).length > 0 &&
              (data.byproductDetails as any[]).map((bp: any, idx: number) => (
                <div key={`bp-${idx}`} className="flex items-center gap-2 font-mono text-[10.5px]">
                  <span className="text-orange-400 font-bold w-6 text-center shrink-0 border-r border-[#2a2d33] pr-1">
                    OUT
                  </span>
                  {bp.imageUrl && (
                    <AppImage
                      idKey={bp.itemId}
                      fallbackUrl={bp.imageUrl}
                      className="w-3.5 h-3.5 object-contain shrink-0"
                      alt={bp.name}
                    />
                  )}
                  <span className="text-[#a0a4ab] flex-grow truncate max-w-[120px]">{bp.name}</span>
                  <span className="text-orange-300 shrink-0 text-right font-bold ml-2">
                    {Number(bp.ratePerMachine.toFixed(1))}/m <span className="text-[9px] text-[#8E9299] font-normal">(Total: {Number((bp.ratePerMachine * machineCount).toFixed(1))}/m)</span>
                  </span>
                </div>
              ))}
          </div>

          {/* Tuning Details Section */}
          <div className="border-t border-[#2a2d33]/50 pt-2 flex flex-col gap-1 text-[9.5px] font-mono">
            <div className="flex justify-between">
              <span className="text-[#8E9299]">CLOCK SPEED:</span>
              <span className="text-yellow-500 font-bold">{data.clockSpeed ?? 100}%</span>
            </div>
            {data.somerslooped && (
              <div className="flex justify-between items-center">
                <span className="text-[#8E9299]">ALIEN BOOSTER:</span>
                <span className="text-purple-400 font-bold shrink-0">🌀 Somersloop Active (2x)</span>
              </div>
            )}
          </div>

          {/* Power Section */}
          <div className="border-t border-[#2a2d33]/50 pt-2 flex flex-col gap-1 text-[9.5px] font-mono">
            <div className="flex justify-between">
              <span className="text-[#8E9299]">POWER PER MACHINE:</span>
              <span className="text-white font-bold">{Number(machinePowerPerMachine.toFixed(2))} MW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E9299]">TOTAL ARRAY POWER:</span>
              <span className="text-orange-400 font-bold">{Number(totalPower.toFixed(2))} MW</span>
            </div>
          </div>

          {/* Logistics recommendation */}
          <div className="border-t border-[#2a2d33]/40 pt-2 text-[8px] font-mono text-[#8E9299] leading-tight">
            ℹ️ Recommended logistics stream capacity for output: {Number((outputRatePerMachine * machineCount).toFixed(1))}/min
          </div>

        </div>
      </div>
    </div>
  );
});
