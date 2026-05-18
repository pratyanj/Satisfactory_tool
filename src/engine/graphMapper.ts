import { Edge, Node } from '@xyflow/react';
import dagre from 'dagre';
import { belts, BeltId, items, machines, recipes } from './data';
import { SolverNode } from './solver';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export type LayoutMode = 'aggregated' | 'expanded';

export function mapSolverResultToGraph(root: SolverNode, mode: LayoutMode = 'aggregated', beltId: BeltId = 'mk1'): { nodes: Node[]; edges: Edge[] } {
  const nodeList: Node[] = [];
  const edgeList: Edge[] = [];
  const beltCapacity = belts[beltId]?.capacity || 60;
  const beltName = belts[beltId]?.name || 'Mk.1 Belt';

  function getBeltLabel(rate: number): string {
    if (rate <= beltCapacity) return `${rate.toFixed(1)}/min`;
    const beltsNeeded = Math.ceil(rate / beltCapacity);
    return `${rate.toFixed(1)}/min (${beltsNeeded}x ${beltName})`;
  }

  function createEdge(id: string, source: string, target: string, label?: string, itemId?: string): Edge {
    const rate = label ? parseFloat(label) : 0;
    const isOverloaded = rate > beltCapacity;
    const item = itemId ? items[itemId] : null;
    return {
      id, source, target, label, type: 'satisfactory',
      data: { rate, isOverloaded, itemImageUrl: item?.imageUrl },
      animated: true,
    };
  }

  /** Build enriched data for a machine node, including recipe details */
  function buildNodeData(node: SolverNode, machineCount: number, rate: number, label: string) {
    const recipe = recipes.find(r => r.id === node.recipeId) || recipes.find(r => r.outputItemId === node.itemId);
    const machineInfo = machines[node.machineId];
    const itemInfo = items[node.itemId];

    return {
      label,
      item: itemInfo?.name || node.itemId,
      machines: machineCount,
      rate,
      machineId: node.machineId,
      itemId: node.itemId,
      itemImageUrl: itemInfo?.imageUrl,
      // Recipe details for the expanded node card
      outputRatePerMachine: recipe?.outputRate || 0,
      inputDetails: (recipe?.inputs || []).map(inp => ({
        itemId: inp.itemId,
        name: items[inp.itemId]?.name || inp.itemId,
        imageUrl: items[inp.itemId]?.imageUrl,
        ratePerMachine: inp.rate,
      })),
      byproductDetails: (recipe?.byproducts || []).map(bp => ({
        itemId: bp.itemId,
        name: items[bp.itemId]?.name || bp.itemId,
        imageUrl: items[bp.itemId]?.imageUrl,
        ratePerMachine: bp.rate,
      })),
      powerPerMachine: machineInfo?.powerUsage || 0,
      isAlternate: recipe?.isAlternate || false,
    };
  }

  function traverseAggregated(node: SolverNode): string {
    const nodeId = generateId();
    nodeList.push({
      id: nodeId, type: 'machine', position: { x: 0, y: 0 },
      data: buildNodeData(
        node, node.machines, node.rate,
        `${machines[node.machineId].name} x${Math.ceil(node.machines * 10) / 10}`
      ),
    });
    for (const child of node.inputs) {
      const childId = traverseAggregated(child);
      edgeList.push(createEdge(`e-${childId}-${nodeId}`, childId, nodeId, getBeltLabel(child.rate), child.itemId));
    }
    return nodeId;
  }

  function traverseExpanded(node: SolverNode): { id: string; rate: number }[] {
    const totalMachines = node.machines;
    const outputRatePerMachine = node.rate / node.machines;

    // Determine chunk size based on belt capacity
    let maxInputRatePerMachine = 0;
    for (const child of node.inputs) {
      maxInputRatePerMachine = Math.max(maxInputRatePerMachine, child.rate / node.machines);
    }
    let maxMachinesPerBelt = Infinity;
    if (outputRatePerMachine > 0) maxMachinesPerBelt = Math.min(maxMachinesPerBelt, Math.floor(beltCapacity / outputRatePerMachine));
    if (maxInputRatePerMachine > 0) maxMachinesPerBelt = Math.min(maxMachinesPerBelt, Math.floor(beltCapacity / maxInputRatePerMachine));

    const chunkSize = Math.max(1, Math.min(12, maxMachinesPerBelt));
    const numChunks = Math.ceil(totalMachines / chunkSize);
    const myChunks: { id: string; rate: number }[] = [];

    for (let i = 0; i < numChunks; i++) {
      const nodeId = generateId();
      const isLast = i === numChunks - 1;
      const machinesInChunk = isLast && (totalMachines % chunkSize !== 0) ? (totalMachines % chunkSize) : chunkSize;
      const thisRate = outputRatePerMachine * machinesInChunk;
      myChunks.push({ id: nodeId, rate: thisRate });

      const label = machinesInChunk === 1
        ? machines[node.machineId].name
        : `${machines[node.machineId].name} x${Math.ceil(machinesInChunk * 10) / 10}`;

      nodeList.push({
        id: nodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(node, machinesInChunk, thisRate, label),
      });
    }

    // Connect child recipe steps → my chunks with DIRECT edges
    for (const child of node.inputs) {
      const childChunks = traverseExpanded(child);

      if (childChunks.length === 1 && myChunks.length === 1) {
        edgeList.push(createEdge(
          `e-${childChunks[0].id}-${myChunks[0].id}`,
          childChunks[0].id, myChunks[0].id,
          getBeltLabel(child.rate), child.itemId
        ));
      } else {
        // Ensure EVERY chunk on both sides has at least one connection.
        // Iterate over the larger set and map proportionally to the smaller set.
        const maxLen = Math.max(childChunks.length, myChunks.length);
        const connected = new Set<string>();
        for (let i = 0; i < maxLen; i++) {
          const ci = Math.min(Math.floor(i * childChunks.length / maxLen), childChunks.length - 1);
          const pi = Math.min(Math.floor(i * myChunks.length / maxLen), myChunks.length - 1);
          const key = `${ci}-${pi}`;
          if (connected.has(key)) continue;
          connected.add(key);
          edgeList.push(createEdge(
            `e-${childChunks[ci].id}-${myChunks[pi].id}`,
            childChunks[ci].id, myChunks[pi].id,
            getBeltLabel(childChunks[ci].rate), child.itemId
          ));
        }
      }
    }

    return myChunks;
  }

  if (mode === 'expanded') {
    traverseExpanded(root);
  } else {
    traverseAggregated(root);
  }

  // Apply Dagre layout — use taller nodes to accommodate recipe details
  const NODE_W = 320;
  const NODE_H = 160;
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 120 });

  nodeList.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_W, height: NODE_H });
  });
  edgeList.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodeList.forEach((node) => {
    const pos = dagreGraph.node(node.id);
    node.position = { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 };
  });

  return { nodes: nodeList, edges: edgeList };
}
