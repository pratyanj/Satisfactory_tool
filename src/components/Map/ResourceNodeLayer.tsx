/**
 * ResourceNodeLayer.tsx
 * Renders resource node locations as circular image pins on the Leaflet map.
 * Nodes are loaded from public/data/resource_nodes.json (fetched + cached once).
 *
 * Sprint 4 update: accepts `activeFilters` (Map<resource, Set<purity>>)
 * for multi-select filtering. Icons are circular images with purity-colored rings.
 */
import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
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
      {visible.map(node => (
        <Marker
          key={`rn-${node.id}`}
          position={gameToLatLng(node.world_x, node.world_y)}
          icon={createPinIcon(node.resource, node.purity)}
        >
          <Popup className="rn-rich-popup" minWidth={300} maxWidth={300}>
            <ResourceNodeCard node={node} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ─── Miner output rates ───────────────────────────────────────────────────────
const BASE_RATES: Record<string, number> = {
  Impure: 30,
  Normal: 60,
  Pure:   120,
};
const MINER_MULTIPLIERS = [1, 2, 4] as const;
const MINER_LABELS = ['Miner Mk.1', 'Miner Mk.2', 'Miner Mk.3'] as const;
const CLOCK_SPEEDS = [50, 100, 150, 200, 250] as const;

// ─── Rich node card ───────────────────────────────────────────────────────────
function ResourceNodeCard({ node }: { node: ResourceNode }) {
  const color   = PURITY_COLORS[node.purity] ?? '#6b7280';
  const imgKey  = RESOURCE_IMAGE_KEY[node.resource] ?? '';
  const imgSrc  = imgKey ? `/images/${imgKey}.png` : '';
  const baseRate = BASE_RATES[node.purity] ?? 60;
  const wx = Math.round(node.world_x / 100);
  const wy = Math.round(node.world_y / 100);
  const wz = Math.round(node.world_z / 100);

  return (
    <div className="rnc-root">
      {/* Header */}
      <div className="rnc-header" style={{ borderColor: color }}>
        {imgSrc && <img src={imgSrc} className="rnc-icon" alt={node.resource} draggable={false} />}
        <div className="rnc-header-text">
          <span className="rnc-title">{node.resource}</span>
          <span className="rnc-badges">
            <span className="rnc-badge-purity" style={{ background: color + '22', color, borderColor: color + '55' }}>
              {node.purity.toUpperCase()}
            </span>
            <span className="rnc-badge-type">{node.type === 'well' ? 'OIL WELL' : 'NODE'}</span>
          </span>
        </div>
      </div>

      {/* Coordinates */}
      <div className="rnc-coords">
        <div className="rnc-coord-row">
          <span className="rnc-coord-label">Coordinates</span>
          <span className="rnc-coord-val">{wx.toLocaleString()} / {wy.toLocaleString()}</span>
        </div>
        <div className="rnc-coord-row">
          <span className="rnc-coord-label">Altitude</span>
          <span className="rnc-coord-val">{wz.toLocaleString()}m</span>
        </div>
      </div>

      {/* Extraction rate table — only for solid nodes */}
      {node.type !== 'well' && (
        <div className="rnc-table-wrap">
          <table className="rnc-table">
            <thead>
              <tr>
                <th></th>
                {CLOCK_SPEEDS.map(cs => (
                  <th key={cs}>{cs}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MINER_LABELS.map((label, i) => (
                <tr key={label}>
                  <td className="rnc-miner-label">{label}</td>
                  {CLOCK_SPEEDS.map(cs => (
                    <td key={cs}>
                      {Math.round(baseRate * MINER_MULTIPLIERS[i] * cs / 100)}
                      <span className="rnc-unit"> /m</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Oil well note */}
      {node.type === 'well' && (
        <div className="rnc-well-note">
          Requires Oil Extractor — output depends on clock speed.
        </div>
      )}
    </div>
  );
}
