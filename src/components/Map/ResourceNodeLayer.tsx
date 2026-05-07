/**
 * ResourceNodeLayer.tsx
 * Renders resource node locations as circular image pins on the Leaflet map.
 * Nodes are loaded from public/data/resource_nodes.json (fetched + cached once).
 *
 * Sprint 4 update: accepts `activeFilters` (Map<resource, Set<purity>>)
 * for multi-select filtering. Icons are circular images with purity-colored rings.
 */
import React, { useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { gameToLatLng } from './mapUtils';

// ─── Purity ring colors ────────────────────────────────────────────────────────
const PURITY_COLORS: Record<string, string> = {
  Impure: '#dc2626',
  Normal: '#f97316',
  Pure:   '#22c55e',
};

// ─── Resource image key map ────────────────────────────────────────────────────
const RESOURCE_IMAGE_KEY: Record<string, string> = {
  'Iron Ore':     'iron_ore',
  'Copper Ore':   'copper_ore',
  'Limestone':    'limestone',
  'Coal':         'coal',
  'Crude Oil':    'crude_oil',
  'Sulfur':       'sulfur',
  'Bauxite':      'bauxite',
  'Raw Quartz':   'raw_quartz',
  'Uranium':      'uranium',
  'SAM Ore':      'sam',
  'Nitrogen Gas': 'nitrogen_gas',
  'Water':        'water',
  'Caterium Ore': 'caterium_ore',
  'Geyser':       '',
};

// ─── Pin size by purity ────────────────────────────────────────────────────────
const PURITY_PIN_SIZE: Record<string, number> = {
  Impure: 28,
  Normal: 32,
  Pure:   38,
};

// ─── Data interface ───────────────────────────────────────────────────────────
interface ResourceNode {
  id:       number;
  resource: string;
  purity:   string;
  type:     string;
  world_x:  number;
  world_y:  number;
  world_z:  number;
  map_lat:  number;
  map_lng:  number;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ResourceNodeLayerProps {
  /** Map of resource name → Set of purities to show */
  activeFilters: Map<string, Set<string>>;
}

// ─── Icon factory ─────────────────────────────────────────────────────────────
function createPinIcon(resource: string, purity: string): L.DivIcon {
  const color  = PURITY_COLORS[purity]  ?? '#6b7280';
  const size   = PURITY_PIN_SIZE[purity] ?? 32;
  const imgKey = RESOURCE_IMAGE_KEY[resource] ?? '';
  const imgSrc = imgKey ? `/images/${imgKey}.png` : '';

  const inner = imgSrc
    ? `<img src="${imgSrc}" style="width:${size - 8}px;height:${size - 8}px;object-fit:contain;border-radius:50%;display:block;" draggable="false" />`
    : `<span style="font-size:${size * 0.45}px;line-height:1;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">♨️</span>`;

  return L.divIcon({
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="rn-map-pin" style="
        width:${size}px;
        height:${size}px;
        border:3px solid ${color};
        box-shadow:0 0 8px ${color}99, 0 0 2px ${color};
        background:#1a1b1e;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        cursor:pointer;
        transition:transform 0.15s;
      ">
        ${inner}
      </div>
    `,
  });
}

// ─── Cache ────────────────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
export function ResourceNodeLayer({ activeFilters }: ResourceNodeLayerProps) {
  const [nodes, setNodes] = useState<ResourceNode[]>([]);

  useEffect(() => {
    fetchNodes().then(setNodes);
  }, []);

  // Only render if there's something active
  if (activeFilters.size === 0) return null;

  const visible = nodes.filter(node => {
    const puritySet = activeFilters.get(node.resource);
    return puritySet?.has(node.purity) ?? false;
  });

  return (
    <>
      {visible.map(node => {
        const color = PURITY_COLORS[node.purity] ?? '#6b7280';
        return (
          <React.Fragment key={`rn-${node.id}`}>
            <Marker
              position={gameToLatLng(node.world_x, node.world_y)}
              icon={createPinIcon(node.resource, node.purity)}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="rn-tooltip">
                  <span className="rn-tooltip-dot" style={{ background: color }} />
                  <span className="rn-tooltip-type">{node.resource}</span>
                  <span className="rn-tooltip-purity">{node.purity}</span>
                  <span className="rn-tooltip-coords">
                    {Math.round(node.world_x / 100)}m, {Math.round(node.world_y / 100)}m, {Math.round(node.world_z / 100)}m
                  </span>
                </div>
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
