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

  function createEdge(
    id: string,
    source: string,
    target: string,
    label?: string,
    itemId?: string,
    splitIndex?: number,
    totalSplits?: number
  ): Edge {
    const rate = label ? parseFloat(label) : 0;
    const isOverloaded = rate > beltCapacity;
    const item = itemId ? items[itemId] : null;
    return {
      id, source, target, label, type: 'satisfactory',
      data: { 
        rate, 
        isOverloaded, 
        itemImageUrl: item?.imageUrl,
        splitIndex,
        totalSplits
      },
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

  function traverseAggregated(rootNode: SolverNode) {
    // 1. Group nodes by itemId and aggregate their properties to create a clean Directed Acyclic Graph (DAG)
    const aggregatedNodes = new Map<string, {
      node: SolverNode;
      totalRate: number;
      totalMachines: number;
    }>();

    const walk = (n: SolverNode) => {
      const key = n.itemId;
      const existing = aggregatedNodes.get(key);
      if (existing) {
        existing.totalRate += n.rate;
        existing.totalMachines += n.machines;
      } else {
        aggregatedNodes.set(key, {
          node: n,
          totalRate: n.rate,
          totalMachines: n.machines,
        });
      }
      for (const input of n.inputs) {
        walk(input);
      }
    };
    walk(rootNode);

    // 2. Generate unique Node IDs for each unique itemId
    const itemIdToNodeId = new Map<string, string>();
    aggregatedNodes.forEach((data, itemId) => {
      const nodeId = generateId();
      itemIdToNodeId.set(itemId, nodeId);

      nodeList.push({
        id: nodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(
          data.node,
          data.totalMachines,
          data.totalRate,
          `${machines[data.node.machineId].name} x${Math.ceil(data.totalMachines * 10) / 10}`
        ),
      });
    });

    // 3. Aggregate edge flows between itemIds to prevent duplicate edge lines
    const edgeFlows = new Map<string, {
      sourceItemId: string;
      targetItemId: string;
      totalRate: number;
    }>();

    const walkEdges = (n: SolverNode) => {
      for (const input of n.inputs) {
        const key = `${input.itemId}->${n.itemId}`;
        const existing = edgeFlows.get(key);
        if (existing) {
          existing.totalRate += input.rate;
        } else {
          edgeFlows.set(key, {
            sourceItemId: input.itemId,
            targetItemId: n.itemId,
            totalRate: input.rate,
          });
        }
        walkEdges(input);
      }
    };
    walkEdges(rootNode);

    // 4. Create single aggregated edges
    edgeFlows.forEach((flow) => {
      const sourceNodeId = itemIdToNodeId.get(flow.sourceItemId);
      const targetNodeId = itemIdToNodeId.get(flow.targetItemId);
      if (sourceNodeId && targetNodeId) {
        edgeList.push(createEdge(
          `e-${sourceNodeId}-${targetNodeId}`,
          sourceNodeId,
          targetNodeId,
          getBeltLabel(flow.totalRate),
          flow.sourceItemId
        ));
      }
    });
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
    
    // Capped at 16 visual parallel chunks max per recipe node to avoid browser memory blowout
    const numChunks = Math.min(16, Math.ceil(totalMachines / chunkSize));
    const myChunks: { id: string; rate: number }[] = [];

    const machinesPerChunk = totalMachines / numChunks;
    const ratePerChunk = node.rate / numChunks;

    for (let i = 0; i < numChunks; i++) {
      const nodeId = generateId();
      myChunks.push({ id: nodeId, rate: ratePerChunk });

      const label = machinesPerChunk === 1
        ? machines[node.machineId].name
        : `${machines[node.machineId].name} x${Math.ceil(machinesPerChunk * 10) / 10}`;

      nodeList.push({
        id: nodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(node, machinesPerChunk, ratePerChunk, label),
      });
    }

    // Connect child recipe steps → my chunks with DIRECT edges
    for (const child of node.inputs) {
      const childChunks = traverseExpanded(child);

      if (childChunks.length === 1 && myChunks.length === 1) {
        if (child.rate > beltCapacity) {
          const numBelts = Math.ceil(child.rate / beltCapacity);
          const splitRate = child.rate / numBelts;
          for (let i = 0; i < numBelts; i++) {
            edgeList.push(createEdge(
              `e-${childChunks[0].id}-${myChunks[0].id}-${i}`,
              childChunks[0].id, myChunks[0].id,
              `${splitRate.toFixed(1)}/min`,
              child.itemId,
              i,
              numBelts
            ));
          }
        } else {
          edgeList.push(createEdge(
            `e-${childChunks[0].id}-${myChunks[0].id}`,
            childChunks[0].id, myChunks[0].id,
            getBeltLabel(child.rate), child.itemId
          ));
        }
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

          const edgeRate = childChunks[ci].rate;
          if (edgeRate > beltCapacity) {
            const numBelts = Math.ceil(edgeRate / beltCapacity);
            const splitRate = edgeRate / numBelts;
            for (let k = 0; k < numBelts; k++) {
              edgeList.push(createEdge(
                `e-${childChunks[ci].id}-${myChunks[pi].id}-${k}`,
                childChunks[ci].id, myChunks[pi].id,
                `${splitRate.toFixed(1)}/min`,
                child.itemId,
                k,
                numBelts
              ));
            }
          } else {
            edgeList.push(createEdge(
              `e-${childChunks[ci].id}-${myChunks[pi].id}`,
              childChunks[ci].id, myChunks[pi].id,
              getBeltLabel(edgeRate), child.itemId
            ));
          }
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
  const NODE_W = 340;
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
