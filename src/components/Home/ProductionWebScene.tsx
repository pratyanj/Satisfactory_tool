/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProductionWebScene — the "Living Production Web" home hero.
 *
 * Renders a real Satisfactory recipe chain as an interactive 3D graph: item
 * icons (billboarded, always readable) sit in glowing FICSIT frames, connected
 * by emissive belts with parts flowing along them. The landing page is, in
 * effect, a miniature of the production planner.
 *
 * Desktop: drag to orbit (OrbitControls; zoom/pan disabled so the page still
 * scrolls). Touch: gentle auto-orbit so swiping the page isn't trapped.
 * Self-contained: disposes every geometry/material/texture/renderer on unmount.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const ORANGE = 0xf48721;
const ORANGE_HOT = 0xff8a2b;

// Recipe chain toward the Modular Frame — a recognizable early-game progression
// with branching + merging so the graph reads as a real production web.
type NodeDef = { id: string; pos: [number, number, number]; product?: boolean };
const NODES: NodeDef[] = [
  { id: 'iron_ore', pos: [-10, 3, 1] },
  { id: 'copper_ore', pos: [-10, -3.2, -1] },
  { id: 'iron_ingot', pos: [-6, 3.2, 0.4] },
  { id: 'copper_ingot', pos: [-6, -3.2, -0.4] },
  { id: 'iron_plate', pos: [-2, 4.2, 1] },
  { id: 'iron_rod', pos: [-2, 0.6, -1.1] },
  { id: 'wire', pos: [-2, -4, 0.6] },
  { id: 'screw', pos: [2.4, 1.6, -0.8] },
  { id: 'cable', pos: [2.4, -4.2, 1] },
  { id: 'reinforced_iron_plate', pos: [6.4, 3.4, -0.5] },
  { id: 'modular_frame', pos: [10.4, 1, 0.4], product: true },
];
const EDGES: [string, string][] = [
  ['iron_ore', 'iron_ingot'],
  ['copper_ore', 'copper_ingot'],
  ['iron_ingot', 'iron_plate'],
  ['iron_ingot', 'iron_rod'],
  ['copper_ingot', 'wire'],
  ['iron_rod', 'screw'],
  ['wire', 'cable'],
  ['iron_plate', 'reinforced_iron_plate'],
  ['screw', 'reinforced_iron_plate'],
  ['reinforced_iron_plate', 'modular_frame'],
  ['iron_rod', 'modular_frame'],
];

interface Props {
  className?: string;
}

