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
  let sY = sourceY;
  let tY = targetY;

  const totalSplits = data?.totalSplits as number | undefined;
  const splitIndex = data?.splitIndex as number | undefined;

  if (totalSplits && totalSplits > 1 && typeof splitIndex === 'number') {
    const offsetDistance = 24; // Elegant 24px vertical spacing between parallel belts
    const offset = (splitIndex - (totalSplits - 1) / 2) * offsetDistance;
    sY += offset;
    tY += offset;
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY: sY,
    sourcePosition,
    targetX,
    targetY: tY,
    targetPosition,
    borderRadius: 0,
  });

  const isOverloaded = !!data?.isOverloaded;
  const isFluid = !!data?.isFluid;
  const flowRate = data?.rate as number || 0;

  // Animation duration inversely proportional to flow
  const duration = isOverloaded ? 0.4 : Math.max(0.6, 3 / (flowRate / 60 + 0.5));

  // Belts = slate, solid; Pipes (fluids/gases) = cyan, flowing dashes. Overload = red for both.
  const baseStroke = isOverloaded ? '#ef4444' : isFluid ? '#0891b2' : '#64748b';
  const flowStroke = isOverloaded ? '#fecaca' : isFluid ? '#67e8f9' : '#cbd5e1';
  // Pipes get longer dashes (continuous fluid), belts get short dots (discrete items).
  const flowDashArray = isFluid ? '10, 8' : '4, 16';

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: baseStroke,
          strokeWidth: isOverloaded ? 4 : 3,
          transition: 'stroke 0.3s, stroke-width 0.3s'
        }}
      />

      {/* Moving flow animation — keyframe is in index.css */}
      <path
        d={edgePath}
        fill="none"
        stroke={flowStroke}
        strokeWidth={2}
        strokeDasharray={flowDashArray}
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
            <div
                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold shadow-sm flex items-center gap-1.5 ${
                    isOverloaded
                    ? 'bg-[#7f1d1d] text-white border-[#ef4444]'
                    : isFluid
                    ? 'bg-[#0c2a33] text-[#cffafe] border-[#0e7490]'
                    : 'bg-[#151619] text-[#e5e7eb] border-[#374151]'
                }`}
            >
              {isFluid && (
                <span title="Pipe (fluid)" className="shrink-0" style={{ color: '#67e8f9' }}>
                  <svg width="9" height="11" viewBox="0 0 9 11" fill="currentColor" aria-hidden="true">
                    <path d="M4.5 0C4.5 0 0 5 0 7.5A4.5 4.5 0 0 0 9 7.5C9 5 4.5 0 4.5 0Z" />
                  </svg>
                </span>
              )}
              {data?.itemImageUrl && (
                <AppImage 
                  idKey={undefined}
                  fallbackUrl={data.itemImageUrl as string}
                  className="w-4 h-4 object-contain shrink-0" 
                  alt="Item" 
                />)}
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
});
