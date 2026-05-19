import { Background, BackgroundVariant, Controls, ReactFlow, useEdgesState, useNodesState, Panel, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useCallback, useState } from 'react';
import { Edge, Node } from '@xyflow/react';
import { MachineNode } from './MachineNode';
import { LogisticsNode } from './LogisticsNode';
import { GroupNode } from './GroupNode';
import { SatisfactoryEdge } from './SatisfactoryEdge';
import { toPng, toSvg } from 'html-to-image';
import { MousePointer2, Plus, Ungroup, Hand, Download, WandSparkles, SplitSquareHorizontal } from 'lucide-react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '250',
  'elk.spacing.nodeNode': '30',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
};

interface FactoryGraphProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  beltId?: string;
}

const nodeTypes = {
  machine: MachineNode,
  logistics: LogisticsNode,
  customGroup: GroupNode,
};

const edgeTypes = {
  satisfactory: SatisfactoryEdge,
};

// ─── Toolbar (cleaned up — no more dead code) ───────────────────────────────

function TopToolbar({ nodes, setNodes, selectionMode, setSelectionMode, onExpand, onLayout }: {
  nodes: Node[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  selectionMode: boolean,
  setSelectionMode: (v: boolean) => void,
  onExpand: () => void,
  onLayout: () => void
}) {
  const { getNodesBounds, getNodes: rfGetNodes } = useReactFlow();
  const [isExporting, setIsExporting] = useState(false);

  const selectedNodes = nodes.filter(n => n.selected && n.type !== 'customGroup');
  const selectedGroups = nodes.filter(n => n.selected && n.type === 'customGroup');

  const onExport = (format: 'png' | 'svg') => {
    setIsExporting(true);
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) { setIsExporting(false); return; }
    const currentNodes = rfGetNodes();
    if (currentNodes.length === 0) { setIsExporting(false); return; }

    const bounds = getNodesBounds(currentNodes);
    const padding = 100;
    const imageWidth = bounds.width + padding * 2;
    const imageHeight = bounds.height + padding * 2;
    const exportFn = format === 'svg' ? toSvg : toPng;
    const exportConfig = {
      width: imageWidth, height: imageHeight, pixelRatio: 3, cacheBust: true,
      style: {
        width: `${imageWidth}px`, height: `${imageHeight}px`,
        transform: `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px) scale(1)`,
        backgroundImage: 'none', backgroundColor: '#101114',
      },
    };

    exportFn(viewportElement, exportConfig)
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.setAttribute('download', `factory-plan.${format}`);
        a.setAttribute('href', dataUrl);
        a.click();
        setIsExporting(false);
      })
      .catch(() => {
        exportFn(viewportElement, {
          ...exportConfig,
          filter: (node) => !(node instanceof HTMLElement && node.tagName === 'IMG'),
        })
          .then((dataUrl2) => {
            const a = document.createElement('a');
            a.setAttribute('download', `factory-plan-fallback.${format}`);
            a.setAttribute('href', dataUrl2);
            a.click();
            setIsExporting(false);
          })
          .catch(() => {
            alert('Export failed. Try taking a screenshot instead.');
            setIsExporting(false);
          });
      });
  };

  const handleGroup = () => {
    if (selectedNodes.length < 2) return;
    const bounds = getNodesBounds(selectedNodes);
    const pad = 40;
    const groupId = `group-${Date.now()}`;
    const newGroupNode: Node = {
      id: groupId, type: 'customGroup',
      position: { x: bounds.x - pad, y: bounds.y - pad },
      style: { width: bounds.width + pad * 2, height: bounds.height + pad * 2 },
      data: {}, zIndex: -1,
    };
    setNodes(nds => {
      const nextNodes = nds.map(n => {
        if (n.selected && n.type !== 'customGroup') {
          return { ...n, parentId: groupId, extent: 'parent' as const, position: { x: n.position.x - (bounds.x - pad), y: n.position.y - (bounds.y - pad) }, selected: false } as Node;
        }
        return n;
      });
      return [newGroupNode, ...nextNodes];
    });
  };

  const handleUngroup = () => {
    if (selectedGroups.length === 0) return;
    const groupIds = new Set(selectedGroups.map(g => g.id));
    setNodes(nds => {
      const groupPosMap = new Map<string, { x: number; y: number }>(nds.filter(n => groupIds.has(n.id)).map(g => [g.id, g.position]));
      return nds.filter(n => !groupIds.has(n.id)).map(n => {
        if (n.parentId && groupIds.has(n.parentId)) {
          const pPos = groupPosMap.get(n.parentId) || { x: 0, y: 0 };
          const { parentId, extent, ...rest } = n;
          return { ...rest, parentId: undefined, extent: undefined, position: { x: n.position.x + pPos.x, y: n.position.y + pPos.y }, selected: false } as Node;
        }
        return n;
      });
    });
  };

  return (
    <Panel position="top-left" className="flex items-center gap-2 bg-[#151619]/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-[#2a2d33] pointer-events-auto">
      <div className="flex bg-[#101114] p-0.5 rounded-lg border border-[#2a2d33]">
        <button onClick={() => setSelectionMode(false)} className={`p-2 rounded-md transition-colors ${!selectionMode ? 'bg-[#243142] text-blue-400' : 'text-[#8E9299] hover:text-white hover:bg-[#1c1e22]'}`} title="Pan & Move"><Hand className="w-4 h-4" /></button>
        <button onClick={() => setSelectionMode(true)} className={`p-2 rounded-md transition-colors ${selectionMode ? 'bg-[#243142] text-blue-400' : 'text-[#8E9299] hover:text-white hover:bg-[#1c1e22]'}`} title="Select Multiple"><MousePointer2 className="w-4 h-4" /></button>
      </div>

      <div className="w-[1px] h-6 bg-[#2a2d33] mx-1" />

      {selectedNodes.length === 1 && selectedNodes[0].type === 'machine' && (selectedNodes[0].data.machines as number) > 1 && (
        <button onClick={onExpand} className="flex items-center gap-1.5 bg-[#4B2F83] hover:bg-[#5a3a9e] border border-[#6d4cb8] transition-all text-white px-3 py-1.5 rounded-lg text-xs font-semibold mr-1" title="Expand Array"><SplitSquareHorizontal className="w-4 h-4" /> Expand Array</button>
      )}

      {selectedNodes.length > 1 && (
        <button onClick={handleGroup} className="flex items-center gap-1.5 bg-[#243142] hover:bg-[#324559] border border-[#415a78] transition-all text-white px-3 py-1.5 rounded-lg text-xs font-semibold" title="Group Selected"><Plus className="w-4 h-4" /> Group</button>
      )}

      {selectedGroups.length > 0 && (
        <button onClick={handleUngroup} className="flex items-center gap-1.5 bg-[#422424] hover:bg-[#593232] border border-[#784141] transition-all text-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold" title="Ungroup Selected"><Ungroup className="w-4 h-4" /> Ungroup</button>
      )}

      {(selectedNodes.length <= 1 && selectedGroups.length === 0) && (
        <div className="flex gap-1">
          <button disabled={isExporting} className="flex items-center gap-1.5 bg-[#4B2F83] hover:bg-[#5a3a9e] border border-[#6d4cb8] transition-all text-white px-3 py-1.5 rounded-lg text-xs font-semibold mr-2" onClick={onLayout} title="Auto-group & layout"><WandSparkles className="w-4 h-4 text-[#e0d6f6]" /> AI Design Layout</button>
          <button disabled={isExporting} className="flex items-center gap-1.5 bg-[#1c1e22] hover:bg-[#243142] border border-[#2a2d33] hover:border-[#415a78] transition-all text-[#8E9299] hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" onClick={() => onExport('png')}><Download className="w-4 h-4" /> PNG</button>
          <button disabled={isExporting} className="flex items-center gap-1.5 bg-[#1c1e22] hover:bg-[#243142] border border-[#2a2d33] hover:border-[#415a78] transition-all text-[#8E9299] hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" onClick={() => onExport('svg')}><Download className="w-4 h-4" /> SVG</button>
        </div>
      )}
    </Panel>
  );
}

