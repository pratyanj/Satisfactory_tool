import React, { useState } from 'react';
import { NodeProps, NodeResizer, NodeToolbar, useReactFlow, Position } from '@xyflow/react';

const COLORS = [
  '#243142', // Default blue-ish
  '#422424', // Red
  '#24422e', // Green
  '#423924', // Yellow/Orange
  '#3d2442', // Purple
];

export function GroupNode({ id, selected, data }: NodeProps) {
  const { setNodes } = useReactFlow();
  const color = (data.color as string) || COLORS[0];

  const changeColor = (newColor: string) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, color: newColor } };
      }
      return n;
    }));
  };

  return (
    <div 
      className="w-full h-full border-2 border-dashed rounded-xl shadow-lg relative min-w-[100px] min-h-[100px] transition-colors group"
      style={{ backgroundColor: `${color}33`, borderColor: `${color}80` }}
    >
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div className="flex gap-1 p-1 bg-[#151619] border border-[#2a2d33] rounded-lg shadow-lg">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => changeColor(c)}
              className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </NodeToolbar>
      
      <NodeResizer 
        lineStyle={{ borderWidth: 2, borderColor: '#3b82f6' }}
        handleStyle={{ width: 8, height: 8, backgroundColor: '#3b82f6', border: 'none', borderRadius: '50%' }}
        isVisible={selected}
        minWidth={100}
        minHeight={100}
      />
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none">
        <span className="text-white font-bold text-4xl uppercase tracking-widest pointer-events-none opacity-50">{data.label ? String(data.label) : 'GROUP'}</span>

      </div>
    </div>
  );
}
