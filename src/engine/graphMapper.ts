import { Edge, Node } from '@xyflow/react';
import dagre from 'dagre';
import { belts, BeltId, items, machines } from './data';
import { SolverNode } from './solver';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export type LayoutMode = 'aggregated' | 'expanded';

export function mapSolverResultToGraph(root: SolverNode, mode: LayoutMode = 'aggregated', beltId: BeltId = 'mk1'): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const beltCapacity = belts[beltId]?.capacity || 60;
  const beltName = belts[beltId]?.name || 'Mk.1 Belt';

  function getBeltLabel(rate: number): string {
    if (rate <= beltCapacity) return `${rate.toFixed(1)}/min`;
    const beltsNeeded = Math.ceil(rate / beltCapacity);
    return `${rate.toFixed(1)}/min (${beltsNeeded}x ${beltName})`;
  }

  function createEdge(id: string, source: string, target: string, label?: string): Edge {
    return {
        id,
        source,
        target,
        label,
        type: 'step',
        animated: true,
        style: { stroke: '#9ca3af', strokeWidth: 3 },
        labelStyle: { fill: '#e5e7eb', fontWeight: 600, fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#151619', rx: 4, ry: 4, stroke: '#374151', strokeWidth: 1 },
    };
  }

  function traverseAggregated(node: SolverNode): string {
    const nodeId = generateId();

    nodes.push({
      id: nodeId,
      type: 'machine',
      position: { x: 0, y: 0 },
      data: {
        label: `${machines[node.machineId].name} x${Math.ceil(node.machines * 10) / 10}`,
        item: items[node.itemId].name,
        machines: node.machines,
        rate: node.rate,
        machineId: node.machineId,
        itemId: node.itemId,
      },
    });

    for (const child of node.inputs) {
      const childId = traverseAggregated(child);
      edges.push(createEdge(`e-${childId}-${nodeId}`, childId, nodeId, getBeltLabel(child.rate)));
    }

    return nodeId;
  }

  function traverseExpanded(node: SolverNode): { id: string; rate: number }[] {
    const totalMachines = node.machines;
    const outputRatePerMachine = node.rate / node.machines;
    
    // Determine maximum inputs and output flow per machine to constrain chunking by chosen belt
    let maxInputRatePerMachine = 0;
    for (const child of node.inputs) {
      maxInputRatePerMachine = Math.max(maxInputRatePerMachine, child.rate / node.machines);
    }
    
    let maxMachinesPerBelt = Infinity;
    if (outputRatePerMachine > 0) {
      maxMachinesPerBelt = Math.min(maxMachinesPerBelt, Math.floor(beltCapacity / outputRatePerMachine));
    }
    if (maxInputRatePerMachine > 0) {
      maxMachinesPerBelt = Math.min(maxMachinesPerBelt, Math.floor(beltCapacity / maxInputRatePerMachine));
    }

    // Limit block sizes to a sensible amount (e.g., maximum 12 machines per manifold array node)
    const chunkSize = Math.max(1, Math.min(12, maxMachinesPerBelt));
    const numChunks = Math.ceil(totalMachines / chunkSize);
    const myMachinesInfo: { id: string; rate: number }[] = [];
    
    for (let i = 0; i < numChunks; i++) {
        const nodeId = generateId();
        const isLast = i === numChunks - 1;
        const machinesInThisChunk = isLast && (totalMachines % chunkSize !== 0) ? (totalMachines % chunkSize) : chunkSize;
        const thisRate = outputRatePerMachine * machinesInThisChunk;

        myMachinesInfo.push({ id: nodeId, rate: thisRate });

        nodes.push({
            id: nodeId,
            type: 'machine',
            position: { x: 0, y: 0 },
            data: {
                label: machinesInThisChunk === 1 ? machines[node.machineId].name : `${machines[node.machineId].name} Array`,
                item: items[node.itemId].name,
                machines: machinesInThisChunk,
                rate: thisRate,
                machineId: node.machineId,
                itemId: node.itemId,
            }
        });
    }

    for (const child of node.inputs) {
        const childMachines = traverseExpanded(child);
        
        if (childMachines.length === 1 && myMachinesInfo.length === 1) {
            edges.push(createEdge(
                `e-${childMachines[0].id}-${myMachinesInfo[0].id}`,
                childMachines[0].id,
                myMachinesInfo[0].id,
                getBeltLabel(child.rate)
            ));
        } else {
            let sourceNodeForMyMachines = childMachines[0].id;
            let currentSourceRate = child.rate;

            // If multiple children, they merge first (manifold style)
            if (childMachines.length > 1) {
                 let currentMainBelt = childMachines[0].id;
                 let accumulatedRate = childMachines[0].rate;

                 for (let i = 1; i < childMachines.length; i++) {
                     const cm = childMachines[i];
                     const mergerId = generateId();
                     accumulatedRate += cm.rate;
                     
                     nodes.push({
                         id: mergerId,
                         type: 'logistics',
                         position: { x: 0, y: 0 },
                         data: { type: 'merger', rate: accumulatedRate }
                     });
                     
                     // connect previous main belt (or first machine) to merger
                     edges.push(createEdge(
                         `e-${currentMainBelt}-${mergerId}`,
                         currentMainBelt,
                         mergerId,
                         getBeltLabel(accumulatedRate - cm.rate)
                     ));
                     
                     // connect child machine to merger
                     edges.push(createEdge(
                         `e-${cm.id}-${mergerId}`,
                         cm.id,
                         mergerId,
                         getBeltLabel(cm.rate)
                     ));
                     
                     currentMainBelt = mergerId;
                 }
                 sourceNodeForMyMachines = currentMainBelt;
            }

            // If multiple my machines, we need a manifold of splitters from the source
            if (myMachinesInfo.length > 1) {
                 let currentMainBelt = sourceNodeForMyMachines;
                 let remainingRate = currentSourceRate;

                 for (let i = 0; i < numChunks; i++) {
                     const m = myMachinesInfo[i];
                     const machinesInThisChunk = (i === numChunks - 1 && totalMachines % chunkSize !== 0) ? totalMachines % chunkSize : chunkSize;
                     const neededInputRate = (child.rate / totalMachines) * machinesInThisChunk;

                     if (i === numChunks - 1) {
                         // Last machine connects directly to the end of the line
                         edges.push(createEdge(
                             `e-${currentMainBelt}-${m.id}`,
                             currentMainBelt,
                             m.id,
                             getBeltLabel(neededInputRate)
                         ));
                     } else {
                         const splitterId = generateId();
                         nodes.push({
                             id: splitterId,
                             type: 'logistics',
                             position: { x: 0, y: 0 },
                             data: { type: 'splitter', rate: remainingRate }
                         });
                         
                         // Connect main belt to splitter
                         edges.push(createEdge(
                             `e-${currentMainBelt}-${splitterId}`,
                             currentMainBelt,
                             splitterId,
                             getBeltLabel(remainingRate)
                         ));
                         
                         // Connect splitter to machine
                         edges.push(createEdge(
                             `e-${splitterId}-${m.id}`,
                             splitterId,
                             m.id,
                             getBeltLabel(neededInputRate)
                         ));
                         
                         currentMainBelt = splitterId;
                         remainingRate -= neededInputRate;
                     }
                 }
            } else {
                 // Only 1 my machine, but multiple children (via merger)
                 const m = myMachinesInfo[0];
                 edges.push(createEdge(
                     `e-${sourceNodeForMyMachines}-${m.id}`,
                     sourceNodeForMyMachines,
                     m.id,
                     getBeltLabel(currentSourceRate)
                 ));
            }
        }
    }

    return myMachinesInfo;
  }

  if (mode === 'expanded') {
      traverseExpanded(root);
  } else {
      traverseAggregated(root);
  }

  // Apply Dagre layout
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 100 });

  nodes.forEach((node) => {
    const isLogistics = node.type === 'logistics';
    dagreGraph.setNode(node.id, { width: isLogistics ? 48 : 260, height: isLogistics ? 48 : 92 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isLogistics = node.type === 'logistics';
    const w = isLogistics ? 48 : 260;
    const h = isLogistics ? 48 : 92;
    node.position = {
      x: nodeWithPosition.x - w / 2,
      y: nodeWithPosition.y - h / 2,
    };
  });

  return { nodes, edges };
}
