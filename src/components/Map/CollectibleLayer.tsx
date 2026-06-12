import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { gameToLatLng } from './mapUtils';
import type { LayerState } from './LayerControls';

interface Collectible {
  id: number;
  type: string;
  name: string;
  world_x: number;
  world_y: number;
  world_z: number;
  map_lat: number;
  map_lng: number;
}

interface CollectibleLayerProps {
  activeCollectibles: Set<string>;
}

const COLLECTIBLE_EMOJIS: Record<string, string> = {
  hard_drive: '💾',
  somersloop: '🌀',
  mercer_sphere: '🔮',
  paleberry: '🍓',
  beryl_nut: '🌰',
  bacon_agaric: '🍄',
  blue_slug: '🐌',
  yellow_slug: '🐌',
  purple_slug: '🐌',
};

const COLLECTIBLE_COLORS: Record<string, string> = {
  hard_drive: '#f48721', // orange
  somersloop: '#f48721',
  mercer_sphere: '#f43f5e', // rose
  paleberry: '#ef4444', // red
  beryl_nut: '#f59e0b', // amber
  bacon_agaric: '#ec4899', // pink
  blue_slug: '#3b82f6', // blue
  yellow_slug: '#f59e0b', // yellow
  purple_slug: '#a78bfa', // purple
};

// Collectible type → image filename in /public/images (downloaded from the
// Satisfactory wiki via scripts/download_collectible_images.mjs). Falls back
// to the emoji above if the image is missing.
const COLLECTIBLE_IMAGE_KEY: Record<string, string> = {
  blue_slug:     'blue_power_slug',
  yellow_slug:   'yellow_power_slug',
  purple_slug:   'purple_power_slug',
  somersloop:    'somersloop',
  mercer_sphere: 'mercer_sphere',
  hard_drive:    'hard_drive',
  paleberry:     'paleberry',
  beryl_nut:     'beryl_nut',
  bacon_agaric:  'bacon_agaric',
};

/** Image src for a collectible type, or '' when no image is mapped. */
export function collectibleImg(type: string): string {
  const key = COLLECTIBLE_IMAGE_KEY[type];
  return key ? `/images/${key}.png` : '';
}

function createCollectibleIcon(type: string): L.DivIcon {
  const color = COLLECTIBLE_COLORS[type] || '#9ca3af';
  const emoji = COLLECTIBLE_EMOJIS[type] || '❓';
  const imgSrc = collectibleImg(type);
  const size = 30;

  // Prefer the real item image; if it fails to load, reveal the emoji fallback.
  const inner = imgSrc
    ? `<img src="${imgSrc}" style="width:${size - 8}px;height:${size - 8}px;object-fit:contain;display:block;" draggable="false"
         onerror="this.style.display='none';this.parentElement.querySelector('.cm-emoji').style.display='block';" />
       <span class="cm-emoji" style="display:none;font-size:15px;line-height:1;">${emoji}</span>`
    : `<span class="cm-emoji" style="font-size:15px;line-height:1;display:block;">${emoji}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="collectible-map-pin" style="
        width:${size}px;
        height:${size}px;
        border:2px solid ${color};
        box-shadow:0 0 6px ${color}88, 0 0 2px ${color};
        background:#111317;
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

let collectiblesCache: Collectible[] | null = null;

async function fetchCollectibles(): Promise<Collectible[]> {
  if (collectiblesCache) return collectiblesCache;
  try {
    const res = await fetch('/data/collectibles.json');
    collectiblesCache = await res.json();
    return collectiblesCache!;
  } catch (e) {
    console.error('[CollectibleLayer] failed to load collectibles', e);
    collectiblesCache = [];
    return [];
  }
}

export function CollectibleLayer({ activeCollectibles }: CollectibleLayerProps) {
  const [items, setItems] = useState<Collectible[]>([]);

  useEffect(() => {
    fetchCollectibles().then(setItems);
  }, []);

  const visible = items.filter(item => activeCollectibles.has(item.type));

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map(item => (
        <Marker
          key={`collectible-${item.id}`}
          position={gameToLatLng(item.world_x, item.world_y)}
          icon={createCollectibleIcon(item.type)}
        >
          <Popup className="rn-rich-popup" minWidth={260} maxWidth={260}>
            <CollectibleCard item={item} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function CollectibleCard({ item }: { item: Collectible }) {
  const color = COLLECTIBLE_COLORS[item.type] || '#6b7280';
  const emoji = COLLECTIBLE_EMOJIS[item.type] || '❓';
  const imgSrc = collectibleImg(item.type);
  const wx = Math.round(item.world_x / 100);
  const wy = Math.round(item.world_y / 100);
  const wz = Math.round(item.world_z / 100);

  // Custom descriptions
  let desc = 'Collectible item found in the world.';
  if (item.type === 'hard_drive') {
    desc = 'Recover from Crash Sites (Drop Pods). Scan at the M.A.M. to unlock alternate recipes.';
  } else if (item.type === 'somersloop') {
    desc = 'Alien artifact. Used for power amplification and production doubling in production buildings.';
  } else if (item.type === 'mercer_sphere') {
    desc = 'Alien artifact. Used for building alien technology and storage dimension expansion.';
  } else if (item.type === 'paleberry' || item.type === 'beryl_nut' || item.type === 'bacon_agaric') {
    desc = 'Edible health consumable. Restores health when eaten.';
  } else if (item.type === 'blue_slug' || item.type === 'yellow_slug' || item.type === 'purple_slug') {
    desc = 'Power Slug. Process in the M.A.M. or craft into Power Shards to overclock buildings.';
  }

  return (
    <div className="rnc-root">
      <div className="rnc-header" style={{ borderColor: color }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.name}
            draggable={false}
            style={{ width: 28, height: 28, objectFit: 'contain', marginRight: 8 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { textContent: emoji, style: 'font-size:20px;margin-right:8px' })); }}
          />
        ) : (
          <span style={{ fontSize: '20px', marginRight: '8px' }}>{emoji}</span>
        )}
        <div className="rnc-header-text">
          <span className="rnc-title">{item.name}</span>
          <span className="rnc-badges">
            <span className="rnc-badge-type" style={{ background: color + '22', color, borderColor: color + '55' }}>
              COLLECTIBLE
            </span>
          </span>
        </div>
      </div>

      <div className="rnc-coords" style={{ marginBottom: '8px' }}>
        <div className="rnc-coord-row">
          <span className="rnc-coord-label">Coordinates</span>
          <span className="rnc-coord-val">{wx.toLocaleString()} / {wy.toLocaleString()}</span>
        </div>
        <div className="rnc-coord-row">
          <span className="rnc-coord-label">Altitude</span>
          <span className="rnc-coord-val">{wz.toLocaleString()}m</span>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#9aa0a6', lineHeight: '1.4', padding: '0 4px' }}>
        {desc}
      </div>
    </div>
  );
}
