/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import './home.css';
import { items, recipes, machines } from '../../engine/data';

// Three.js scene is lazy-loaded so the WebGL bundle stays out of the critical
// path for users who deep-link straight into a tool route.
const ProductionWebScene = lazy(() => import('./ProductionWebScene'));

interface HomeTabProps {
  /** Navigate to a top-level section (loosely typed to stay decoupled from App's TopLevelTab union). */
  onNavigate: (tab: string) => void;
}

type ModuleDef = {
  id: string;
  code: string;
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactNode;
};

// ----------------------------------------------------------------------------
// Icons — match the stroke style used across HeaderNav / App tab config.
// ----------------------------------------------------------------------------
const ICON_PROPS = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const PlannerIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const PowerIcon = () => (
  <svg {...ICON_PROPS}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);
const MapIcon = () => (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const CodexIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const SandboxIcon = () => (
  <svg {...ICON_PROPS}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const MODULES: ModuleDef[] = [
  {
    id: 'planner',
    code: 'MOD-01',
    title: 'Production Planner',
    desc: 'Resolve any recipe into exact machine counts, belt loads and power draw — alternate recipes included.',
    cta: 'Open planner',
    icon: <PlannerIcon />,
  },
  {
    id: 'power_planner',
    code: 'MOD-02',
    title: 'Power Grid Planner',
    desc: 'Balance generators, fuel chains and nuclear cycles against your factory demand.',
    cta: 'Plan power',
    icon: <PowerIcon />,
  },
  {
    id: 'world_map',
    code: 'MOD-03',
    title: 'World Map',
    desc: 'Plot every resource node, power slug and crash site across the planet surface.',
    cta: 'Open map',
    icon: <MapIcon />,
  },
  {
    id: 'codex',
    code: 'MOD-04',
    title: 'Item Codex',
    desc: 'Browse items, recipes, buildings, M.A.M. research and the AWESOME Shop catalog.',
    cta: 'Browse codex',
    icon: <CodexIcon />,
  },
  {
    id: 'sandbox',
    code: 'MOD-05',
    title: 'Sandbox',
    desc: 'Free-build factory layouts on an interactive blueprint canvas with live simulation.',
    cta: 'Enter sandbox',
    icon: <SandboxIcon />,
  },
];

const FEATURES: { title: string; desc: string }[] = [
  { title: 'Save-File Analyzer', desc: 'Drop a .sav and reconstruct your live factory state directly in the browser — zero backend.' },
  { title: 'FICSIT Diagnostics', desc: 'Auto-detect belt bottlenecks, starved machines and power blackouts with fix suggestions.' },
  { title: 'Shareable Plans', desc: 'Encode an entire production plan into a short URL hash to share with fellow pioneers.' },
  { title: 'Interactive Cartography', desc: 'Resource overlays, drone routes and power grids rendered live on a Leaflet world map.' },
];

export function HomeTab({ onNavigate }: HomeTabProps) {
  const recipeCount = recipes.length;
  const itemCount = Object.keys(items).length;
  const machineCount = Object.keys(machines).length;

  return (
    <main className="sf-home-root">
      {/* ===================== HERO — interactive 3D production web ===================== */}
      <section className="sf-home-hero">
        {/* Top band: the WebGL recipe graph, full and unobstructed */}
        <div className="sf-home-scene-band">
          <div className="sf-home-scene">
            <Suspense fallback={<div className="sf-home-scene-loading" />}>
              <ProductionWebScene className="sf-home-canvas" />
            </Suspense>
          </div>
          <div className="sf-home-drag-hint" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V6a2 2 0 0 1 4 0v5" /><path d="M13 11V5a2 2 0 0 1 4 0v6" /><path d="M17 11V7a2 2 0 0 1 4 0v8a6 6 0 0 1-6 6h-2a7 7 0 0 1-5-2.5l-3.5-4a2 2 0 0 1 3-2.6L9 13" /></svg>
            DRAG TO EXPLORE THE WEB
          </div>
          <div className="sf-home-band-fade" aria-hidden="true" />
        </div>

        {/* Below: the console bar with the hero copy + actions */}
        <div className="sf-home-console-bar sf-blueprint-bg">
          <div className="sf-home-console">
            <span className="sf-card-screw sf-card-screw-tl" aria-hidden="true" />
            <span className="sf-card-screw sf-card-screw-tr" aria-hidden="true" />
            <span className="sf-card-screw sf-card-screw-bl" aria-hidden="true" />
            <span className="sf-card-screw sf-card-screw-br" aria-hidden="true" />

            <div className="sf-home-console-main">
              <div className="sf-home-badge">
                <span className="sf-home-pulse" />
                FICSIT INDUSTRIES · PIONEER TOOLKIT
              </div>
              <h1 className="sf-home-title">
                SATISFACTORY <span className="sf-home-title-accent">TOOL</span>
              </h1>
              <div className="sf-home-tagline">PLAN · OPTIMIZE · PRODUCE</div>
              <p className="sf-home-lead">
                Resolve any recipe into machines, belts and power — then analyze your real save
                files, audit logistics and map the whole planet. The web above is a live planner graph.
              </p>
            </div>

            <div className="sf-home-console-side">
              <div className="sf-home-cta-row">
                <button
                  onClick={() => onNavigate('planner')}
                  className="sf-primary-btn sf-home-cta px-6 py-3 text-xs font-bold tracking-widest uppercase"
                >
                  <span className="sf-btn-scanner absolute inset-0 pointer-events-none z-10" />
                  <span className="relative z-20 flex items-center gap-2">
                    Launch Production Planner
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </span>
                </button>
                <button
                  onClick={() => onNavigate('world_map')}
                  className="sf-secondary-btn sf-home-cta px-6 py-3 text-xs font-bold tracking-widest uppercase"
                >
                  <span className="relative z-20">Explore World Map</span>
                </button>
              </div>

              <div className="sf-home-stats" role="list">
                <div className="sf-home-stat" role="listitem">
                  <span className="sf-home-stat-num">{recipeCount}</span>
                  <span className="sf-home-stat-label">Recipes</span>
                </div>
                <div className="sf-home-stat" role="listitem">
                  <span className="sf-home-stat-num">{itemCount}</span>
                  <span className="sf-home-stat-label">Items</span>
                </div>
                <div className="sf-home-stat" role="listitem">
                  <span className="sf-home-stat-num">{machineCount}</span>
                  <span className="sf-home-stat-label">Buildings</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sf-home-caution-bar sf-home-caution-bar--bottom" aria-hidden="true" />
      </section>

      {/* ========================= MODULES ========================= */}
      <section className="sf-home-section sf-blueprint-bg">
        <div className="sf-home-section-head">
          <span className="sf-home-section-hex" />
          <h2 className="sf-home-section-title">Operations Modules</h2>
          <span className="sf-home-section-rule" />
        </div>

        <div className="sf-home-cards">
          {MODULES.map((m) => (
            <button
              key={m.id}
              className="sf-home-card"
              onClick={() => onNavigate(m.id)}
              aria-label={`Open ${m.title}`}
            >
              <span className="sf-card-screw sf-card-screw-tl" />
              <span className="sf-card-screw sf-card-screw-tr" />
              <span className="sf-card-screw sf-card-screw-bl" />
              <span className="sf-card-screw sf-card-screw-br" />
              <span className="sf-home-card-sweep" />

              <div className="sf-home-card-top">
                <span className="sf-home-card-icon">{m.icon}</span>
                <span className="sf-home-card-code">{m.code}</span>
              </div>
              <h3 className="sf-home-card-title">{m.title}</h3>
              <p className="sf-home-card-desc">{m.desc}</p>
              <span className="sf-home-card-cta">
                {m.cta}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ========================= FEATURES ========================= */}
      <section className="sf-home-section sf-blueprint-bg">
        <div className="sf-home-section-head">
          <span className="sf-home-section-hex" />
          <h2 className="sf-home-section-title">Built-In Capabilities</h2>
          <span className="sf-home-section-rule" />
        </div>

        <div className="sf-home-features">
          {FEATURES.map((f, i) => (
            <div key={i} className="sf-home-feature">
              <span className="sf-home-feature-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4 className="sf-home-feature-title">{f.title}</h4>
                <p className="sf-home-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================= FOOTER ========================= */}
      <footer className="sf-home-footer sf-blueprint-bg">
        <div className="sf-home-caution-bar sf-home-caution-bar--thin" aria-hidden="true" />
        <div className="sf-home-footer-inner">
          <div className="sf-home-footer-brand">
            SATISFACTORY <span>TOOL</span>
          </div>
          <p className="sf-home-footer-note">
            Fan-made utility · Not affiliated with Coffee Stain Studios · Built for pioneers.
          </p>
        </div>
      </footer>
    </main>
  );
}
