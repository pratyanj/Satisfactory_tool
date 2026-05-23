import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import React, { useEffect } from 'react';
import { AppImage } from '../AppImage';

export const LogisticsNode = React.memo(function LogisticsNode({ id, data }: NodeProps) {
  const isSplitter = data.type === 'splitter';
  const imgUrl = isSplitter 
    ? "https://satisfactory.wiki.gg/wiki/Special:FilePath/Conveyor_Splitter.png"
    : "https://satisfactory.wiki.gg/wiki/Special:FilePath/Conveyor_Merger.png";
    
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
    <div 
      className="bg-[#151619] border border-[#4a4d53] rounded-lg shadow-md flex flex-col items-center justify-center p-1 w-[48px] h-[48px] relative cursor-pointer hover:border-[#ff9000] transition-colors group"
      title={`${isSplitter ? 'Splitter' : 'Merger'} - Click to highlight flow path`}
    >
      {/* Primary Input (Left / Right if flipped) */}
      <Handle id={isFlipped ? "right" : "left"} type="target" position={isFlipped ? Position.Right : Position.Left} className={`w-2 h-2 bg-blue-500 border-none ${isFlipped ? '-right-1' : '-left-1'}`} />
      <Handle id={isFlipped ? "right" : "left"} type="source" position={isFlipped ? Position.Right : Position.Left} className="w-2 h-2 opacity-0" />
      
      {/* Top Handle */}
      <Handle id="top" type="target" position={Position.Top} className="w-2 h-2 bg-purple-500 border-none -top-1" />
      <Handle id="top" type="source" position={Position.Top} className="w-2 h-2 opacity-0 -top-1" />
      
      {/* Bottom Handle */}
      <Handle id="bottom" type="target" position={Position.Bottom} className="w-2 h-2 bg-purple-500 border-none -bottom-1" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="w-2 h-2 opacity-0 -bottom-1" />
      
      <AppImage idKey={undefined} fallbackUrl={imgUrl} alt={data.type as string} className="w-full h-full object-contain drop-shadow-md select-none pointer-events-none" />

      {/* Primary Output (Right / Left if flipped) */}
      <Handle id={isFlipped ? "left" : "right"} type="source" position={isFlipped ? Position.Left : Position.Right} className={`w-2 h-2 bg-orange-500 border-none ${isFlipped ? '-left-1' : '-right-1'}`} />
      <Handle id={isFlipped ? "left" : "right"} type="target" position={isFlipped ? Position.Left : Position.Right} className="w-2 h-2 opacity-0" />
      
      {/* Premium Micro-Flip Button */}
      <button
        onClick={toggleFlip}
        className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-[#151619] hover:bg-[#ff9000] border border-[#4a4d53] hover:border-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer z-50 text-gray-400 hover:text-white shadow-lg"
        title={`Flip ${isSplitter ? 'Splitter' : 'Merger'} Direction`}
      >
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 7L3 12l5 5M16 17l5-5-5-5M3 12h18" />
        </svg>
      </button>

      <div className="absolute top-[54px] left-1/2 -translate-x-1/2 bg-[#1c1e22] text-[#8E9299] text-[10px] px-1.5 py-0.5 rounded border border-[#2a2d33] whitespace-nowrap font-mono shadow-sm select-none pointer-events-none">
        {(data.rate as number).toFixed(1)}/min
      </div>
    </div>
  );
});
