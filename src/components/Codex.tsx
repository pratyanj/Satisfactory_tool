import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './codex.css';
import { items, recipes, buildings, tiers } from '../engine/data';
import { ItemBrowser } from './ItemBrowser';
import { ItemDetail } from './ItemDetail';
import { BuildingBrowser } from './BuildingBrowser';
import { BuildingDetail } from './BuildingDetail';
import { RecipeBrowser } from './RecipeBrowser';
import { TierBrowser } from './TierBrowser';

type Section = 'hub' | 'items' | 'buildings' | 'recipes' | 'tiers';
const SECTIONS: Section[] = ['items', 'buildings', 'recipes', 'tiers'];

interface CodexRoute {
  section: Section;
  id: string | null;
}

/**
 * The Codex is URL-driven: /codex, /codex/<section>, /codex/<section>/<id>.
 * Every navigation pushes a history entry, so the browser/device Back button
 * walks detail → list → hub naturally. App delegates the whole /codex subtree
 * here (it only sets topLevelTab='codex').
 */
function parseRoute(): CodexRoute {
  const parts = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/');
  // parts[0] === 'codex'
  const seg = parts[1] ?? '';
  const section = (SECTIONS as string[]).includes(seg) ? (seg as Section) : 'hub';
  const id = (section === 'items' || section === 'buildings') && parts[2]
    ? decodeURIComponent(parts[2])
    : null;
  return { section, id };
}

function routeToPath({ section, id }: CodexRoute): string {
  if (section === 'hub') return '/codex';
  return `/codex/${section}${id ? `/${encodeURIComponent(id)}` : ''}`;
}

export function Codex() {
  const [route, setRoute] = useState<CodexRoute>(() => parseRoute());

  // Browser back/forward → re-derive the view from the URL.
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav = useCallback((section: Section, id: string | null = null) => {
    const next: CodexRoute = { section, id };
    const path = routeToPath(next);
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setRoute(next);
  }, []);

  const counts = useMemo(() => ({
    items: Object.keys(items).length,
    buildings: Object.keys(buildings).length,
    recipes: recipes.length,
    tiers: tiers.length,
  }), []);

  const goHub = useCallback(() => nav('hub'), [nav]);
  const goItem = useCallback((id: string) => nav('items', id), [nav]);
  const goBuilding = useCallback((id: string) => nav('buildings', id), [nav]);

  if (route.section === 'hub') return <CodexHub counts={counts} onOpen={s => nav(s)} />;

  // Each list stays mounted under its detail overlay, so Back restores the exact
  // page / search / scroll position the user left.
  return (
    <div className="cdx-section-stack">
      {route.section === 'items' && (
        <>
          <ItemBrowser onBack={goHub} onSelect={goItem} />
          {route.id && (
            <div className="cdx-detail-overlay">
              <ItemDetail itemId={route.id} onBack={() => nav('items')} onNavigate={goItem} />
            </div>
          )}
        </>
      )}

      {route.section === 'buildings' && (
        <>
          <BuildingBrowser onBack={goHub} onSelect={goBuilding} />
          {route.id && (
            <div className="cdx-detail-overlay">
              <BuildingDetail buildingId={route.id} onBack={() => nav('buildings')} onNavigateItem={goItem} />
            </div>
          )}
        </>
      )}

      {route.section === 'recipes' && <RecipeBrowser onBack={goHub} onNavigateItem={goItem} />}

      {route.section === 'tiers' && (
        <TierBrowser onBack={goHub} onNavigateItem={goItem} onNavigateBuilding={goBuilding} />
      )}
    </div>
  );
}

// ── Hub landing ──────────────────────────────────────────────────────────────
interface HubCard {
  id: Exclude<Section, 'hub'>;
  name: string;
  count: number;
  desc: string;
  color: string;
  icon: React.ReactNode;
}

function CodexHub({ counts, onOpen }: { counts: Record<string, number>; onOpen: (s: Section) => void }) {
  const cards: HubCard[] = [
    {
      id: 'items', name: 'Items', count: counts.items, color: '#34d399',
      desc: 'Browse all producible items, resources, and materials.',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>,
    },
    {
      id: 'buildings', name: 'Buildings', count: counts.buildings, color: '#60a5fa',
      desc: 'Explore production buildings, logistics, extractors, and power generators.',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="18" rx="1" /><rect x="13" y="8" width="8" height="13" rx="1" /><line x1="6" y1="7" x2="8" y2="7" /><line x1="6" y1="11" x2="8" y2="11" /><line x1="16" y1="12" x2="18" y2="12" /></svg>,
    },
    {
      id: 'recipes', name: 'Recipes', count: counts.recipes, color: '#f48721',
      desc: 'View all recipes including default, alternate, and MAM research recipes.',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" /><line x1="5" y1="11" x2="5" y2="22" /><path d="M17 2v20M17 2c-2 0-3 2-3 5s1 5 3 5" /></svg>,
    },
    {
      id: 'tiers', name: 'Tiers', count: counts.tiers, color: '#a78bfa',
      desc: 'Walk the HUB progression and see what each tier and milestone unlocks.',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="12" r="2.5" /><path d="M8.5 6H13a2 2 0 0 1 2 2v2.5M8.5 18H13a2 2 0 0 0 2-2v-2.5" /></svg>,
    },
  ];

  return (
    <div className="cdx-hub">
      <h1 className="cdx-hub-title">Codex</h1>
      <p className="cdx-hub-sub">A complete reference of all items, buildings, and recipes in Satisfactory.</p>
      <div className="cdx-hub-cards">
        {cards.map(c => (
          <button key={c.id} className="cdx-hub-card" onClick={() => onOpen(c.id)} style={{ '--cdx-accent': c.color } as React.CSSProperties}>
            <div className="cdx-hub-card-head">
              <span className="cdx-hub-card-icon">{c.icon}</span>
              <span className="cdx-hub-card-name">{c.name}</span>
              <span className="cdx-hub-card-count">({c.count})</span>
            </div>
            <p className="cdx-hub-card-desc">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