// ─── Public wrapper ─────────────────────────────────────────────────────────

export function FactoryGraph(props: FactoryGraphProps) {
  return (
    <ReactFlowProvider>
      <FactoryGraphInner {...props} />
    </ReactFlowProvider>
  );
}

// ─── Inner graph (single source of truth for useReactFlow) ──────────────────

function FactoryGraphInner({ initialNodes, initialEdges, beltId = 'mk1' }: FactoryGraphProps) {
  const { getNodes, getEdges, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

  const beltCapacity = beltId === 'mk1' ? 60 : beltId === 'mk2' ? 120 : beltId === 'mk3' ? 270 : beltId === 'mk4' ? 480 : 780;

  // ── Expand a machine array into individual machines ──
  const handleExpandNode = useCallback((targetNodeId: string) => {
    const currentNodes = getNodes();
    const node = currentNodes.find(n => n.id === targetNodeId);
    if (!node || node.type !== 'machine') return;

    const machinesCount = node.data.machines as number;
    if (machinesCount <= 1) return;

    const totalNodes = Math.ceil(machinesCount);
    const ratePerMachine = (node.data.rate as number) / machinesCount;
    const itemImageUrl = node.data.itemImageUrl as string;

    const groupId = `group-exp-${Date.now()}`;
    const groupWidth = 600;
    const groupHeight = Math.max(250, 100 + totalNodes * 120);

    const newGroupNode: Node = {
      id: groupId, type: 'customGroup',
      position: { x: node.position.x, y: node.position.y },
      style: { width: groupWidth, height: groupHeight },
      data: { color: '#243142', label: `${node.data.item} Array` },
      zIndex: -1,
    };

    const newNodes: Node[] = [newGroupNode];
    const newEdges: Edge[] = [];

    const createSatEdge = (id: string, source: string, target: string, rate: number, extras: any = {}) => ({
      id, source, target, type: 'satisfactory',
      label: `${rate.toFixed(1)}/min`,
      data: { rate, isOverloaded: rate > beltCapacity, itemImageUrl },
      ...extras,
    });

    const createdMachines: string[] = [];
    for (let i = 0; i < totalNodes; i++) {
      const mNodeId = `${node.id}-m${i}`;
      const isLast = i === totalNodes - 1;
      const count = (isLast && machinesCount % 1 !== 0) ? (machinesCount % 1) : 1;
      createdMachines.push(mNodeId);
      newNodes.push({
        id: mNodeId, type: 'machine', parentId: groupId, extent: 'parent',
        position: { x: 150, y: 70 + i * 115 },
        data: { ...node.data, label: node.data.label?.toString().replace(/ x\d+(\.\d+)?$/, '').trim() || 'Machine', machines: count, rate: ratePerMachine * count },
      });
    }

    const currentEdges = getEdges();
    const incomingEdges = currentEdges.filter(e => e.target === node.id);
    const outgoingEdges = currentEdges.filter(e => e.source === node.id);

    // Build splitter chain for inputs
    let firstSplitterId: string | null = null;
    if (incomingEdges.length > 0) {
      if (totalNodes === 1) {
        firstSplitterId = createdMachines[0];
      } else {
        let prevMainBelt: string | null = null;
        const totalIncomingRate = incomingEdges.reduce((acc, e) => acc + (parseFloat(e.label?.toString() || '0') || 0), 0);
        let remainingRate = totalIncomingRate;
        for (let i = 0; i < totalNodes - 1; i++) {
          const splitterId = `${node.id}-splt-${i}`;
          if (i === 0) firstSplitterId = splitterId;
          newNodes.push({ id: splitterId, type: 'logistics', parentId: groupId, extent: 'parent', position: { x: 40, y: 70 + i * 115 }, data: { type: 'splitter', rate: remainingRate } });
          const mId = createdMachines[i];
          const mCount = newNodes.find(n => n.id === mId)?.data.machines as number || 1;
          const neededRate = ratePerMachine * mCount;
          if (prevMainBelt) newEdges.push(createSatEdge(`e-${prevMainBelt}-${splitterId}`, prevMainBelt, splitterId, remainingRate));
          newEdges.push(createSatEdge(`e-${splitterId}-${mId}`, splitterId, mId, neededRate, { sourceHandle: 'right' }));
          prevMainBelt = splitterId;
          remainingRate -= neededRate;
          if (i === totalNodes - 2) {
            const lastMId = createdMachines[totalNodes - 1];
            const lastMCount = newNodes.find(n => n.id === lastMId)?.data.machines as number || 1;
            newEdges.push(createSatEdge(`e-${splitterId}-${lastMId}`, splitterId, lastMId, ratePerMachine * lastMCount, { sourceHandle: 'bottom' }));
          }
        }
      }
    }

    // Build merger chain for outputs
    let lastMergerId: string | null = null;
    if (outgoingEdges.length > 0) {
      if (totalNodes === 1) {
        lastMergerId = createdMachines[0];
      } else {
        let prevMainBelt: string | null = null;
        let accumulatedRate = 0;
        for (let i = 0; i < totalNodes - 1; i++) {
          const mergerId = `${node.id}-mrg-${i}`;
          const m2Id = createdMachines[i + 1];
          const count2 = newNodes.find(n => n.id === m2Id)?.data.machines as number || 1;
          const rate2 = ratePerMachine * count2;
          if (i === 0) {
            const m1Id = createdMachines[0];
            const count1 = newNodes.find(n => n.id === m1Id)?.data.machines as number || 1;
            accumulatedRate = ratePerMachine * count1 + rate2;
            newNodes.push({ id: mergerId, type: 'logistics', parentId: groupId, extent: 'parent', position: { x: 480, y: 70 + 115 }, data: { type: 'merger', rate: accumulatedRate, isFlipped: true } });
            newEdges.push(createSatEdge(`e-${m1Id}-${mergerId}`, m1Id, mergerId, ratePerMachine * count1, { targetHandle: 'top' }));
          } else {
            accumulatedRate += rate2;
            newNodes.push({ id: mergerId, type: 'logistics', parentId: groupId, extent: 'parent', position: { x: 480, y: 70 + (i + 1) * 115 }, data: { type: 'merger', rate: accumulatedRate, isFlipped: true } });
            if (prevMainBelt) newEdges.push(createSatEdge(`e-${prevMainBelt}-${mergerId}`, prevMainBelt, mergerId, accumulatedRate - rate2, { targetHandle: 'top' }));
          }
          newEdges.push(createSatEdge(`e-${m2Id}-${mergerId}`, m2Id, mergerId, rate2, { targetHandle: 'right' }));
          prevMainBelt = mergerId;
          if (i === totalNodes - 2) lastMergerId = mergerId;
        }
      }
    }

    setNodes(nds => [...nds.filter(n => n.id !== node.id), ...newNodes]);
    setEdges(eds => eds.map(e => {
      if (e.target === node.id && firstSplitterId) return { ...e, target: firstSplitterId };
      if (e.source === node.id && lastMergerId) return { ...e, source: lastMergerId };
      return e;
    }).concat(newEdges));
  }, [getNodes, getEdges, setNodes, setEdges, beltCapacity]);

  // ── AI Layout (ELK) ──
  const applyAILayout = async () => {
    let currentNodes: Node[] = getNodes().filter(n => n.type !== 'customGroup').map(n => {
      const { parentId, extent, ...rest } = n;
      return rest as Node;
    });

    const groupsMap = new Map<string, Node[]>();
    currentNodes.forEach(n => {
      if (n.type === 'machine' && n.data?.itemId) {
        const itemId = n.data.itemId as string;
        if (!groupsMap.has(itemId)) groupsMap.set(itemId, []);
        groupsMap.get(itemId)?.push(n);
      }
    });

    const newGroups: Node[] = [];
    const COLORS = ['#243142', '#422424', '#24422e', '#423924', '#3d2442'];
    let colorIdx = 0;
    groupsMap.forEach((machines, itemId) => {
      if (machines.length > 1) {
        const groupId = `group-${itemId}`;
        machines.forEach(m => { m.parentId = groupId; });
        newGroups.push({ id: groupId, type: 'customGroup', position: { x: 0, y: 0 }, data: { color: COLORS[colorIdx % COLORS.length], label: String(machines[0].data?.item || itemId) }, style: { width: 100, height: 100 }, zIndex: -1 });
        colorIdx++;
      }
    });

    currentNodes = [...newGroups, ...currentNodes];
    const rootChildren: any[] = [];
    const childrenMap = new Map<string, any[]>();
    newGroups.forEach(g => childrenMap.set(g.id, []));

    currentNodes.forEach(n => {
      let w = 320, h = 160;
      if (n.type === 'logistics') { w = 48; h = 48; }
      else if (n.type === 'customGroup') { w = 100; h = 100; }
      const elkNode = { id: n.id, width: w, height: h, layoutOptions: n.type === 'customGroup' ? { 'elk.padding': '[top=40,left=20,bottom=20,right=20]' } : undefined };
      if ((n as Node).parentId) {
        if (!childrenMap.has(n.parentId!)) childrenMap.set(n.parentId!, []);
        childrenMap.get(n.parentId!)!.push(elkNode);
      } else if (n.type !== 'customGroup') {
        rootChildren.push(elkNode);
      }
    });

    newGroups.forEach(g => {
      rootChildren.push({ id: g.id, layoutOptions: { 'elk.padding': '[top=40,left=20,bottom=20,right=20]', 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT' }, children: childrenMap.get(g.id) || [] });
    });

    const graph = { id: 'root', layoutOptions, children: rootChildren, edges: getEdges().map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })) };

    try {
      const layoutedGraph = await elk.layout(graph as any);
      const flattenNodes = (elkNodes: any[], arr: any[] = []) => {
        elkNodes.forEach(n => { arr.push({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height }); if (n.children) flattenNodes(n.children, arr); });
        return arr;
      };
      const elkNodeMap = new Map();
      flattenNodes(layoutedGraph.children || []).forEach(n => elkNodeMap.set(n.id, n));
      currentNodes = currentNodes.map(n => {
        const en = elkNodeMap.get(n.id);
        if (!en) return n;
        if (n.type === 'customGroup') return { ...n, position: { x: en.x, y: en.y }, style: { width: en.width, height: en.height } };
        return { ...n, position: { x: en.x, y: en.y }, extent: n.parentId ? 'parent' : undefined };
      });
      setNodes(currentNodes);
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 50);
    } catch (e) {
      console.error("ELK Layout error:", e);
    }
  };

  // ── Event listeners ──
  useEffect(() => {
    const onExpandCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId) handleExpandNode(detail.nodeId);
    };
    window.addEventListener('expand-machine-array', onExpandCustom);
    return () => window.removeEventListener('expand-machine-array', onExpandCustom);
  }, [handleExpandNode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'h') setSelectionMode(false);
      else if (e.key.toLowerCase() === 'v') setSelectionMode(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    
    // Auto-center the graph after nodes are updated
    setTimeout(() => {
      window.requestAnimationFrame(() => {
        fitView({ duration: 800, padding: 0.2 });
      });
    }, 50);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  // ── Click-to-highlight logic ──
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!selectionMode && node.type !== 'customGroup') {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    }
  }, [selectedNodeId, selectionMode]);

  useEffect(() => {
    if (!selectedNodeId) {
      setNodes(nds => nds.map(n => ({ ...n, style: { ...n.style, opacity: 1 } })));
      setEdges(eds => eds.map(e => ({ ...e, animated: true, style: { ...e.style, stroke: undefined, strokeWidth: undefined } })));
      return;
    }

    setEdges(eds => {
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(selectedNodeId);
      const highlightedEdges = new Set<string>();

      // BFS upstream
      let queue = [selectedNodeId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        eds.forEach(edge => {
          if (edge.target === current) { highlightedEdges.add(edge.id); if (!connectedNodeIds.has(edge.source)) { connectedNodeIds.add(edge.source); queue.push(edge.source); } }
        });
      }
      // BFS downstream
      queue = [selectedNodeId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        eds.forEach(edge => {
          if (edge.source === current) { highlightedEdges.add(edge.id); if (!connectedNodeIds.has(edge.target)) { connectedNodeIds.add(edge.target); queue.push(edge.target); } }
        });
      }

      setNodes(nds => nds.map(n => ({ ...n, style: { ...n.style, opacity: (connectedNodeIds.has(n.id) || n.type === 'customGroup') ? 1 : 0.3 } })));

      return eds.map(e => {
        const isHighlighted = highlightedEdges.has(e.id);
        return {
          ...e, animated: isHighlighted,
          style: isHighlighted ? { ...e.style, stroke: '#ff9000', strokeWidth: 5 } : { ...e.style, stroke: 'rgba(255,255,255, 0.1)', strokeWidth: 2 },
        };
      });
    });
  }, [selectedNodeId, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-[#101114] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        colorMode="dark"
        panOnDrag={!selectionMode}
        selectionOnDrag={selectionMode}
        selectionMode={selectionMode ? 'partial' : 'full'}
        onlyRenderVisibleElements
      >
        <Background variant={BackgroundVariant.Lines} gap={40} color="rgba(255,255,255,0.15)" />
        <Controls className="bg-[#151619] fill-current text-[#8E9299] border-none shadow-md" />
        <TopToolbar
          nodes={nodes}
          setNodes={setNodes}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          onExpand={() => {
            const selected = nodes.find(n => n.selected && n.type === 'machine');
            if (selected) handleExpandNode(selected.id);
          }}
          onLayout={applyAILayout}
        />
      </ReactFlow>
    </div>
  );
}
