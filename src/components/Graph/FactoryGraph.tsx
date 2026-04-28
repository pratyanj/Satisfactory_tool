import { Background, BackgroundVariant, Controls, ReactFlow, useEdgesState, useNodesState, Panel, useReactFlow, getViewportForBounds } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useCallback, useState } from 'react';
import { Edge, Node } from '@xyflow/react';
import { MachineNode } from './MachineNode';
import { LogisticsNode } from './LogisticsNode';
import { GroupNode } from './GroupNode';
import { toPng, toSvg } from 'html-to-image';
import { MousePointer2, Plus, Ungroup, Hand, Download, WandSparkles, SplitSquareHorizontal } from 'lucide-react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

// Layout configuration for Tiered Swimlane (Layered) pattern
const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '250', // Wide gaps between tiers (swimlanes)
  'elk.spacing.nodeNode': '30', // tighter vertical packing within standard tiers
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX', // ensures clear topological tiers
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
};

interface FactoryGraphProps {
  initialNodes: Node[];
  initialEdges: Edge[];
}

const nodeTypes = {
  machine: MachineNode,
  logistics: LogisticsNode,
  customGroup: GroupNode,
};

function TopToolbar({ nodes, edges, setNodes, selectionMode, setSelectionMode }: { nodes: Node[], edges: Edge[], setNodes: React.Dispatch<React.SetStateAction<Node[]>>, selectionMode: boolean, setSelectionMode: (v: boolean) => void }) {
  const { getNodes, getEdges, setNodes: setRFNodes, setEdges: setRFEdges, getNodesBounds, fitView } = useReactFlow();
  const [isExporting, setIsExporting] = useState(false);

  const selectedNodes = nodes.filter(n => n.selected && n.type !== 'customGroup');
  const selectedGroups = nodes.filter(n => n.selected && n.type === 'customGroup');

  const onExport = (format: 'png' | 'svg') => {
    setIsExporting(true);
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) {
      setIsExporting(false);
      return;
    }

    const currentNodes = getNodes();
    if (currentNodes.length === 0) {
      setIsExporting(false);
      return;
    }

    const bounds = getNodesBounds(currentNodes);
    const padding = 100;
    const imageWidth = bounds.width + padding * 2;
    const imageHeight = bounds.height + padding * 2;
    const transformX = -bounds.x + padding;
    const transformY = -bounds.y + padding;

    const exportFn = format === 'svg' ? toSvg : toPng;
    const exportConfig = {
      width: imageWidth,
      height: imageHeight,
      pixelRatio: 3,
      cacheBust: true,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${transformX}px, ${transformY}px) scale(1)`,
        backgroundImage: 'none',
        backgroundColor: '#101114',
      },
    };

    exportFn(viewportElement, exportConfig).then((dataUrl) => {
      const a = document.createElement('a');
      a.setAttribute('download', `factory-plan.${format}`);
      a.setAttribute('href', dataUrl);
      a.click();
      setIsExporting(false);
    }).catch(err => {
      console.warn('Export failed', err);
      // Fallback
      exportFn(viewportElement, {
         ...exportConfig,
         filter: (node) => {
          if (node instanceof HTMLElement && node.tagName === 'IMG') return false;
          return true;
        }
      }).then((dataUrl2) => {
         const a = document.createElement('a');
         a.setAttribute('download', `factory-plan-fallback.${format}`);
         a.setAttribute('href', dataUrl2);
         a.click();
         setIsExporting(false);
      }).catch(err2 => {
         console.error('Fallback export also failed', err2);
         alert('Export failed completely. Try taking a screenshot instead.');
         setIsExporting(false);
      });
    });
  };

  const handleGroup = () => {
    if (selectedNodes.length < 2) return;
    const bounds = getNodesBounds(selectedNodes);
    const paddingX = 40;
    const paddingY = 40;
    
    const groupId = `group-${Date.now()}`;
    const newGroupNode: Node = {
      id: groupId,
      type: 'customGroup',
      position: { x: bounds.x - paddingX, y: bounds.y - paddingY },
      style: {
        width: bounds.width + paddingX * 2,
        height: bounds.height + paddingY * 2,
      },
      data: {},
      zIndex: -1,
    };

    setNodes(nds => {
      const nextNodes = nds.map(n => {
        if (n.selected && n.type !== 'customGroup') {
          return {
            ...n,
            parentId: groupId,
            extent: 'parent',
            position: {
              x: n.position.x - (bounds.x - paddingX),
              y: n.position.y - (bounds.y - paddingY),
            },
            selected: false,
          } as Node;
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
      const groups = nds.filter(n => groupIds.has(n.id));
      const groupPosMap = new Map<string, {x: number, y: number}>(groups.map(g => [g.id, g.position]));

      return nds.filter(n => !groupIds.has(n.id)).map(n => {
        if (n.parentId && groupIds.has(n.parentId)) {
          const pPos = groupPosMap.get(n.parentId) || { x: 0, y: 0 };
          const { parentId, extent, ...rest } = n;
          return {
            ...rest,
            parentId: undefined,
            extent: undefined,
            position: {
              x: n.position.x + pPos.x,
              y: n.position.y + pPos.y,
            },
            selected: false, 
          } as Node;
        }
        return n;
      });
    });
  };

  const handleExpandArray = () => {
    if (selectedNodes.length !== 1 || selectedNodes[0].type !== 'machine') return;
    const node = selectedNodes[0];
    const machinesCount = node.data.machines as number;
    if (machinesCount <= 1) return;

    const totalNodes = Math.ceil(machinesCount);
    if (totalNodes <= 1) return;

    const ratePerMachine = (node.data.rate as number) / machinesCount;

    const groupId = `group-exp-${Date.now()}`;
    const newGroupNode: Node = {
      id: groupId,
      type: 'customGroup',
      position: { x: node.position.x, y: node.position.y },
      style: { width: 400, height: 200 },
      data: { color: '#243142', label: `${node.data.item} Array` },
      zIndex: -1,
    };

    const newNodes: Node[] = [newGroupNode];
    const newEdges: Edge[] = [];

    // Create splitters/mergers for inputs and outputs roughly.
    // For a simpler UX, we just connect the direct inputs to a single splitter, and outputs to a single merger
    // inside the group, or just fan-in/fan-out if possible. Let's do fan-in/fan-out to all machines.
    
    // Generating array of machines
    const createdMachines: string[] = [];
    for (let i = 0; i < totalNodes; i++) {
        const mNodeId = `${node.id}-m${i}`;
        const isLast = i === totalNodes - 1;
        const count = (isLast && machinesCount % 1 !== 0) ? (machinesCount % 1) : 1;
        createdMachines.push(mNodeId);

        newNodes.push({
            id: mNodeId,
            type: 'machine',
            parentId: groupId,
            extent: 'parent',
            position: { x: 50, y: 50 + i * 110 },
            data: {
                ...node.data,
                label: node.data.label?.toString().replace(/Array.*/, '').trim() || 'Machine',
                machines: count,
                rate: ratePerMachine * count,
            }
        });
    }

    // Now for edges. Any edge targeting `node.id` should target a new Splitter.
    const currentEdges = getEdges();
    const incomingEdges = currentEdges.filter(e => e.target === node.id);
    const outgoingEdges = currentEdges.filter(e => e.source === node.id);

    let splitterId: string | null = null;
    if (incomingEdges.length > 0) {
        splitterId = `${node.id}-splitter`;
        newNodes.push({
            id: splitterId,
            type: 'logistics',
            parentId: groupId,
            extent: 'parent',
            position: { x: -30, y: 50 + (totalNodes * 110) / 2 },
            data: { type: 'splitter', rate: incomingEdges.reduce((acc, e) => acc + (parseFloat(e.label?.toString() || '0') || 0), 0) }
        });
        
        // Connect splitter to machines
        createdMachines.forEach(mid => {
           const count = newNodes.find(n => n.id === mid)?.data.machines as number || 1;
           newEdges.push({
               id: `e-${splitterId}-${mid}`,
               source: splitterId,
               target: mid,
               type: 'smoothstep',
               animated: true,
               style: { stroke: '#9ca3af', strokeWidth: 3 },
               label: `${(ratePerMachine * count).toFixed(1)}/min`,
               labelStyle: { fill: '#e5e7eb', fontWeight: 600, fontSize: 10, fontFamily: 'monospace' },
               labelBgStyle: { fill: '#151619', rx: 4, ry: 4, stroke: '#374151', strokeWidth: 1 },
           } as Edge);
        });
    }

    let mergerId: string | null = null;
    if (outgoingEdges.length > 0) {
        mergerId = `${node.id}-merger`;
        newNodes.push({
            id: mergerId,
            type: 'logistics',
            parentId: groupId,
            extent: 'parent',
            position: { x: 350, y: 50 + (totalNodes * 110) / 2 },
            data: { type: 'merger', rate: node.data.rate }
        });

        // Connect machines to merger
        createdMachines.forEach(mid => {
           const count = newNodes.find(n => n.id === mid)?.data.machines as number || 1;
           newEdges.push({
               id: `e-${mid}-${mergerId}`,
               source: mid,
               target: mergerId,
               type: 'smoothstep',
               animated: true,
               style: { stroke: '#9ca3af', strokeWidth: 3 },
               label: `${(ratePerMachine * count).toFixed(1)}/min`,
               labelStyle: { fill: '#e5e7eb', fontWeight: 600, fontSize: 10, fontFamily: 'monospace' },
               labelBgStyle: { fill: '#151619', rx: 4, ry: 4, stroke: '#374151', strokeWidth: 1 },
           } as Edge);
        });
    }

    setRFNodes(nds => {
        return [...nds.filter(n => n.id !== node.id), ...newNodes];
    });

    setRFEdges(eds => {
        return eds.map(e => {
            if (e.target === node.id && splitterId) {
                return { ...e, target: splitterId };
            }
            if (e.source === node.id && mergerId) {
                return { ...e, source: mergerId };
            }
            return e;
        }).concat(newEdges);
    });
    
    // Small delay to let React Flow update before applying layout
    setTimeout(() => {
        applyAILayout();
    }, 100);
  };

  const applyAILayout = async () => {
    // Determine if we're in aggregated view (all machines have count > 1 but there are no logistics nodes, or there are no multiple machines of same type).
    // Actually, we can just apply the layout. If multiple machines of the same type exist, it automatically groups them.
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
        machines.forEach(m => { m.parentId = groupId });
        newGroups.push({
          id: groupId,
          type: 'customGroup',
          position: { x: 0, y: 0 },
          data: { color: COLORS[colorIdx % COLORS.length], label: String(machines[0].data?.item || itemId) },
          style: { width: 100, height: 100 },
          zIndex: -1,
        });
        colorIdx++;
      }
    });

    currentNodes = [...newGroups, ...currentNodes];

    // Build hierarchical structure for ELK
    const childrenMap = new Map<string, any[]>();
    const rootChildren: any[] = [];

    // Initialize children map for groups
    newGroups.forEach(g => {
      childrenMap.set(g.id, []);
    });

    currentNodes.forEach(n => {
      let w = 260;
      let h = 92;
      if (n.type === 'logistics') {
        w = 48;
        h = 48;
      } else if (n.type === 'customGroup') {
        w = 100;
        h = 100;
      }

      const elkNode = {
        id: n.id,
        width: w,
        height: h,
        // layoutOptions can be customized locally for groups
        layoutOptions: n.type === 'customGroup' ? {
          'elk.padding': '[top=40,left=20,bottom=20,right=20]'
        } : undefined
      };

      if ((n as Node).parentId) {
        const parentId = (n as Node).parentId!;
        if (!childrenMap.has(parentId)) {
           childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(elkNode);
      } else if (n.type !== 'customGroup') {
        rootChildren.push(elkNode);
      }
    });

    // Assign children to groups and add them to root
    newGroups.forEach(g => {
      const gElkNode = {
        id: g.id,
        layoutOptions: {
           'elk.padding': '[top=40,left=20,bottom=20,right=20]',
           'elk.algorithm': 'layered', // layout inside groups if needed
           'elk.direction': 'RIGHT'
        },
        children: childrenMap.get(g.id) || []
      };
      rootChildren.push(gElkNode);
    });

    const graph = {
      id: 'root',
      layoutOptions,
      children: rootChildren,
      edges: getEdges().map(e => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target]
      }))
    };

    try {
      const layoutedGraph = await elk.layout(graph);
      
      const flattenNodes = (elkNodes: any[], arr: any[] = [], parentPos = { x: 0, y: 0 }) => {
        elkNodes.forEach(n => {
            const absoluteX = n.x || 0;
            const absoluteY = n.y || 0;
            // n.x and n.y from elk are relative to parent natively!
            // which is exactly what React Flow expects if parentId is set
            arr.push({ id: n.id, x: absoluteX, y: absoluteY, width: n.width, height: n.height });
            if (n.children) {
                flattenNodes(n.children, arr, { x: 0, y: 0 }); // reset because React Flow calculates absolute based on relative
            }
        });
        return arr;
      };

      const elkNodeMap = new Map();
      flattenNodes(layoutedGraph.children || []).forEach(n => {
          elkNodeMap.set(n.id, n);
      });

      currentNodes = currentNodes.map(n => {
        const en = elkNodeMap.get(n.id);
        if (!en) return n;

        if (n.type === 'customGroup') {
          return {
            ...n,
            position: { x: en.x, y: en.y },
            style: { width: en.width, height: en.height }
          };
        } else {
          return {
             ...n,
             position: { x: en.x, y: en.y }, // React Flow expects coordinates relative to parent if parentId exists
             extent: n.parentId ? 'parent' : undefined
          };
        }
      });

      setNodes(currentNodes);
      
      setTimeout(() => {
         fitView({ duration: 800, padding: 0.2 });
      }, 50);

    } catch (e) {
      console.error("ELK Layout error:", e);
    }
  };

  return (
    <Panel position="top-left" className="flex items-center gap-2 bg-[#151619]/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-[#2a2d33] pointer-events-auto">
      <div className="flex bg-[#101114] p-0.5 rounded-lg border border-[#2a2d33]">
        <button 
          onClick={() => setSelectionMode(false)}
          className={`p-2 rounded-md transition-colors ${!selectionMode ? 'bg-[#243142] text-blue-400' : 'text-[#8E9299] hover:text-white hover:bg-[#1c1e22]'}`}
          title="Pan & Move"
        >
          <Hand className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setSelectionMode(true)}
          className={`p-2 rounded-md transition-colors ${selectionMode ? 'bg-[#243142] text-blue-400' : 'text-[#8E9299] hover:text-white hover:bg-[#1c1e22]'}`}
          title="Select Multiple"
        >
          <MousePointer2 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-[1px] h-6 bg-[#2a2d33] mx-1" />

      {selectedNodes.length === 1 && selectedNodes[0].type === 'machine' && (selectedNodes[0].data.machines as number) > 1 && (
        <>
          <button 
            onClick={handleExpandArray}
            className="flex items-center gap-1.5 bg-[#4B2F83] hover:bg-[#5a3a9e] border border-[#6d4cb8] transition-all text-white px-3 py-1.5 rounded-lg text-xs font-semibold mr-1"
            title="Expand Array into single machines"
          >
            <SplitSquareHorizontal className="w-4 h-4" /> Expand Array
          </button>
        </>
      )}

      {selectedNodes.length > 1 && (
        <>
          <button 
            onClick={handleGroup}
            className="flex items-center gap-1.5 bg-[#243142] hover:bg-[#324559] border border-[#415a78] transition-all text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            title="Group Selected"
          >
            <Plus className="w-4 h-4" /> Group
          </button>
        </>
      )}

      {selectedGroups.length > 0 && (
        <>
          <button 
            onClick={handleUngroup}
            className="flex items-center gap-1.5 bg-[#422424] hover:bg-[#593232] border border-[#784141] transition-all text-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
            title="Ungroup Selected"
          >
            <Ungroup className="w-4 h-4" /> Ungroup
          </button>
        </>
      )}

      {(selectedNodes.length <= 1 && selectedGroups.length === 0) && (
        <div className="flex gap-1">
          <button 
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-[#4B2F83] hover:bg-[#5a3a9e] border border-[#6d4cb8] transition-all text-white px-3 py-1.5 rounded-lg text-xs font-semibold mr-2" 
            onClick={applyAILayout}
            title="Auto-group machines & layout"
          >
            <WandSparkles className="w-4 h-4 text-[#e0d6f6]" /> AI Design Layout
          </button>
          
          <button 
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-[#1c1e22] hover:bg-[#243142] border border-[#2a2d33] hover:border-[#415a78] transition-all text-[#8E9299] hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" 
            onClick={() => onExport('png')}
          >
            <Download className="w-4 h-4" /> PNG
          </button>
          <button 
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-[#1c1e22] hover:bg-[#243142] border border-[#2a2d33] hover:border-[#415a78] transition-all text-[#8E9299] hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" 
            onClick={() => onExport('svg')}
          >
            <Download className="w-4 h-4" /> SVG
          </button>
        </div>
      )}
    </Panel>
  );
}

export function FactoryGraph({ initialNodes, initialEdges }: FactoryGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'h') {
        setSelectionMode(false);
      } else if (e.key.toLowerCase() === 'v') {
        setSelectionMode(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Only apply click-to-highlight if we are not in selection mode and the node is not a group
    if (!selectionMode && node.type !== 'customGroup') {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    }
  }, [selectedNodeId, selectionMode]);

  useEffect(() => {
    if (!selectedNodeId) {
       // Reset styles but preserve group nodes
       setNodes(nds => nds.map(n => ({...n, style: { ...n.style, opacity: 1 }})));
       setEdges(eds => eds.map(e => ({
           ...e,
           animated: true,
           style: {
               // default styling
               stroke: '#9ca3af',
               strokeWidth: 3,
           }
       })));
       return;
    }

    setEdges(eds => {
      // Find all directly or indirectly connected nodes and edges to the selected node
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(selectedNodeId);

      // Simple BFS up and down to find all connected nodes
      let queue = [selectedNodeId];
      const highlightedEdges = new Set<string>();
      
      // Upwards (parents)
      while(queue.length > 0) {
        const current = queue.shift()!;
        eds.forEach(edge => {
          if (edge.target === current) {
            highlightedEdges.add(edge.id);
            if (!connectedNodeIds.has(edge.source)) {
              connectedNodeIds.add(edge.source);
              queue.push(edge.source);
            }
          }
        });
      }

      // Downwards (children)
      queue = [selectedNodeId];
      while(queue.length > 0) {
        const current = queue.shift()!;
        eds.forEach(edge => {
          if (edge.source === current) {
            highlightedEdges.add(edge.id);
            if (!connectedNodeIds.has(edge.target)) {
               connectedNodeIds.add(edge.target);
               queue.push(edge.target);
            }
          }
        });
      }

      setNodes(nds => nds.map(n => ({
        ...n,
        style: { 
          ...n.style, 
          opacity: (connectedNodeIds.has(n.id) || n.type === 'customGroup') ? 1 : 0.3 
        }
      })));

      return eds.map(e => {
          const isHighlighted = highlightedEdges.has(e.id);
          
          return {
            ...e,
            animated: isHighlighted,
            style: isHighlighted ? { 
              stroke: '#ff9000',
              strokeWidth: 5
            } : {
              stroke: 'rgba(255,255,255, 0.1)',
              strokeWidth: 2
            }
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
        fitView
        colorMode="dark"
        panOnDrag={!selectionMode}
        selectionOnDrag={selectionMode}
        selectionMode={selectionMode ? 'partial' : 'full'}
      >
        <Background variant={BackgroundVariant.Lines} gap={40} color="rgba(255,255,255,0.15)" />
        <Controls className="bg-[#151619] fill-current text-[#8E9299] border-none shadow-md" />
        <TopToolbar nodes={nodes} edges={edges} setNodes={setNodes} selectionMode={selectionMode} setSelectionMode={setSelectionMode} />
      </ReactFlow>
    </div>
  );
}
