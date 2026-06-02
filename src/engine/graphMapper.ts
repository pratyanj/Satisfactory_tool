import { Edge, Node } from '@xyflow/react';
import dagre from 'dagre';
import { belts, BeltId, items, machines, recipes, isFluidItem } from './data';
import { SolverNode } from './solver';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export type LayoutMode = 'aggregated' | 'expanded';

export function mapSolverResultToGraph(root: SolverNode, mode: LayoutMode = 'aggregated', beltId: BeltId = 'mk1', pipeTier: 'mk1' | 'mk2' = 'mk1'): { nodes: Node[]; edges: Edge[] } {
  const nodeList: Node[] = [];
  const edgeList: Edge[] = [];
  const beltCapacity = belts[beltId]?.capacity || 60;
  const beltName = belts[beltId]?.name || 'Mk.1 Belt';
  const pipeCapacity = pipeTier === 'mk2' ? 600 : 300;
  const pipeName = pipeTier === 'mk2' ? 'Mk.2 Pipe' : 'Mk.1 Pipe';

  // Fluids/gases travel by pipe; everything else by belt. Pick the matching
  // transport capacity & name so labels and overload flags stay accurate.
  function getFlowLabel(rate: number, itemId?: string): string {
    const fluid = itemId ? isFluidItem(itemId) : false;
    const capacity = fluid ? pipeCapacity : beltCapacity;
    const name = fluid ? pipeName : beltName;
    if (rate <= capacity) return `${rate.toFixed(1)}/min`;
    const linesNeeded = Math.ceil(rate / capacity);
    return `${rate.toFixed(1)}/min (${linesNeeded}x ${name})`;
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
    const isFluid = itemId ? isFluidItem(itemId) : false;
    const capacity = isFluid ? pipeCapacity : beltCapacity;
    const isOverloaded = rate > capacity;
    const item = itemId ? items[itemId] : null;
    return {
      id, source, target, label, type: 'satisfactory',
      data: {
        rate,
        isOverloaded,
        isFluid,
        itemImageUrl: item?.imageUrl,
        splitIndex,
        totalSplits
      },
      animated: true,
    };
  }

  function buildNodeData(node: SolverNode, machineCount: number, rate: number, label: string) {
    const recipe = node.recipeId === 'product_output' ? undefined : (recipes.find(r => r.id === node.recipeId) || recipes.find(r => r.outputItemId === node.itemId));
    const machineInfo = machines[node.machineId] || {
      id: node.machineId,
      name: node.machineId === 'planned_outputs' ? 'Planned Outputs' : node.machineId === 'byproduct_reused' ? 'Recycled Byproduct' : node.machineId,
      powerUsage: 0,
      imageUrl: '',
    };
    const itemInfo = items[node.itemId] || {
      id: node.itemId,
      name: node.itemId === 'planned_outputs' ? 'Planned Outputs' : node.itemId === 'awesome_sink' ? 'AWESOME Sink' : node.itemId,
      imageUrl: node.itemId === 'awesome_sink' ? 'https://satisfactory.wiki.gg/wiki/Special:FilePath/AWESOME_Sink.png' : undefined,
    };

    const clock = node.clockSpeed ?? 100;
    const isSomerslooped = node.somerslooped ?? false;
    const speedMultiplier = clock / 100;
    const loopMultiplier = isSomerslooped ? 2 : 1;

    const actualOutputRatePerMachine = machineCount > 0 ? (rate / machineCount) : (recipe?.outputRate || 0);
    const actualPowerUsagePerMachine = machineInfo.powerUsage * Math.pow(speedMultiplier, 1.6) * (isSomerslooped ? 4 : 1);

    return {
      label,
      item: itemInfo?.name || node.itemId,
      machines: machineCount,
      rate,
      machineId: node.machineId,
      itemId: node.itemId,
      itemImageUrl: itemInfo?.imageUrl,
      clockSpeed: clock,
      somerslooped: isSomerslooped,
      // Recipe details for the expanded node card
      outputRatePerMachine: actualOutputRatePerMachine,
      inputDetails: (recipe?.inputs || []).map(inp => ({
        itemId: inp.itemId,
        name: items[inp.itemId]?.name || inp.itemId,
        imageUrl: items[inp.itemId]?.imageUrl,
        ratePerMachine: inp.rate * speedMultiplier,
      })),
      byproductDetails: (recipe?.byproducts || []).map(bp => ({
        itemId: bp.itemId,
        name: items[bp.itemId]?.name || bp.itemId,
        imageUrl: items[bp.itemId]?.imageUrl,
        ratePerMachine: bp.rate * speedMultiplier * loopMultiplier,
      })),
      powerPerMachine: actualPowerUsagePerMachine,
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
      if (key === 'planned_outputs') {
        for (const input of n.inputs) {
          walk(input);
        }
        return;
      }
      // Excess byproducts are surfaced as their own "Byproduct: X" bubbles below,
      // so skip the AWESOME Sink collector node and its sink inputs.
      if (key === 'awesome_sink' || n.machineId === 'awesome_sink') return;

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

      const machineName = machines[data.node.machineId]?.name || (data.node.machineId === 'planned_outputs' ? 'Planned Outputs' : data.node.machineId);
      nodeList.push({
        id: nodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(
          data.node,
          data.totalMachines,
          data.totalRate,
          data.node.machineId === 'planned_outputs' ? 'Planned Outputs' : `${machineName} x${Math.ceil(data.totalMachines * 10) / 10}`
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
      if (n.itemId === 'awesome_sink' || n.machineId === 'awesome_sink') return;
      // Connect inputs
      for (const input of n.inputs) {
        if (n.itemId === 'planned_outputs') {
          walkEdges(input);
          continue;
        }

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

      // Route byproducts as active resource recycle edges
      if (n.byproducts && n.byproducts.length > 0) {
        for (const bp of n.byproducts) {
          const key = `${n.itemId}->${bp.itemId}`;
          const existing = edgeFlows.get(key);
          if (existing) {
            existing.totalRate += bp.rate;
          } else {
            edgeFlows.set(key, {
              sourceItemId: n.itemId,
              targetItemId: bp.itemId,
              totalRate: bp.rate,
            });
          }
        }
      }
    };
    walkEdges(rootNode);

    // 3b. Any byproduct flow whose target item has no producing machine is an
    // unconsumed byproduct — surface it as a terminal "Byproduct: X" bubble so it
    // is never silently dropped.
    const unconsumedByproductRates = new Map<string, number>();
    edgeFlows.forEach((flow) => {
      if (!itemIdToNodeId.has(flow.targetItemId)) {
        unconsumedByproductRates.set(
          flow.targetItemId,
          (unconsumedByproductRates.get(flow.targetItemId) || 0) + flow.totalRate
        );
      }
    });
    unconsumedByproductRates.forEach((rate, itemId) => {
      const bpNodeId = `byproduct-output-${itemId}`;
      itemIdToNodeId.set(itemId, bpNodeId);
      nodeList.push({
        id: bpNodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(
          { itemId, recipeId: 'product_output', rate, machines: 0, machineId: 'byproduct_output', inputs: [] },
          0, rate, `Byproduct: ${items[itemId]?.name || itemId}`
        ),
      });
    });

    // 4. Create single aggregated edges
    edgeFlows.forEach((flow) => {
      const sourceNodeId = itemIdToNodeId.get(flow.sourceItemId);
      const targetNodeId = itemIdToNodeId.get(flow.targetItemId);
      if (sourceNodeId && targetNodeId) {
        edgeList.push(createEdge(
          `e-${sourceNodeId}-${targetNodeId}`,
          sourceNodeId,
          targetNodeId,
          getFlowLabel(flow.totalRate, flow.sourceItemId),
          flow.sourceItemId
        ));
      }
    });

    // 5. Inject product output bubbles
    if (rootNode.itemId === 'planned_outputs') {
      rootNode.inputs.forEach((targetInput) => {
        if (targetInput.itemId === 'awesome_sink') return;
        const productNodeId = `product-output-${targetInput.itemId}`;
        const targetNodeId = itemIdToNodeId.get(targetInput.itemId);
        if (targetNodeId) {
          nodeList.push({
            id: productNodeId,
            type: 'machine',
            position: { x: 0, y: 0 },
            data: buildNodeData(
              {
                itemId: targetInput.itemId,
                recipeId: 'product_output',
                rate: targetInput.rate,
                machines: 0,
                machineId: 'product_output',
                inputs: [],
              },
              0,
              targetInput.rate,
              `${targetInput.rate.toFixed(1)} ${items[targetInput.itemId]?.name || targetInput.itemId}`
            ),
          });
          edgeList.push(createEdge(
            `e-${targetInput.itemId}-to-product-output`,
            targetNodeId,
            productNodeId,
            getFlowLabel(targetInput.rate, targetInput.itemId),
            targetInput.itemId
          ));
        }
      });
    } else {
      const productNodeId = `product-output-${rootNode.itemId}`;
      const targetNodeId = itemIdToNodeId.get(rootNode.itemId);
      if (targetNodeId) {
        nodeList.push({
          id: productNodeId,
          type: 'machine',
          position: { x: 0, y: 0 },
          data: buildNodeData(
            {
              itemId: rootNode.itemId,
              recipeId: 'product_output',
              rate: rootNode.rate,
              machines: 0,
              machineId: 'product_output',
              inputs: [],
            },
            0,
            rootNode.rate,
            `${rootNode.rate.toFixed(1)} ${items[rootNode.itemId]?.name || rootNode.itemId}`
          ),
        });
        edgeList.push(createEdge(
          `e-${rootNode.itemId}-to-product-output`,
          targetNodeId,
          productNodeId,
          getFlowLabel(rootNode.rate, rootNode.itemId),
          rootNode.itemId
        ));
      }
    }
  }

  function traverseExpanded(node: SolverNode): { id: string; rate: number }[] {
    if (node.itemId === 'planned_outputs') {
      node.inputs.forEach((child) => {
        if (child.itemId === 'awesome_sink') {
          return; // excess byproducts are surfaced as per-recipe "Byproduct: X" bubbles
        }
        const childChunks = traverseExpanded(child);
        const productNodeId = `product-output-${child.itemId}`;
        const itemInfo = items[child.itemId];
        nodeList.push({
          id: productNodeId,
          type: 'machine',
          position: { x: 0, y: 0 },
          data: buildNodeData(
            {
              itemId: child.itemId,
              recipeId: 'product_output',
              rate: child.rate,
              machines: 0,
              machineId: 'product_output',
              inputs: [],
            },
            0,
            child.rate,
            `${child.rate.toFixed(1)} ${itemInfo?.name || child.itemId}`
          ),
        });

        childChunks.forEach((chunk) => {
          edgeList.push(createEdge(
            `e-${chunk.id}-${productNodeId}`,
            chunk.id,
            productNodeId,
            getFlowLabel(chunk.rate, child.itemId),
            child.itemId
          ));
        });
      });
      return [];
    }

    // Recycled byproduct pulled from the pool (machines: 0) — render as a single
    // source chunk so it can feed its consumer without dividing by zero machines.
    if (node.recipeId === 'byproduct_reuse' || node.machineId === 'byproduct_reused' || node.machines <= 0) {
      const nodeId = generateId();
      nodeList.push({
        id: nodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(node, 0, node.rate, `Recycled ${items[node.itemId]?.name || node.itemId}`),
      });
      return [{ id: nodeId, rate: node.rate }];
    }

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

      const machineName = machines[node.machineId]?.name || (node.machineId === 'planned_outputs' ? 'Planned Outputs' : node.machineId);
      const label = machinesPerChunk === 1
        ? machineName
        : `${machineName} x${Math.ceil(machinesPerChunk * 10) / 10}`;

      nodeList.push({
        id: nodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(node, machinesPerChunk, ratePerChunk, label),
      });
    }

    // Surface this recipe's byproducts as terminal "Byproduct: X" bubbles so the
    // expanded view never silently drops them.
    (node.byproducts || []).forEach((bp) => {
      const bpNodeId = `byproduct-output-${node.itemId}-${bp.itemId}-${generateId()}`;
      nodeList.push({
        id: bpNodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(
          { itemId: bp.itemId, recipeId: 'product_output', rate: bp.rate, machines: 0, machineId: 'byproduct_output', inputs: [] },
          0, bp.rate, `Byproduct: ${items[bp.itemId]?.name || bp.itemId}`
        ),
      });
      const perChunk = bp.rate / myChunks.length;
      myChunks.forEach((chunk) => {
        edgeList.push(createEdge(
          `e-${chunk.id}-${bpNodeId}`, chunk.id, bpNodeId,
          getFlowLabel(perChunk, bp.itemId), bp.itemId
        ));
      });
    });

    // Connect child recipe steps → my chunks with DIRECT edges
    for (const child of node.inputs) {
      const childChunks = traverseExpanded(child);
      if (childChunks.length === 0) continue;

      if (childChunks.length === 1 && myChunks.length === 1) {
        edgeList.push(createEdge(
          `e-${childChunks[0].id}-${myChunks[0].id}`,
          childChunks[0].id, myChunks[0].id,
          getFlowLabel(child.rate, child.itemId), child.itemId
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

          const edgeRate = childChunks[ci].rate;
          edgeList.push(createEdge(
            `e-${childChunks[ci].id}-${myChunks[pi].id}`,
            childChunks[ci].id, myChunks[pi].id,
            getFlowLabel(edgeRate, child.itemId), child.itemId
          ));
        }
      }
    }

    return myChunks;
  }

  if (mode === 'expanded') {
    const rootChunks = traverseExpanded(root);
    if (root.itemId !== 'planned_outputs') {
      const productNodeId = `product-output-${root.itemId}`;
      const itemInfo = items[root.itemId];
      nodeList.push({
        id: productNodeId,
        type: 'machine',
        position: { x: 0, y: 0 },
        data: buildNodeData(
          {
            itemId: root.itemId,
            recipeId: 'product_output',
            rate: root.rate,
            machines: 0,
            machineId: 'product_output',
            inputs: [],
          },
          0,
          root.rate,
          `${root.rate.toFixed(1)} ${itemInfo?.name || root.itemId}`
        ),
      });

      rootChunks.forEach((chunk) => {
        edgeList.push(createEdge(
          `e-${chunk.id}-${productNodeId}`,
          chunk.id,
          productNodeId,
          getFlowLabel(chunk.rate, root.itemId),
          root.itemId
        ));
      });
    }
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