export default function ProductionWebScene({ className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || 1;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      mount.classList.add('sf-scene--unsupported');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.028);

    // Graph is centered in its own band; orbit around its center.
    const targetVec = new THREE.Vector3(0, 0, 0);
    const ORBIT_R = 18;
    const POLAR_BASE = Math.PI * 0.46;
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 200);
    camera.position.set(
      targetVec.x,
      targetVec.y + ORBIT_R * Math.cos(POLAR_BASE),
      targetVec.z + ORBIT_R * Math.sin(POLAR_BASE)
    );
    camera.lookAt(targetVec);

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0x8a93a8, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(6, 10, 8);
    scene.add(key);
    const glow = new THREE.PointLight(ORANGE, 18, 50, 2);
    glow.position.set(0, 2, 6);
    scene.add(glow);

    // --- Lightweight custom orbit. Desktop: drag to orbit within limits so the
    // graph can never collapse edge-on. Touch: gentle idle sway only, so the
    // page still scrolls freely (no wheel-zoom / scroll hijack). ---
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    let azBase = 0;
    let polBase = POLAR_BASE;
    let azCur = 0;
    let polCur = POLAR_BASE;
    let dragging = false;
    let lastX = 0, lastY = 0;
    const dom = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      dom.style.cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      azBase = clamp(azBase - (e.clientX - lastX) * 0.005, -0.5, 0.5);
      polBase = clamp(polBase - (e.clientY - lastY) * 0.005, Math.PI * 0.34, Math.PI * 0.6);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = () => {
      dragging = false;
      dom.style.cursor = 'grab';
    };
    if (!isTouch) {
      dom.style.cursor = 'grab';
      dom.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    // --- Shared resources (disposed on cleanup) ---
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(x: T): T => {
      if (x instanceof THREE.BufferGeometry) geometries.push(x);
      else if (x instanceof THREE.Texture) textures.push(x);
      else materials.push(x as THREE.Material);
      return x;
    };

    const matFrame = track(new THREE.MeshStandardMaterial({ color: 0x20242b, metalness: 0.75, roughness: 0.35 }));
    const matRim = track(new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 1.6, metalness: 0.3, roughness: 0.45 }));
    const matRimProduct = track(new THREE.MeshStandardMaterial({ color: ORANGE_HOT, emissive: ORANGE_HOT, emissiveIntensity: 2.2, metalness: 0.3, roughness: 0.4 }));
    const matBeam = track(new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 1.2, metalness: 0.2, roughness: 0.6, transparent: true, opacity: 0.85 }));
    const matPart = track(new THREE.MeshStandardMaterial({ color: ORANGE_HOT, emissive: ORANGE_HOT, emissiveIntensity: 2.4, metalness: 0.2, roughness: 0.5 }));

    const loader = new THREE.TextureLoader();

    // --- Nodes ---
    const nodePos = new Map<string, THREE.Vector3>();
    const billboards: THREE.Group[] = [];
    const frameGeo = track(new THREE.BoxGeometry(1.55, 1.55, 0.12));
    const rimGeo = track(new THREE.BoxGeometry(1.74, 1.74, 0.06));
    const iconGeo = track(new THREE.PlaneGeometry(1.18, 1.18));

    for (const n of NODES) {
      const p = new THREE.Vector3(...n.pos);
      nodePos.set(n.id, p);

      const g = new THREE.Group();
      g.position.copy(p);
      const scale = n.product ? 1.32 : 1;
      g.scale.setScalar(scale);

      const rim = new THREE.Mesh(rimGeo, n.product ? matRimProduct : matRim);
      rim.position.z = -0.05;
      g.add(rim);

      const frame = new THREE.Mesh(frameGeo, matFrame);
      g.add(frame);

      const iconMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      track(iconMat);
      const icon = new THREE.Mesh(iconGeo, iconMat);
      icon.position.z = 0.08;
      g.add(icon);

      loader.load(
        `/images/${n.id}.png`,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAniso;
          iconMat.map = tex;
          iconMat.opacity = 1;
          iconMat.needsUpdate = true;
          textures.push(tex);
        },
        undefined,
        () => { /* missing icon → leave frame empty */ }
      );

      scene.add(g);
      billboards.push(g);
    }

    // --- Edges (oriented cylinders) + flowing parts ---
    const up = new THREE.Vector3(0, 1, 0);
    const partGeo = track(new THREE.BoxGeometry(0.22, 0.22, 0.22));
    type Part = { mesh: THREE.Mesh; a: THREE.Vector3; b: THREE.Vector3; offset: number; speed: number };
    const parts: Part[] = [];

    for (const [from, to] of EDGES) {
      const a = nodePos.get(from)!;
      const b = nodePos.get(to)!;
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();

      const beamGeo = track(new THREE.CylinderGeometry(0.035, 0.035, len, 6));
      const beam = new THREE.Mesh(beamGeo, matBeam);
      beam.position.copy(a).add(b).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(up, dir.clone().normalize());
      scene.add(beam);

      // 2 parts per edge, evenly offset
      for (let k = 0; k < 2; k++) {
        const mesh = new THREE.Mesh(partGeo, matPart);
        parts.push({ mesh, a, b, offset: k / 2, speed: 0.16 + Math.min(len, 8) * 0.006 });
        scene.add(mesh);
      }
    }

    // --- Blueprint floor + particles ---
    const grid = new THREE.GridHelper(80, 40, ORANGE, 0x222730);
    grid.position.y = -6.5;
    const gMat = grid.material as THREE.Material;
    gMat.transparent = true;
    gMat.opacity = 0.18;
    scene.add(grid);

    const PCOUNT = 260;
    const pPos = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 44;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = track(new THREE.PointsMaterial({ color: ORANGE, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false }));
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // --- Post-processing bloom ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.5, 0.32);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // --- Resize ---
    const resize = () => {
      width = mount.clientWidth || 1;
      height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // --- Animation loop ---
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();

      // Orbit: ease toward the drag base angles + a gentle idle sway (paused
      // while the user is actively dragging).
      const swayAz = (prefersReduced || dragging) ? 0 : Math.sin(t * 0.13) * 0.3;
      const swayPol = (prefersReduced || dragging) ? 0 : Math.sin(t * 0.1) * 0.04;
      azCur += (azBase + swayAz - azCur) * 0.06;
      polCur += (polBase + swayPol - polCur) * 0.06;
      const sp = Math.sin(polCur);
      camera.position.set(
        targetVec.x + ORBIT_R * sp * Math.sin(azCur),
        targetVec.y + ORBIT_R * Math.cos(polCur),
        targetVec.z + ORBIT_R * sp * Math.cos(azCur)
      );
      camera.lookAt(targetVec);

      // Billboard every node toward the camera so icons stay readable.
      for (const g of billboards) g.quaternion.copy(camera.quaternion);

      // Flow parts along their edges.
      if (!prefersReduced) {
        for (const part of parts) {
          const frac = (part.offset + t * part.speed) % 1;
          part.mesh.position.lerpVectors(part.a, part.b, frac);
          part.mesh.rotation.set(t * 1.6, t * 1.2, 0);
        }
        particles.rotation.y = t * 0.02;
      }

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (raf === 0) {
        clock.getDelta();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      if (!isTouch) {
        dom.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
      ro.disconnect();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const tx of textures) tx.dispose();
      grid.geometry.dispose();
      gMat.dispose();
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
