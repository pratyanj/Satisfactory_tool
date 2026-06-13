import React, { useState, useMemo, useEffect } from 'react';
import { recipes, items } from '../engine/data';
import { RecipeTable } from './ItemDetail';
import { Pagination } from './Pagination';

const PAGE_SIZE = 50;

interface Props {
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
}

type Filter = 'all' | 'standard' | 'alternate';

function isAlternate(id: string, isAlt?: boolean) {
  return isAlt || id.startsWith('recipe_alternate_');
}

export function RecipeBrowser({ onBack, onNavigateItem }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  const all = useMemo(() => [...recipes].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id)), []);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return all.filter(r => {
      const name = (r.name ?? r.id).toLowerCase();
      const out = items[r.outputItemId]?.name.toLowerCase() ?? '';
      const matchSearch = !q || name.includes(q) || out.includes(q);
      const alt = isAlternate(r.id, r.isAlternate);
      const matchFilter = filter === 'all' || (filter === 'alternate' ? alt : !alt);
      return matchSearch && matchFilter;
    });
  }, [all, search, filter]);

  useEffect(() => { setPage(1); }, [search, filter]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRecipes = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'standard', label: 'Standard' },
    { key: 'alternate', label: 'Alternate' },
  ];

  return (
    <div className="ib-root">
      {/* FICSIT Telemetry Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-2 border-b border-[#2a2d33] bg-[#121316]/60 shrink-0">
        <button className="cdx-back-btn" onClick={onBack}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Codex
        </button>
        <div style={{ width: 3, height: 14, background: 'linear-gradient(180deg, #f48721, #c45700)', borderRadius: 2 }} />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">FICSIT // Recipe Codex</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
        <span className="text-[8px] font-mono text-[#6b7280] tracking-widest uppercase">DATABASE STATUS: ACTIVE</span>
      </div>

      {/* Toolbar */}
      <div className="ib-toolbar">
        <div className="ib-search-wrap">
          <svg className="ib-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="ib-search" placeholder="Search recipes or products…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="ib-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <span className="ib-count">{filtered.length} recipes</span>
      </div>

      {/* Filter pills */}
      <div className="ib-cats">
        {FILTERS.map(f => (
          <button key={f.key} className={`ib-cat-pill ${filter === f.key ? 'ib-cat-pill--active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      {/* Recipe table */}
      <div className="ib-grid-wrap">
        {filtered.length === 0 ? (
          <div className="ib-empty">No recipes found for "{search}"</div>
        ) : (
          <div className="cdx-recipe-wrap">
            <RecipeTable recipes={pageRecipes} highlightId="" onNavigate={onNavigateItem} />
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
