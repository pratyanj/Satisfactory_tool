import type { Edge, Node } from '@xyflow/react';
import { items } from '../../data';
import { mapSolverResultToGraph } from '../../graphMapper';
import type { PowerPlanResult } from '../../../types/power';
import { GENERATOR_IMAGE_BY_FUEL, LOCAL_GENERATOR_IMAGE_BY_FUEL } from '../powerAssets';

function getNodeBounds(nodes: Node[]) {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerY: 0 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    const x = node.position.x;
    const y = node.position.y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY, centerY: (minY + maxY) / 2 };
}

function buildNodeData(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    label: '',
    item: '',
    machines: 1,
    rate: 0,
    machineId: '',
    itemId: '',
    itemImageUrl: undefined,
    outputRatePerMachine: 0,
    inputDetails: [],
    byproductDetails: [],
    powerPerMachine: 0,
    isAlternate: false,
    ...overrides,
  };
}

export function mapPowerPlanToGraph(plan: PowerPlanResult): { nodes: Node[]; edges: Edge[] } {
  let nodes: Node[] = [];
  let edges: Edge[] = [];

  if (plan.fuelChainRoot) {
    const mapped = mapSolverResultToGraph(plan.fuelChainRoot, 'aggregated', 'mk5');
    nodes = mapped.nodes;
    edges = mapped.edges;
  }

  const bounds = getNodeBounds(nodes);
  const generatorId = 'power-node-generator';
  const fuelNode = nodes.find((node) => node.data?.itemId === plan.fuelItemId);

  const generatorX = Math.max(bounds.maxX + 460, 420);
  const generatorY = fuelNode ? fuelNode.position.y : bounds.centerY;
  const generatorImageUrl = GENERATOR_IMAGE_BY_FUEL[plan.input.fuelType];
  const generatorImageLocalFallback = LOCAL_GENERATOR_IMAGE_BY_FUEL[plan.input.fuelType];

  nodes.push({
    id: generatorId,
    type: 'machine',
    position: { x: generatorX, y: generatorY },
    data: buildNodeData({
      label: `${plan.generatorMachineName} x${plan.generatorCount}`,
      machineName: plan.generatorMachineName,
      machineId: 'power_virtual_generator',
      machineImageUrl: generatorImageUrl,
      machineSecondaryImageUrl: generatorImageLocalFallback,
      machines: plan.generatorCount,
      item: 'Power Output',
      itemId: 'power_output',
      rate: plan.plannedPowerMW,
      outputRatePerMachine: plan.perGeneratorPowerMW,
      inputDetails: [
        ...(plan.fuelItemId
          ? [{
              itemId: plan.fuelItemId,
              name: items[plan.fuelItemId]?.name || plan.fuelItemId,
              imageUrl: items[plan.fuelItemId]?.imageUrl,
              ratePerMachine: plan.generatorCount > 0 ? plan.fuelRatePerMin / plan.generatorCount : 0,
            }]
          : []),
        ...(plan.generatorWaterRatePerMin > 0
          ? [{
              itemId: 'water',
              name: 'Water',
              imageUrl: items.water?.imageUrl,
              ratePerMachine: plan.generatorCount > 0 ? plan.generatorWaterRatePerMin / plan.generatorCount : 0,
            }]
          : []),
      ],
      powerPerMachine: 0,
    }),
  });

  if (plan.fuelItemId && plan.fuelRatePerMin > 0) {
    const fuelSourceId = fuelNode?.id || 'power-node-fuel-source';
    if (!fuelNode) {
      nodes.push({
        id: fuelSourceId,
        type: 'machine',
        position: { x: generatorX - 460, y: generatorY - 140 },
        data: buildNodeData({
          label: `${items[plan.fuelItemId]?.name || plan.fuelItemId} Supply`,
          machineName: `${items[plan.fuelItemId]?.name || plan.fuelItemId} Supply`,
          machineId: 'power_virtual_fuel_source',
          machines: 1,
          item: items[plan.fuelItemId]?.name || plan.fuelItemId,
          itemId: plan.fuelItemId,
          itemImageUrl: items[plan.fuelItemId]?.imageUrl,
          rate: plan.fuelRatePerMin,
          outputRatePerMachine: plan.fuelRatePerMin,
        }),
      });
    }

    edges.push({
      id: `power-edge-fuel-to-generator`,
      source: fuelSourceId,
      target: generatorId,
      label: `${plan.fuelRatePerMin.toFixed(1)}/min`,
      type: 'satisfactory',
      data: {
        rate: plan.fuelRatePerMin,
        isOverloaded: false,
        itemImageUrl: plan.fuelItemId ? items[plan.fuelItemId]?.imageUrl : undefined,
      },
    });
  }

  if (plan.generatorWaterRatePerMin > 0) {
    const waterNodeId = 'power-node-water-extractors';
    const waterExtractorCount = Math.max(1, Math.ceil(plan.generatorWaterRatePerMin / 120));
    nodes.push({
      id: waterNodeId,
      type: 'machine',
      position: { x: generatorX - 460, y: generatorY + 180 },
      data: buildNodeData({
        label: `Water Extractor x${waterExtractorCount}`,
        machineName: 'Water Extractor',
        machineId: 'water_extractor',
        machines: waterExtractorCount,
        item: 'Water',
        itemId: 'water',
        itemImageUrl: items.water?.imageUrl,
        rate: plan.generatorWaterRatePerMin,
        outputRatePerMachine: 120,
        powerPerMachine: 20,
      }),
    });

    edges.push({
      id: `power-edge-water-to-generator`,
      source: waterNodeId,
      target: generatorId,
      label: `${plan.generatorWaterRatePerMin.toFixed(1)}/min (Pipe)`,
      type: 'satisfactory',
      style: { stroke: '#38bdf8', strokeWidth: 4 },
      data: {
        rate: plan.generatorWaterRatePerMin,
        isOverloaded: false,
        itemImageUrl: items.water?.imageUrl,
      },
    });
  }

  return { nodes, edges };
}
