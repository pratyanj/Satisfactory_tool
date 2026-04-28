import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

export function SatisfactoryEdge({
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
    borderRadius: 20,
  });

  const isOverloaded = !!data?.isOverloaded;
  const flowRate = data?.rate as number || 0;
  
  // Animation duration inversely proportional to flow
  const duration = isOverloaded ? 0.4 : Math.max(0.6, 3 / (flowRate / 60 + 0.5));

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: isOverloaded ? '#ef4444' : '#64748b',
          strokeWidth: isOverloaded ? 4 : 3,
          transition: 'stroke 0.3s, stroke-width 0.3s'
        }} 
      />
      
      {/* Moving dots animation */}
      <path
        d={edgePath}
        fill="none"
        stroke={isOverloaded ? '#fecaca' : '#cbd5e1'}
        strokeWidth={2}
        strokeDasharray="4, 16"
        strokeLinecap="round"
        style={{
          animation: `dash ${duration}s linear infinite`,
          opacity: 0.8
        }}
      />

      <style>{`
        @keyframes dash {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>

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
            <div 
                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold shadow-sm flex items-center gap-1.5 ${
                    isOverloaded 
                    ? 'bg-[#7f1d1d] text-white border-[#ef4444]' 
                    : 'bg-[#151619] text-[#e5e7eb] border-[#374151]'
                }`}
            >
              {data?.itemImageUrl && (
                <img 
                    src={`https://wsrv.nl/?url=${encodeURIComponent(data.itemImageUrl as string)}&w=32&output=webp`} 
                    alt="item" 
                    className="w-3 h-3 object-contain"
                />
              )}
              {label}
            </div>
            {isOverloaded && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] px-1 rounded font-bold animate-bounce whitespace-nowrap">
                    OVERLOADED
                </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
