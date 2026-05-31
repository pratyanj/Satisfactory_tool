import { Background, BackgroundVariant, Controls, ReactFlow, useEdgesState, useNodesState, Panel, useReactFlow, ReactFlowProvider, SelectionMode } from '@xyflow/react';
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
  isFullscreen?: boolean;
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

function TopToolbar({ nodes, setNodes, selectionMode, setSelectionMode, onExpand, onLayout, isFullscreen = false }: {
  nodes: Node[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  selectionMode: boolean,
  setSelectionMode: (v: boolean) => void,
  onExpand: () => void,
  onLayout: () => void,
  isFullscreen?: boolean
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
    const innerWidth = bounds.width + padding * 2;
    const innerHeight = bounds.height + padding * 2;
    const exportFn = format === 'svg' ? toSvg : toPng;
    
    // Pass 1: Export the bare graph (transparent background)
    const graphExportConfig = {
      width: innerWidth, height: innerHeight, pixelRatio: 2, cacheBust: true,
      style: {
        width: `${innerWidth}px`, height: `${innerHeight}px`,
        transform: `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px) scale(1)`,
        backgroundImage: 'none', backgroundColor: 'transparent',
      },
    };

    exportFn(viewportElement, graphExportConfig)
      .then((dataUrl) => {
        // Pass 2: Wrap the graph in the FICSIT frame
        const baseFrameWidth = 1600;
        const paddingInsideFrame = 60; 
        const graphAspect = innerWidth / innerHeight;
        
        const availableWidth = baseFrameWidth - (paddingInsideFrame * 2);
        const availableHeight = availableWidth / graphAspect;
        const baseFrameHeight = availableHeight + (paddingInsideFrame * 2);
        
        // Scale the final output so the inner graph retains its high resolution
        const finalPixelRatio = Math.max(2, (innerWidth * 2) / baseFrameWidth);

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '-9999px';
        wrapper.style.width = `${baseFrameWidth}px`;
        wrapper.style.height = `${baseFrameHeight}px`;
        wrapper.style.backgroundColor = '#050505';
        
        // Use the exact classes from BodyFrame to recreate the UI
        wrapper.innerHTML = `
          <div class="sf-body-frame-wrapper" style="width: 100%; height: 100%; padding: 20px; box-sizing: border-box; background: #050505;">
            <div class="sf-body-frame-container" style="background: #0d0e11; width: 100%; height: 100%; position: relative;">
              
              <div class="sf-frame-caution sf-frame-caution-top"></div>
              <div class="sf-frame-caution sf-frame-caution-bottom"></div>

              <div class="sf-frame-edge-light sf-frame-edge-light-top"></div>
              <div class="sf-frame-edge-light sf-frame-edge-light-top-right"></div>
              <div class="sf-frame-edge-light sf-frame-edge-light-bottom"></div>
              <div class="sf-frame-edge-light sf-frame-edge-light-bottom-right"></div>
              <div class="sf-frame-edge-light sf-frame-edge-light-left"></div>
              <div class="sf-frame-edge-light sf-frame-edge-light-left-bottom"></div>
              <div class="sf-frame-edge-light sf-frame-edge-light-right"></div>
              <div class="sf-frame-edge-light sf-frame-edge-light-right-bottom"></div>

              <div class="sf-frame-corner sf-frame-corner-tl"><div class="sf-frame-screw"></div></div>
              <div class="sf-frame-corner sf-frame-corner-tr"><div class="sf-frame-screw"></div></div>
              <div class="sf-frame-corner sf-frame-corner-bl"><div class="sf-frame-screw"></div></div>
              <div class="sf-frame-corner sf-frame-corner-br"><div class="sf-frame-screw"></div></div>

              <div class="sf-frame-logo" style="position: absolute; bottom: 20px; right: 30px; z-index: 50;">
                <div class="sf-frame-logo-main">SATISFACTORY <span>TOOL</span></div>
                <div class="sf-frame-logo-sub">made by pratyanj</div>
              </div>

              <div class="sf-body-frame-content" style="width: 100%; height: 100%; padding: ${paddingInsideFrame}px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #151619 0%, #0d0e11 100%);">
                <img id="export-inner-img" src="${dataUrl}" style="width: 100%; height: 100%; object-fit: contain; display: block; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));" />
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(wrapper);

        const img = wrapper.querySelector('#export-inner-img') as HTMLImageElement;
        img.onload = () => {
          const finalNode = wrapper.querySelector('.sf-body-frame-wrapper') as HTMLElement;
          exportFn(finalNode, {
            width: baseFrameWidth,
            height: baseFrameHeight,
            pixelRatio: finalPixelRatio,
            cacheBust: true,
            style: { margin: '0', padding: '0' }
          }).then((finalDataUrl) => {
            const a = document.createElement('a');
            a.setAttribute('download', `ficsit-blueprint.${format}`);
            a.setAttribute('href', finalDataUrl);
            a.click();
            document.body.removeChild(wrapper);
            setIsExporting(false);
          }).catch((err) => {
            console.error("Frame export failed", err);
            const a = document.createElement('a');
            a.setAttribute('download', `factory-plan.${format}`);
            a.setAttribute('href', dataUrl);
            a.click();
            document.body.removeChild(wrapper);
            setIsExporting(false);
          });
        };
        img.onerror = () => {
           document.body.removeChild(wrapper);
           setIsExporting(false);
        };
      })
      .catch((err) => {
        console.error("Graph export failed", err);
        exportFn(viewportElement, {
          ...graphExportConfig,
          filter: (node) => !(node instanceof HTMLElement && node.tagName === 'IMG'),
          style: { ...graphExportConfig.style, backgroundColor: '#101114' }
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
    <Panel position="top-left" className={`sf-graph-panel ${isFullscreen ? 'is-fullscreen' : ''} flex items-center gap-2 bg-[#151619]/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-[#2a2d33] pointer-events-auto`}>
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
          <button disabled={isExporting} className="flex items-center gap-1.5 sf-primary-btn px-4 py-2 text-xs font-bold tracking-widest uppercase mr-2 disabled:opacity-50" onClick={onLayout} title="Auto-group & layout"><span className="sf-btn-scanner absolute inset-0 pointer-events-none z-10" /><span className="relative z-20 flex items-center gap-1.5"><WandSparkles className="w-4 h-4 text-white" /> AI Design Layout</span></button>
          <button disabled={isExporting} className="flex items-center gap-1.5 sf-secondary-btn px-3 py-2 text-[10px] font-bold tracking-widest uppercase disabled:opacity-50" onClick={() => onExport('png')}><span className="relative z-20 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> PNG</span></button>
          <button disabled={isExporting} className="flex items-center gap-1.5 sf-secondary-btn px-3 py-2 text-[10px] font-bold tracking-widest uppercase disabled:opacity-50" onClick={() => onExport('svg')}><span className="relative z-20 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> SVG</span></button>
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

function FactoryGraphInner({ initialNodes, initialEdges, beltId = 'mk1', isFullscreen = false }: FactoryGraphProps) {
  const { getNodes, getEdges, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  // Scroll-to-zoom only after the user clicks into the canvas. Until then the
  // page scrolls normally instead of the graph hijacking the wheel.
  const [scrollZoomActive, setScrollZoomActive] = useState(false);

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

    // Layout constants — sized to fit the actual node dimensions
    // Machine card: ~340px wide, ~160px tall
    // Logistics node: 48x48px
    const PAD        = 24;   // group inner padding
    const LOGI_W     = 48;   // splitter / merger width
    const MACH_W     = 340;  // machine card width
    const ROW_H      = 170;  // vertical spacing between rows
    const LOGI_OFF   = (ROW_H - LOGI_W) / 2; // vertical centering offset for logistics nodes

    // Column X positions (left edge of each node)
    const COL_SPLT = PAD;                          // splitter column
    const COL_MACH = COL_SPLT + LOGI_W + 16;      // machine column
    const COL_MRG  = COL_MACH + MACH_W + 16;      // merger column

    const groupWidth  = COL_MRG + LOGI_W + PAD;
    const groupHeight = PAD * 2 + totalNodes * ROW_H;

    const groupId = `group-exp-${Date.now()}`;
    const newGroupNode: Node = {
      id: groupId, type: 'customGroup',
      position: { x: node.position.x, y: node.position.y },
      style: { width: groupWidth, height: groupHeight },
      data: { color: '#243142', label: `${node.data.item} Array` },
      zIndex: -1,
    };

    const newNodes: Node[] = [newGroupNode];
    const newEdges: Edge[] = [];

    const createSatEdge = (id: string, source: string, target: string, rate: number, extras: Record<string, unknown> = {}) => ({
      id, source, target, type: 'satisfactory',
      label: `${rate.toFixed(1)}/min`,
      data: { rate, isOverloaded: rate > beltCapacity, itemImageUrl },
      ...extras,
    });

    // ── Build machine nodes ──
    const createdMachines: string[] = [];
    for (let i = 0; i < totalNodes; i++) {
      const mNodeId = `${node.id}-m${i}`;
      const isLast = i === totalNodes - 1;
      const count = (isLast && machinesCount % 1 !== 0) ? (machinesCount % 1) : 1;
      createdMachines.push(mNodeId);
      newNodes.push({
        id: mNodeId, type: 'machine', parentId: groupId, extent: 'parent',
        position: { x: COL_MACH, y: PAD + i * ROW_H },
        data: {
          ...node.data,
          label: node.data.label?.toString().replace(/ x\d+(\.\d+)?$/, '').trim() || 'Machine',
          machines: count,
          rate: ratePerMachine * count,
        },
      });
    }

    const currentEdges = getEdges();
    const incomingEdges = currentEdges.filter(e => e.target === targetNodeId);
    const outgoingEdges = currentEdges.filter(e => e.source === targetNodeId);

    // ── Build splitter chain for inputs ──
    // Splitter layout: left side, one splitter per machine except the last.
    // The last machine is fed by the final splitter's 'bottom' output.
    let firstSplitterId: string | null = null;
    if (incomingEdges.length > 0) {
      if (totalNodes === 1) {
        firstSplitterId = createdMachines[0];
      } else {
        const totalIncomingRate = incomingEdges.reduce(
          (acc, e) => acc + (parseFloat(e.label?.toString() || '0') || 0), 0
        );
        let remainingRate = totalIncomingRate;
        let prevSplitterId: string | null = null;

        for (let i = 0; i < totalNodes - 1; i++) {
          const splitterId = `${node.id}-splt-${i}`;
          if (i === 0) firstSplitterId = splitterId;

          newNodes.push({
            id: splitterId, type: 'logistics', parentId: groupId, extent: 'parent',
            position: { x: COL_SPLT, y: PAD + i * ROW_H + LOGI_OFF },
            data: { type: 'splitter', rate: remainingRate },
          });

          const mId = createdMachines[i];
          const mCount = (newNodes.find(n => n.id === mId)?.data.machines as number) || 1;
          const neededRate = ratePerMachine * mCount;

          // Chain splitters: prev splitter 'bottom' → this splitter
          if (prevSplitterId) {
            newEdges.push(createSatEdge(
              `e-${prevSplitterId}-${splitterId}`,
              prevSplitterId, splitterId, remainingRate,
              { sourceHandle: 'bottom', targetHandle: 'top' }
            ));
          }

          // Splitter right output → machine
          newEdges.push(createSatEdge(
            `e-${splitterId}-${mId}`,
            splitterId, mId, neededRate,
            { sourceHandle: 'right' }
          ));

          remainingRate -= neededRate;
          prevSplitterId = splitterId;

          // Last splitter feeds the last machine via its bottom output
          if (i === totalNodes - 2) {
            const lastMId = createdMachines[totalNodes - 1];
            const lastMCount = (newNodes.find(n => n.id === lastMId)?.data.machines as number) || 1;
            newEdges.push(createSatEdge(
              `e-${splitterId}-${lastMId}`,
              splitterId, lastMId, ratePerMachine * lastMCount,
              { sourceHandle: 'bottom' }
            ));
          }
        }
      }
    }

    // ── Build merger chain for outputs ──
    // Merger layout: right side, one merger per machine (upward flowing manifold)
    // Each Machine[i] connects to Merger[i]'s left input handle.
    // Merger[i] connects to Merger[i-1]'s bottom input handle via its right output handle.
    // Merger[0]'s right output is the final output of the array.
    let lastMergerId: string | null = null;
    if (outgoingEdges.length > 0) {
      if (totalNodes === 1) {
        lastMergerId = createdMachines[0];
      } else {
        // Create mergers, one per machine
        const mergerIds: string[] = [];
        for (let i = 0; i < totalNodes; i++) {
          const mergerId = `${node.id}-mrg-${i}`;
          mergerIds.push(mergerId);

          newNodes.push({
            id: mergerId, type: 'logistics', parentId: groupId, extent: 'parent',
            position: { x: COL_MRG, y: PAD + i * ROW_H + LOGI_OFF },
            data: { type: 'merger', rate: 0, isFlipped: false },
          });
        }

        // Connect machines to their respective mergers and chain mergers upwards
        let currentAccumulatedRate = 0;
        // Start from bottom and accumulate upwards
        for (let i = totalNodes - 1; i >= 0; i--) {
          const mergerId = mergerIds[i];
          const mId = createdMachines[i];
          const mCount = (newNodes.find(n => n.id === mId)?.data.machines as number) || 1;
          const machineRate = ratePerMachine * mCount;

          currentAccumulatedRate += machineRate;

          // Machine output → Merger left input
          newEdges.push(createSatEdge(`e-${mId}-${mergerId}`, mId, mergerId, machineRate, { targetHandle: 'left' }));

          // If not the top merger, connect to the merger above it
          if (i > 0) {
            const nextMergerId = mergerIds[i - 1]; // the merger above
            newEdges.push(createSatEdge(
              `e-${mergerId}-${nextMergerId}`,
              mergerId, nextMergerId, currentAccumulatedRate,
              { sourceHandle: 'top', targetHandle: 'bottom' }
            ));
          }

          // Update the merger rate
          const mergerNode = newNodes.find(n => n.id === mergerId);
          if (mergerNode) mergerNode.data = { ...mergerNode.data, rate: currentAccumulatedRate };
        }

        // The top-most merger is the final output of the group
        lastMergerId = mergerIds[0];
      }
    }

    // Remove original node and add all new ones; rewire external edges
    setNodes(nds => [...nds.filter(n => n.id !== node.id), ...newNodes]);
    setEdges(eds => eds.map(e => {
      if (e.target === targetNodeId && firstSplitterId) return { ...e, target: firstSplitterId };
      if (e.source === targetNodeId && lastMergerId) return { ...e, source: lastMergerId, sourceHandle: 'right' };
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
      let w = 340, h = 160;
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
    <div
      className="w-full h-full bg-[#101114] relative"
      onPointerDown={() => setScrollZoomActive(true)}
      onMouseLeave={() => setScrollZoomActive(false)}
    >
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
        minZoom={0.05}
        maxZoom={3}
        colorMode="dark"
        panOnDrag={!selectionMode}
        selectionOnDrag={selectionMode}
        selectionMode={selectionMode ? SelectionMode.Partial : SelectionMode.Full}
        zoomOnScroll={scrollZoomActive}
        zoomOnPinch={true}
        panOnScroll={false}
        preventScrolling={scrollZoomActive}
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
          isFullscreen={isFullscreen}
        />
      </ReactFlow>

      {/* Hint: page scroll stays free until the canvas is clicked */}
      {!scrollZoomActive && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none select-none rounded-md bg-[#151619]/85 border border-[#23252a] px-2.5 py-1 text-[10px] font-medium text-[#8E9299] shadow-md">
          Click to interact · scroll to zoom
        </div>
      )}
    </div>
  );
}
