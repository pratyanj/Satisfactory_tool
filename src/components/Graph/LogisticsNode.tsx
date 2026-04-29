import { Handle, Position, useReactFlow, NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import React, { useEffect } from 'react';

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
      className="bg-[#151619] border border-[#4a4d53] rounded-lg shadow-md flex flex-col items-center justify-center p-1 w-[48px] h-[48px] relative cursor-pointer hover:border-gray-300 transition-colors"
      onClick={toggleFlip}
      title="Click to flip"
    >
      <Handle id={isFlipped ? "right" : "left"} type="target" position={isFlipped ? Position.Right : Position.Left} className={`w-2 h-2 bg-blue-500 border-none ${isFlipped ? '-right-1' : '-left-1'}`} />
      <Handle id="top" type={isSplitter ? 'source' : 'target'} position={Position.Top} className="w-2 h-2 bg-purple-500 border-none -top-1" />
      <Handle id="bottom" type={isSplitter ? 'source' : 'target'} position={Position.Bottom} className="w-2 h-2 bg-purple-500 border-none -bottom-1" />
      <img src={`https://wsrv.nl/?url=${encodeURIComponent(imgUrl)}&w=64&output=webp&maxage=30d`} crossOrigin="anonymous" alt={data.type as string} className="w-full h-full object-contain drop-shadow-md" loading="lazy" />
      <Handle id={isFlipped ? "left" : "right"} type="source" position={isFlipped ? Position.Left : Position.Right} className={`w-2 h-2 bg-orange-500 border-none ${isFlipped ? '-left-1' : '-right-1'}`} />
      <div className="absolute top-[54px] left-1/2 -translate-x-1/2 bg-[#1c1e22] text-[#8E9299] text-[10px] px-1.5 py-0.5 rounded border border-[#2a2d33] whitespace-nowrap font-mono shadow-sm">
        {(data.rate as number).toFixed(1)}/min
      </div>
    </div>
  );
});
