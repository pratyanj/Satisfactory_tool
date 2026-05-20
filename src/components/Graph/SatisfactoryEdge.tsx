import React from 'react';
import { AppImage } from '../AppImage';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

export const SatisfactoryEdge = React.memo(function SatisfactoryEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  const isOverloaded = !!data?.isOverloaded;
  const flowRate = data?.rate as number || 0;
  
  const isFluid = data?.itemId === 'water' || 
                  data?.itemId === 'crude_oil' || 
                  data?.itemId === 'heavy_oil_residue' || 
                  data?.itemId === 'fuel' || 
                  data?.itemId === 'liquid_biofuel' || 
                  data?.itemId === 'turbofuel' || 
                  data?.itemId === 'alumina_solution' || 
                  data?.itemId === 'sulfuric_acid' || 
                  data?.itemId === 'nitric_acid' || 
                  data?.itemId === 'nitrogen_gas';

  // Animation speed/duration inversely proportional to flow rate
  const duration = isOverloaded ? 0.4 : Math.max(0.6, 3 / (flowRate / 60 + 0.5));

  // Determine path stroke colors
  let strokeColor = '#f48721'; // Standard FICSIT orange
  let flowDotColor = '#ffedd5';
  
  if (isOverloaded) {
    strokeColor = '#ef4444'; // Red for overloaded
    flowDotColor = '#fecaca';
  } else if (isFluid) {
    strokeColor = '#06b6d4'; // Cyan/blue for liquids
    flowDotColor = '#a5f3fc';
  }

  // Label badge tailwind styling based on flow state
  let badgeClass = 'bg-[#131417] text-[#f48721] border-[#f48721] shadow-[0_0_10px_rgba(244,135,33,0.25)]';
  if (isOverloaded) {
    badgeClass = 'bg-[#1a0a0a] text-[#ef4444] border-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.35)] animate-pulse';
  } else if (isFluid) {
    badgeClass = 'bg-[#0a1519] text-[#06b6d4] border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.25)]';
  }

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: strokeColor,
          strokeWidth: isOverloaded ? 4 : 2.5,
          transition: 'stroke 0.3s, stroke-width 0.3s'
        }} 
      />
      
      {/* Moving conveyor dots flow animation */}
      <path
        d={edgePath}
        fill="none"
        stroke={flowDotColor}
        strokeWidth={1.5}
        strokeDasharray="4, 14"
        strokeLinecap="round"
        style={{
          animation: `dash ${duration}s linear infinite`,
          opacity: 0.8
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-1.5 ${badgeClass}`}>
              {data?.itemImageUrl && (
                <AppImage 
                  idKey={undefined}
                  fallbackUrl={data.itemImageUrl as string}
                  className="w-3.5 h-3.5 object-contain shrink-0" 
                  alt="Item" 
                />
              )}
              <span>{label}</span>
              {isOverloaded && <span className="text-[10px] leading-none text-red-500">⚠</span>}
            </div>
            {isOverloaded && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] px-1 rounded font-bold animate-bounce whitespace-nowrap tracking-wider font-mono">
                OVERLOADED
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
