/**
 * CanvasInfraLayer.tsx
 * Renders ALL save infrastructure (buildings, belts, pipes, power wires) onto a
 * SINGLE <canvas> pinned over the map — the approach used by SC-InteractiveMap
 * and rockfactory. This replaces thousands of per-object react-leaflet layers
 * (which made panning/zooming a big save laggy) with one cheap full-redraw.
 *
 *  - Buildings: category-colored rotated-rect footprints (zoomed in) or dots
 *    (zoomed out); a machine glyph is drawn on top at high zoom.
 *  - Belts/pipes/power: polylines through their world path.
 *  - Hover: a throttled hit-test reports the building under the cursor so the
 *    parent can show a detail tooltip. The canvas itself is pointer-events:none
 *    so map pan/zoom/clicks keep working.
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import {
  classifyBuilding, CATEGORY_COLORS, getBeltColor, getPipeColor,
} from '../../engine/buildingClassifier';
import type {
  SaveBuilding, SaveConveyor, SavePipe, SavePowerLine,
} from '../../types/save';
import type { LayerState } from './LayerControls';
import { gameToLatLng, latLngToGame } from './mapUtils';
import { getFootprintCm, yawFromQuat } from './buildingFootprints';

const FOOTPRINT_ZOOM = 4; // below this, buildings are dots
const GLYPH_ZOOM = 6;     // at/above this, draw the machine emoji on the footprint

const STATUS_COLOR: Record<string, string> = {
  idle: '#ff1744', starved: '#ff9100', clogged: '#00e6ff',
};

export interface HoveredBuilding {
  building: SaveBuilding;
  /** container-space pixel position for the tooltip */
  px: number;
  py: number;
}

interface CanvasInfraLayerProps {
  buildings: SaveBuilding[];
  conveyors: SaveConveyor[];
  pipes: SavePipe[];
  powerLines: SavePowerLine[];
  layers: LayerState;
  faultyMachineIds: Map<string, 'idle' | 'starved' | 'clogged'>;
  diagnosticsActive: boolean;
  onHover: (h: HoveredBuilding | null) => void;
}

