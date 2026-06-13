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
import { machines, isFluidItem } from '../../engine/data';

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
  pipeTier?: 'mk1' | 'mk2';
  isFullscreen?: boolean;
  perMachineSettings?: Record<string, { clockSpeed?: number; somerslooped?: boolean }>;
  onUpdatePerMachineSettings?: (itemId: string, settings: { clockSpeed?: number; somerslooped?: boolean }) => void;
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

    // Derive output-specific filename
    const outputNames = currentNodes
      .filter(n => n.data?.machineId === 'product_output')
      .map(n => n.data?.item as string)
      .filter(Boolean);
    const uniqueOutputs = Array.from(new Set(outputNames));

    let filenameBase = 'ficsit-blueprint';
    if (uniqueOutputs.length > 0) {
      const cleanName = (name: string) =>
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      const slugified = uniqueOutputs.map(cleanName).join('-and-');
      filenameBase = `ficsit-blueprint-${slugified}`;
    }

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
            a.setAttribute('download', `${filenameBase}.${format}`);
            a.setAttribute('href', finalDataUrl);
            a.click();
            document.body.removeChild(wrapper);
            setIsExporting(false);
          }).catch((err) => {
            console.error("Frame export failed", err);
            const a = document.createElement('a');
            a.setAttribute('download', `${filenameBase}-fallback.${format}`);
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
            a.setAttribute('download', `${filenameBase}-fallback.${format}`);
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

function FactoryGraphInner({ 
  initialNodes,
  initialEdges,
  beltId = 'mk1',
  pipeTier = 'mk1',
  isFullscreen = false,
  perMachineSettings = {},
  onUpdatePerMachineSettings
}: FactoryGraphProps) {
  const { getNodes, getEdges, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  // Scroll-to-zoom only after the user clicks into the canvas. Until then the
  // page scrolls normally instead of the graph hijacking the wheel.
  const [scrollZoomActive, setScrollZoomActive] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const isValidMachineNode = !!(selectedNode && 
    selectedNode.type === 'machine' && 
    selectedNode.data &&
    selectedNode.data.itemId &&
    selectedNode.data.machineId !== 'product_output' &&
    selectedNode.data.machineId !== 'planned_outputs' &&
    selectedNode.data.machineId !== 'byproduct_reused' &&
    selectedNode.data.machineId !== 'supplied_input');

  const itemId = selectedNode?.data?.itemId as string;
  const customConfig = perMachineSettings[itemId] || {};

  const [localClock, setLocalClock] = useState<number>(100);
  const [localSomersloop, setLocalSomersloop] = useState<boolean>(false);

  useEffect(() => {
    if (isValidMachineNode && itemId) {
      setLocalClock(customConfig.clockSpeed ?? (selectedNode?.data?.clockSpeed as number) ?? 100);
      setLocalSomersloop(customConfig.somerslooped ?? (selectedNode?.data?.somerslooped as boolean) ?? false);
    }
  }, [itemId, isValidMachineNode, perMachineSettings]);

  const handleClockChange = (newVal: number) => {
    setLocalClock(newVal);
    onUpdatePerMachineSettings?.(itemId, { clockSpeed: newVal, somerslooped: localSomersloop });
  };

  const handleSomersloopToggle = () => {
    const nextVal = !localSomersloop;
    setLocalSomersloop(nextVal);
    onUpdatePerMachineSettings?.(itemId, { clockSpeed: localClock, somerslooped: nextVal });
  };

  const handleResetNode = () => {
    setLocalClock(100);
    setLocalSomersloop(false);
    onUpdatePerMachineSettings?.(itemId, { clockSpeed: undefined, somerslooped: undefined });
  };

  // ── Tuner live preview ──────────────────────────────────────────────────────
  // Applying a clock/somersloop change keeps this node's REQUIRED OUTPUT fixed and
  // re-solves the machine COUNT (machines ∝ 1 / (clock × somersloopMult)). Mirror
  // that here so the preview matches the real re-solve instead of assuming a fixed
  // machine count. Key facts (see solver.ts): total input is clock-INDEPENDENT for
  // a fixed output, and somersloop halves both the machine count and the input
  // (it doubles output per craft without raising input).
  const solvedClock = (selectedNode?.data?.clockSpeed as number) ?? 100;
  const solvedMachines = (selectedNode?.data?.machines as number) ?? 0;
  const solvedSloopMult = (selectedNode?.data?.somerslooped as boolean) ? 2 : 1;
  const localSloopMult = localSomersloop ? 2 : 1;
  const previewMachines = localClock > 0
    ? solvedMachines * (solvedClock * solvedSloopMult) / (localClock * localSloopMult)
    : solvedMachines;
  const previewBasePower = machines[selectedNode?.data?.machineId as string]?.powerUsage || 0;
  // Overclock power exponent log2(2.5) ≈ 1.321928 (Satisfactory 0.7.0.0+).
  const previewPower = previewMachines * previewBasePower * Math.pow(localClock / 100, Math.log2(2.5)) * (localSomersloop ? 4 : 1);
  // Multiply each input's solved total by this to reflect a somersloop toggle.
  const inputSloopFactor = solvedSloopMult / localSloopMult;

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
    const MACH_W     = 380;  // machine card width
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

    // Pipes (fluids/gases) use pipe capacity & cyan styling; belts use belt capacity.
    const nodeItemId = node.data.itemId as string | undefined;
    const edgeIsFluid = nodeItemId ? isFluidItem(nodeItemId) : false;
    const edgeCapacity = edgeIsFluid ? (pipeTier === 'mk2' ? 600 : 300) : beltCapacity;
    const createSatEdge = (id: string, source: string, target: string, rate: number, extras: Record<string, unknown> = {}) => ({
      id, source, target, type: 'satisfactory',
      label: `${rate.toFixed(1)}/min`,
      data: { rate, isOverloaded: rate > edgeCapacity, isFluid: edgeIsFluid, itemImageUrl },
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
      let w = 380, h = 160;
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

      {/* Side details/tuning panel overlay sliding in from the right edge */}
      {isValidMachineNode && itemId && (
        <>
          <style>{`
            @keyframes tunerSlideIn {
              from { transform: translateX(110%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <div className="absolute top-4 right-4 bottom-4 w-[340px] bg-[#0c0d0f]/95 border border-[#2a2d33] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] z-40 flex flex-col pointer-events-auto backdrop-blur-lg transition-all duration-300 transform translate-x-0 animate-[tunerSlideIn_0.25s_ease-out]">
            {/* Bezel Corner Screws */}
            <div className="sf-card-screw sf-card-screw-tl" />
            <div className="sf-card-screw sf-card-screw-tr" />
            <div className="sf-card-screw sf-card-screw-bl" />
            <div className="sf-card-screw sf-card-screw-br" />

            {/* Header section with hazard stripes */}
            <div className="flex items-center justify-between border-b border-[#2a2d33] p-4 bg-[#121316]/50 relative rounded-t-xl overflow-hidden shrink-0">
              <div className="sf-card-stripes-tl" style={{ opacity: 0.3 }} />
              <div>
                <h3 className="font-extrabold tracking-widest text-[#f48721] font-mono text-[13px] uppercase">
                  FICSIT MACHINE TUNER
                </h3>
                <span className="text-[8px] text-[#8E9299] font-mono tracking-wider block mt-0.5">
                  NODE SELECTOR OVERLOAD OVERRIDE
                </span>
              </div>
              <button 
                onClick={() => setSelectedNodeId(null)}
                className="w-6 h-6 rounded bg-[#1c1e22]/50 hover:bg-red-500/20 text-[#8E9299] hover:text-red-400 border border-[#2a2d33] hover:border-red-500/30 flex items-center justify-center transition-all cursor-pointer text-xs"
                title="Close Tuner"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-5">
              
              {/* Machine Summary Box */}
              <div className="bg-[#050607] border border-[#1d2024] rounded-lg p-3 relative shrink-0 flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#121316] border border-[#23252a] rounded-lg p-1 flex items-center justify-center shrink-0 shadow-inner">
                    {selectedNode.data.itemImageUrl && (
                      <img 
                        src={selectedNode.data.itemImageUrl as string} 
                        className="w-10 h-10 object-contain filter drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                        alt={selectedNode.data.item as string}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-grow">
                    <span className="text-[8px] font-black tracking-widest text-[#7e828a] uppercase block">
                      ACTIVE NODE
                    </span>
                    {/* Wrap long names (e.g. "Electromagnetic Control Rod") instead of clipping */}
                    <span className="text-[14px] font-black text-white uppercase leading-[1.1] line-clamp-2 break-words block mt-0.5">
                      {selectedNode.data.item as string}
                    </span>
                    <span className="text-[9px] text-[#f48721] font-bold font-mono block truncate mt-0.5">
                      {machines[selectedNode.data.machineId as string]?.name || (selectedNode.data.machineId as string)} x{Number(previewMachines.toFixed(2))}
                    </span>
                  </div>
                </div>

                <div className="h-[1px] bg-[#1d2024]" />

                {/* Base Stats Row — Output is fixed; Machines & Power update live with the clock */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#0c0d0f] border border-[#1c1d20] p-1.5 rounded">
                    <span className="text-[7.5px] font-black tracking-wider text-[#7e828a] uppercase block">
                      OUTPUT FLOW
                    </span>
                    <span className="text-sm font-extrabold font-mono text-white mt-0.5 block">
                      {Number((selectedNode.data.rate as number).toFixed(1))}/min
                    </span>
                  </div>
                  <div className="bg-[#0c0d0f] border border-[#1c1d20] p-1.5 rounded">
                    <span className="text-[7.5px] font-black tracking-wider text-[#7e828a] uppercase block">
                      MACHINES
                    </span>
                    <span className="text-sm font-extrabold font-mono text-yellow-400 mt-0.5 block">
                      x{Number(previewMachines.toFixed(2))}
                    </span>
                  </div>
                  <div className="bg-[#0c0d0f] border border-[#1c1d20] p-1.5 rounded">
                    <span className="text-[7.5px] font-black tracking-wider text-[#7e828a] uppercase block">
                      POWER USAGE
                    </span>
                    <span className="text-sm font-extrabold font-mono text-orange-400 mt-0.5 block">
                      {previewPower.toFixed(1)} MW
                    </span>
                  </div>
                </div>
              </div>

              {/* Overclock Adjuster */}
              <div className="flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-widest text-[#8E9299] uppercase font-mono">
                    CLOCK SPEED OVERCLOCK
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number"
                      min="1"
                      max="250"
                      value={localClock}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(250, parseInt(e.target.value) || 100));
                        handleClockChange(val);
                      }}
                      className="w-14 text-center font-mono font-bold text-xs bg-[#121316] border border-[#2a2d33] rounded p-0.5 text-yellow-500 focus:outline-none focus:border-[#f48721] h-6"
                    />
                    <span className="text-yellow-500 font-bold font-mono text-xs">%</span>
                  </div>
                </div>

                <input 
                  type="range"
                  min="1"
                  max="250"
                  value={localClock}
                  onChange={(e) => handleClockChange(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#151619] rounded-lg appearance-none cursor-pointer accent-[#f48721] border border-[#2a2d33]"
                />

                {/* Preset Speed Buttons */}
                <div className="grid grid-cols-5 gap-1">
                  {[50, 100, 150, 200, 250].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleClockChange(preset)}
                      className={`text-[9px] font-bold font-mono py-1 rounded transition-colors cursor-pointer border ${
                        localClock === preset 
                          ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' 
                          : 'bg-[#121316] border-[#2a2d33] text-[#8E9299] hover:text-white hover:bg-[#1a1c20]'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Somersloop Productivity Box */}
              <div className="flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#8E9299] uppercase font-mono">
                      SOMERSLOOP SLOTS
                    </span>
                    <span className="text-[7.5px] text-[#8E9299]/80 font-mono mt-0.5">
                      PRODUCTIVITY DOUBLE MULTIPLIER
                    </span>
                  </div>
                  
                  {/* Custom Styled Premium Somersloop Toggle */}
                  <button
                    onClick={handleSomersloopToggle}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 border flex items-center p-0.5 cursor-pointer ${
                      localSomersloop 
                        ? 'bg-purple-600/30 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                        : 'bg-[#121316] border-[#2a2d33]'
                    }`}
                  >
                    <div 
                      className={`rounded-full transition-all duration-300 flex items-center justify-center`}
                      style={{
                        width: '18px',
                        height: '18px',
                        backgroundColor: localSomersloop ? '#c084fc' : '#8e9299',
                        transform: localSomersloop ? 'translateX(22px)' : 'translateX(0px)',
                        boxShadow: localSomersloop ? '0 0 8px #c084fc' : 'none',
                      }}
                    >
                      {localSomersloop && <span className="text-[8px]">🌀</span>}
                    </div>
                  </button>
                </div>

                {/* Info Pill */}
                <div className={`p-2 rounded border text-[9.5px] font-mono transition-all duration-300 leading-relaxed ${
                  localSomersloop 
                    ? 'bg-purple-950/20 border-purple-800/40 text-purple-300 animate-pulse' 
                    : 'bg-[#121316] border-[#2a2d33] text-[#8E9299]'
                }`}>
                  <p>
                    {localSomersloop 
                      ? '🌀 Somersloop ACTIVE: Production rate is doubled (200% yield) without consuming extra inputs. Power usage multiplied by 4.0x.' 
                      : 'ℹ️ Somerslooping uses alien technology to double machine outputs for free. Increases local power draw exponentially.'
                    }
                  </p>
                </div>
              </div>

              {/* Recipe Inputs details */}
              {selectedNode.data.inputDetails && (selectedNode.data.inputDetails as any[]).length > 0 && (
                <div className="flex flex-col gap-2 bg-[#050607]/40 border border-[#1c1d20]/50 rounded-lg p-2.5 shrink-0">
                  <span className="text-[9px] font-bold tracking-widest text-[#7e828a] uppercase font-mono block">
                    RECIPE INPUT FLOWS
                  </span>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {(selectedNode.data.inputDetails as any[]).map((inp: any, idx: number) => {
                      // Total input is clock-INDEPENDENT for a fixed output (the clock
                      // cancels). It only changes with a somersloop toggle, which halves
                      // input. ratePerMachine already has the solved clock baked in.
                      const totalNeeded = inp.ratePerMachine * solvedMachines * inputSloopFactor;
                      return (
                        <div key={idx} className="flex items-center justify-between font-mono text-[10px]">
                          <div className="flex items-center gap-1.5 text-[#a0a4ab] min-w-0">
                            {inp.imageUrl && (
                              <img src={inp.imageUrl} className="w-3.5 h-3.5 object-contain shrink-0" alt={inp.name} />
                            )}
                            <span className="truncate max-w-[150px]">{inp.name}</span>
                          </div>
                          <span className="text-white font-bold shrink-0">{totalNeeded.toFixed(1)}/min</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Footer reset button */}
            <div className="border-t border-[#2a2d33] p-4 bg-[#121316]/50 flex items-center justify-between rounded-b-xl gap-2 shrink-0">
              <button 
                onClick={handleResetNode}
                className="flex-grow py-2 text-[10px] font-bold tracking-wider uppercase bg-[#1c1e22]/50 hover:bg-[#25282d] border border-[#2a2d33] hover:border-[#3a3e47] text-[#8E9299] hover:text-white rounded-lg transition-colors cursor-pointer text-center"
              >
                Reset
              </button>
              <button 
                onClick={() => setSelectedNodeId(null)}
                className="flex-grow py-2 text-[10px] font-bold tracking-wider uppercase sf-primary-btn rounded-lg text-center cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
