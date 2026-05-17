import React from 'react';

import {
  ReactFlow,
  Background,
  BackgroundVariant,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { MachineNode } from '../Graph/MachineNode';
import { LogisticsNode } from '../Graph/LogisticsNode';
import { GroupNode } from '../Graph/GroupNode';
import { SatisfactoryEdge } from '../Graph/SatisfactoryEdge';

const nodeTypes = {
  machine: MachineNode,
  logistics: LogisticsNode,
  customGroup: GroupNode,
};

const edgeTypes = {
  satisfactory: SatisfactoryEdge,
};

interface Props {
  nodes: any[];
  edges: any[];
}

export function ExportGraphRenderer({
  nodes,
  edges,
}: Props) {
  return (
    <div
      style={{
        width: '2400px',
        height: '1400px',
        background: '#101114',
        position: 'relative',
      }}
    >
      {/* FRAME */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '24px solid #1f2328',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />

      {/* WATERMARK */}
      <div
        style={{
          position: 'absolute',
          right: 32,
          bottom: 32,
          zIndex: 100,
          color: '#f97316',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '0.2em',
        }}
      >
        SATISFACTORY TOOL
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#222"
        />
      </ReactFlow>
    </div>
  );
}