export function CanvasInfraLayer(props: CanvasInfraLayerProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Keep the latest props without re-binding map listeners every render.
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'leaflet-infra-canvas') as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '450';
    map.getContainer().appendChild(canvas);
    canvasRef.current = canvas;

    const drawLines = (
      ctx: CanvasRenderingContext2D,
      segs: { path?: { x: number; y: number }[]; startPosition: { x: number; y: number }; endPosition: { x: number; y: number } }[],
      style: (s: any) => string,
      weight: number,
      opacity: number,
    ) => {
      ctx.globalAlpha = opacity;
      ctx.lineWidth = weight;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const s of segs) {
        const pts = (s.path && s.path.length >= 2) ? s.path : [s.startPosition, s.endPosition];
        if (pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y && pts.length < 3) continue;
        ctx.strokeStyle = style(s);
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const cp = map.latLngToContainerPoint(gameToLatLng(pts[i].x, pts[i].y));
          if (i === 0) ctx.moveTo(cp.x, cp.y); else ctx.lineTo(cp.x, cp.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      const p = propsRef.current;
      const size = map.getSize();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== size.x * dpr || canvas.height !== size.y * dpr) {
        canvas.width = size.x * dpr;
        canvas.height = size.y * dpr;
        canvas.style.width = size.x + 'px';
        canvas.style.height = size.y + 'px';
      }
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);

      const zoom = map.getZoom();
      const bounds = map.getBounds().pad(0.2);

      // ── Infrastructure lines (under buildings) ──
      if (p.layers.powerLines) drawLines(ctx, p.powerLines as any, () => '#facc15', 1.5, 0.85);
      if (p.layers.conveyors)  drawLines(ctx, p.conveyors as any, (s) => getBeltColor(s.typePath), 2, 0.9);
      if (p.layers.pipes)      drawLines(ctx, p.pipes as any, (s) => getPipeColor(s.typePath), 2, 0.85);

      // ── Buildings ──
      const detailed = zoom >= FOOTPRINT_ZOOM;
      const glyphs = zoom >= GLYPH_ZOOM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const b of p.buildings) {
        const latlng = gameToLatLng(b.position.x, b.position.y);
        if (!bounds.contains(latlng)) continue;
        const info = classifyBuilding(b.typePath);
        if (!p.layers.categories[info.category]) continue;
        if (!detailed && b.structural) continue; // foundations only show zoomed in

        const status = p.diagnosticsActive ? p.faultyMachineIds.get(b.instanceName) : undefined;
        const color = status ? STATUS_COLOR[status] : (CATEGORY_COLORS[info.category] ?? '#6b7280');
        const center = map.latLngToContainerPoint(latlng);

        if (detailed) {
          // Rotated footprint rectangle.
          const { w, l } = getFootprintCm(b.typePath);
          const yaw = yawFromQuat(b.rotation);
          const cos = Math.cos(yaw), sin = Math.sin(yaw);
          const corners = [[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2]];
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const gx = b.position.x + corners[i][0] * cos - corners[i][1] * sin;
            const gy = b.position.y + corners[i][0] * sin + corners[i][1] * cos;
            const cp = map.latLngToContainerPoint(gameToLatLng(gx, gy));
            if (i === 0) ctx.moveTo(cp.x, cp.y); else ctx.lineTo(cp.x, cp.y);
          }
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.globalAlpha = b.structural ? 0.28 : 0.45;
          ctx.fill();
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = 1.25;
          ctx.strokeStyle = color;
          ctx.stroke();
          ctx.globalAlpha = 1;

          if (glyphs && !b.structural && info.emoji) {
            ctx.font = '14px sans-serif';
            ctx.fillText(info.emoji, center.x, center.y);
          }
        } else {
          // Dot.
          const r = zoom >= 3 ? 4 : 3;
          ctx.beginPath();
          ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.95;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#0a0b0d';
          ctx.stroke();
        }
      }
    };

    // ── Hover hit-testing (throttled to one rAF) ──
    let rafPending = false;
    let lastEvt: L.LeafletMouseEvent | null = null;
    const hitTest = () => {
      rafPending = false;
      const e = lastEvt;
      if (!e) return;
      const p = propsRef.current;
      const g = latLngToGame(e.latlng.lat, e.latlng.lng); // cursor in game cm
      let best: SaveBuilding | null = null;
      let bestD = Infinity;
      for (const b of p.buildings) {
        const info = classifyBuilding(b.typePath);
        if (!p.layers.categories[info.category]) continue;
        const dx = g.x - b.position.x;
        const dy = g.y - b.position.y;
        const { w, l } = getFootprintCm(b.typePath);
        const reach = Math.max(w, l);
        if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
        // Transform cursor into the building's local frame.
        const yaw = yawFromQuat(b.rotation);
        const cos = Math.cos(-yaw), sin = Math.sin(-yaw);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= l / 2) {
          const d = lx * lx + ly * ly;
          // Prefer non-structural (machines) over the foundation underneath.
          const score = d + (b.structural ? 1e9 : 0);
          if (score < bestD) { bestD = score; best = b; }
        }
      }
      if (best) {
        const cp = map.latLngToContainerPoint(gameToLatLng(best.position.x, best.position.y));
        p.onHover({ building: best, px: cp.x, py: cp.y });
      } else {
        p.onHover(null);
      }
    };
    const onMouseMove = (e: L.LeafletMouseEvent) => {
      lastEvt = e;
      if (!rafPending) { rafPending = true; requestAnimationFrame(hitTest); }
    };
    const onMouseOut = () => propsRef.current.onHover(null);

    map.on('move', draw);
    map.on('zoomend', draw);
    map.on('viewreset', draw);
    map.on('resize', draw);
    map.on('zoomstart', () => { const ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); });
    map.on('mousemove', onMouseMove);
    map.on('mouseout', onMouseOut);
    draw();

    return () => {
      map.off('move', draw);
      map.off('zoomend', draw);
      map.off('viewreset', draw);
      map.off('resize', draw);
      map.off('mousemove', onMouseMove);
      map.off('mouseout', onMouseOut);
      canvas.remove();
      canvasRef.current = null;
    };
  }, [map]);

  // Redraw when the data/layers change (not just on map events).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Trigger the same draw by firing a synthetic move; cheap and reuses logic.
    map.fire('viewreset');
  }, [props.buildings, props.conveyors, props.pipes, props.powerLines, props.layers, props.diagnosticsActive, map]);

  return null;
}
