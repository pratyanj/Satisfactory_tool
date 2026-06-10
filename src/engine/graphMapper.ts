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
  // Producer chunk ids per item — used to wire overflow into the AWESOME Sink (expanded view).
  const itemProducerChunks = new Map<string, { id: string; rate: number }[]>();
  const beltCapacity = belts[beltId]?.capacity || 60;
  const beltName = belts[beltId]?.name || 'Mk.1 Belt';
  const pipeCapacity = pipeTier === 'mk2' ? 600 : 300;

  // Transport tiers, ascending — used to recommend the cheapest belt/pipe that
  // carries a line on a SINGLE lane.
  const beltTiers = Object.values(belts)
    .map(b => ({ name: b.name, capacity: b.capacity }))
    .sort((a, b) => a.capacity - b.capacity);
  const pipeTiers = [{ name: 'Mk.1 Pipe', capacity: 300 }, { name: 'Mk.2 Pipe', capacity: 600 }];

  /** Belt/pipe metrics for a flow: lanes needed, how full they run, and the
   *  smallest tier that would carry it on one lane. */
  function transportMetrics(rate: number, fluid: boolean) {
    const capacity = fluid ? pipeCapacity : beltCapacity;
    const tiers = fluid ? pipeTiers : beltTiers;
    const lanes = Math.max(1, Math.ceil(rate / capacity - 1e-9));
    const utilizationPct = Math.round((rate / (lanes * capacity)) * 100);
    // Cheapest tier whose single lane covers the whole flow.
    const fit = tiers.find(t => rate <= t.capacity + 1e-9);
    const recommendedTier = lanes > 1 && fit ? fit.name : null;
    return { lanes, utilizationPct, recommendedTier };
  }
  const pipeName = pipeTier === 'mk2' ? 'Mk.2 Pipe' : 'Mk.1 Pipe';

  // Fluids/gases travel by pipe; everything else by belt. Pick the matching
  // transport capacity & name so labels and overload flags stay accurate.
  // Just the rate — lane count / tier / utilization are carried in edge.data and
  // rendered by the edge component (see transportMetrics + SatisfactoryEdge).
  function getFlowLabel(rate: number, _itemId?: string): string {
    return `${rate.toFixed(1)}/min`;
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
    const { lanes, utilizationPct, recommendedTier } = transportMetrics(rate, isFluid);
    return {
      id, source, target, label, type: 'satisfactory',
      data: {
        rate,
        isOverloaded,
        isFluid,
        itemImageUrl: item?.imageUrl,
        splitIndex,
        totalSplits,
        // Belt/pipe planning info (B): how many lanes of the SELECTED tier this
        // needs, how full they run, the tier name, and an upgrade suggestion.
        lanes,
        utilizationPct,
        transportName: isFluid ? pipeName : beltName,
        transportNoun: isFluid ? 'Pipe' : 'Belt',
        recommendedTier,
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

        // The flow into a consumer is what it DEMANDS, not what the producer makes.
        // In whole-machine mode a producer over-produces; the surplus (overflowRate)
        // goes to the AWESOME Sink on a separate edge, so subtract it here.
        const consumedRate = input.rate - (input.overflowRate ?? 0);
        const key = `${input.itemId}->${n.itemId}`;
        const existing = edgeFlows.get(key);
        if (existing) {
          existing.totalRate += consumedRate;
        } else {
          edgeFlows.set(key, {
            sourceItemId: input.itemId,
            targetItemId: n.itemId,
            totalRate: consumedRate,
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
        // The delivered product is the requested target, not the (possibly ceiled)
        // production — the surplus is split off to the sink.
        const deliveredRate = targetInput.rate - (targetInput.overflowRate ?? 0);
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
                rate: deliveredRate,
                machines: 0,
                machineId: 'product_output',
                inputs: [],
              },
              0,
              deliveredRate,
              `${deliveredRate.toFixed(1)} ${items[targetInput.itemId]?.name || targetInput.itemId}`
            ),
          });
          edgeList.push(createEdge(
            `e-${targetInput.itemId}-to-product-output`,
            targetNodeId,
            productNodeId,
            getFlowLabel(deliveredRate, targetInput.itemId),
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

    // 6. AWESOME Sink — overflow / excess routed for ticket generation. Connect
    //    each surplus item's producer node into a single sink node.
    const sinkNode = rootNode.itemId === 'planned_outputs'
      ? rootNode.inputs.find(i => i.itemId === 'awesome_sink')
      : undefined;
    if (sinkNode && sinkNode.inputs.length > 0) {
      const sinkNodeId = 'awesome-sink';
      nodeList.push({
        id: sinkNodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(sinkNode, sinkNode.machines, sinkNode.rate, `AWESOME Sink x${Math.ceil(sinkNode.machines * 10) / 10}`),
      });
      for (const sinkInput of sinkNode.inputs) {
        const producerNodeId = itemIdToNodeId.get(sinkInput.itemId);
        if (producerNodeId) {
          edgeList.push(createEdge(
            `e-${producerNodeId}-to-sink-${sinkInput.itemId}`,
            producerNodeId, sinkNodeId,
            getFlowLabel(sinkInput.rate, sinkInput.itemId), sinkInput.itemId
          ));
        }
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
    const baseClock = node.clockSpeed ?? 100;

    // Determine chunk size based on belt capacity
    let maxInputRatePerMachine = 0;
    for (const child of node.inputs) {
      maxInputRatePerMachine = Math.max(maxInputRatePerMachine, child.rate / node.machines);
    }
    let maxMachinesPerBelt = Infinity;
    if (outputRatePerMachine > 0) maxMachinesPerBelt = Math.min(maxMachinesPerBelt, Math.floor(beltCapacity / outputRatePerMachine));
    if (maxInputRatePerMachine > 0) maxMachinesPerBelt = Math.min(maxMachinesPerBelt, Math.floor(beltCapacity / maxInputRatePerMachine));

    let chunkSize = Math.max(1, Math.min(12, maxMachinesPerBelt));

    // Machine view should show WHOLE machines: split the integer machine count
    // into chunks of `chunkSize`, and represent any fractional remainder as a
    // single machine UNDERCLOCKED to that fraction (e.g. 0.5 → 1 machine @ 50%).
    const wholeMachines = Math.floor(totalMachines + 1e-6);
    const fracMachine = totalMachines - wholeMachines;

    // Cap whole-machine chunks at ~16 visual nodes (grow chunk size if needed).
    const maxWholeChunks = 16 - (fracMachine > 1e-6 ? 1 : 0);
    if (wholeMachines > 0 && Math.ceil(wholeMachines / chunkSize) > maxWholeChunks) {
      chunkSize = Math.ceil(wholeMachines / Math.max(1, maxWholeChunks));
    }

    type ChunkPlan = { machines: number; clock: number; rate: number };
    const plan: ChunkPlan[] = [];
    let remaining = wholeMachines;
    while (remaining > 0) {
      const c = Math.min(chunkSize, remaining);
      plan.push({ machines: c, clock: baseClock, rate: c * outputRatePerMachine });
      remaining -= c;
    }
    if (fracMachine > 1e-6) {
      plan.push({
        machines: 1,
        clock: Math.round(fracMachine * baseClock * 1000) / 1000,
        rate: fracMachine * outputRatePerMachine,
      });
    }
    if (plan.length === 0) {
      // Degenerate fallback (e.g. zero-output node) — show it as-is.
      plan.push({ machines: totalMachines, clock: baseClock, rate: node.rate });
    }

    const myChunks: { id: string; rate: number }[] = [];
    const machineName = machines[node.machineId]?.name || (node.machineId === 'planned_outputs' ? 'Planned Outputs' : node.machineId);
    for (const ch of plan) {
      const nodeId = generateId();
      myChunks.push({ id: nodeId, rate: ch.rate });
      const label = ch.machines === 1
        ? machineName
        : `${machineName} x${Math.round(ch.machines * 10) / 10}`;
      nodeList.push({
        id: nodeId, type: 'machine', position: { x: 0, y: 0 },
        // Clone with the chunk's clock so the underclocked remainder shows its badge.
        data: buildNodeData({ ...node, clockSpeed: ch.clock }, ch.machines, ch.rate, label),
      });
    }
    // Record producer chunks per item so the AWESOME Sink can be wired up later.
    itemProducerChunks.set(node.itemId, (itemProducerChunks.get(node.itemId) || []).concat(myChunks));

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

    // Connect child recipe steps → my chunks with DIRECT edges. The flow to the
    // parent is the consumed amount (production minus any overflow that's split
    // off to the AWESOME Sink), so labels reflect real demand not over-production.
    for (const child of node.inputs) {
      const childChunks = traverseExpanded(child);
      if (childChunks.length === 0) continue;

      const childConsumed = child.rate - (child.overflowRate ?? 0);
      const consumedFraction = child.rate > 0 ? childConsumed / child.rate : 1;

      if (childChunks.length === 1 && myChunks.length === 1) {
        edgeList.push(createEdge(
          `e-${childChunks[0].id}-${myChunks[0].id}`,
          childChunks[0].id, myChunks[0].id,
          getFlowLabel(childConsumed, child.itemId), child.itemId
        ));
      } else {
        // Ensure EVERY chunk on both sides has at least one connection. Build the
        // unique (child→parent) pairs first, then divide each child chunk's consumed
        // output evenly across the parent chunks it feeds — so the edge labels sum
        // EXACTLY to the consumed flow (no double-counting / over-stated belts).
        const maxLen = Math.max(childChunks.length, myChunks.length);
        const pairs: Array<{ ci: number; pi: number }> = [];
        const seen = new Set<string>();
        const outDegree: number[] = new Array(childChunks.length).fill(0);
        for (let i = 0; i < maxLen; i++) {
          const ci = Math.min(Math.floor(i * childChunks.length / maxLen), childChunks.length - 1);
          const pi = Math.min(Math.floor(i * myChunks.length / maxLen), myChunks.length - 1);
          const key = `${ci}-${pi}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pairs.push({ ci, pi });
          outDegree[ci]++;
        }
        for (const { ci, pi } of pairs) {
          const edgeRate = (childChunks[ci].rate * consumedFraction) / Math.max(1, outDegree[ci]);
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

    // AWESOME Sink — wire overflow into a single sink node from each surplus
    // item's producer chunks (machine view).
    const sinkNode = root.itemId === 'planned_outputs'
      ? root.inputs.find(i => i.itemId === 'awesome_sink')
      : undefined;
    if (sinkNode && sinkNode.inputs.length > 0) {
      const sinkNodeId = 'awesome-sink';
      nodeList.push({
        id: sinkNodeId, type: 'machine', position: { x: 0, y: 0 },
        data: buildNodeData(sinkNode, sinkNode.machines, sinkNode.rate, `AWESOME Sink x${Math.ceil(sinkNode.machines * 10) / 10}`),
      });
      for (const sinkInput of sinkNode.inputs) {
        const producers = itemProducerChunks.get(sinkInput.itemId) || [];
        if (producers.length === 0) continue;
        const perProducer = sinkInput.rate / producers.length;
        producers.forEach((chunk, i) => {
          edgeList.push(createEdge(
            `e-${chunk.id}-to-sink-${sinkInput.itemId}-${i}`,
            chunk.id, sinkNodeId,
            getFlowLabel(perProducer, sinkInput.itemId), sinkInput.itemId
          ));
        });
      }
    }
  } else {
    traverseAggregated(root);
  }

  // Apply Dagre layout — use taller nodes to accommodate recipe details
  const NODE_W = 380;
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
