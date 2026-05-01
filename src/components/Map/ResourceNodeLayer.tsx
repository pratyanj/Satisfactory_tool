/**
 * ResourceNodeLayer.tsx
 * Renders static resource node locations as diamond-shaped colored markers.
 * Nodes are loaded from public/data/resource_nodes.json (fetched once).
 * Visible even without a save file loaded.
 */
import React, { useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { gameToLatLng } from './mapUtils';

// ─── Resource types & colors ──────────────────────────────────────────────────
const RESOURCE_COLORS: Record<string, string> = {
  iron:      '#94a3b8',
  copper:    '#f97316',
  limestone: '#d4c5a9',
  coal:      '#374151',
  oil:       '#7c3aed',
  sulfur:    '#facc15',
  bauxite:   '#dc2626',
  quartz:    '#e879f9',
  uranium:   '#4ade80',
  caterium:  '#fbbf24',
  sam:       '#06b6d4',
  nitrogen:  '#60a5fa',
  water:     '#38bdf8',
  default:   '#6b7280',
};

const PURITY_SIZE: Record<string, number> = {
  impure: 7,
  normal: 10,
  pure:   14,
};

interface ResourceNode {
  type: string;
  purity: string;
  x: number;
  y: number;
  z: number;
}

function createNodeIcon(type: string, purity: string): L.DivIcon {
  const color = RESOURCE_COLORS[type.toLowerCase()] ?? RESOURCE_COLORS.default;
  const size  = PURITY_SIZE[purity.toLowerCase()] ?? 10;

  return L.divIcon({
    className: '',
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    html: `
      <div class="rn-diamond" style="
        width:${size * 1.4}px;
        height:${size * 1.4}px;
        background:${color};
        border-color:${color}44;
        box-shadow:0 0 ${size / 2}px ${color}66;
      "></div>
    `,
  });
}

let nodesCache: ResourceNode[] | null = null;

async function fetchNodes(): Promise<ResourceNode[]> {
  if (nodesCache) return nodesCache;
  try {
    const res = await fetch('/data/resource_nodes.json');
    nodesCache = await res.json();
    return nodesCache!;
  } catch {
    nodesCache = [];
    return [];
  }
}

export function ResourceNodeLayer() {
  const [nodes, setNodes] = useState<ResourceNode[]>([]);

  useEffect(() => {
    fetchNodes().then(setNodes);
  }, []);

  return (
    <>
      {nodes.map((node, i) => {
        const color = RESOURCE_COLORS[node.type.toLowerCase()] ?? RESOURCE_COLORS.default;
        return (
          <React.Fragment key={`rn-${i}`}>
            <Marker
              position={gameToLatLng(node.x, node.y)}
              icon={createNodeIcon(node.type, node.purity)}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="rn-tooltip">
                  <span className="rn-tooltip-dot" style={{ background: color }} />
                  <span className="rn-tooltip-type">{node.type}</span>
                  <span className="rn-tooltip-purity">{node.purity}</span>
                </div>
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
