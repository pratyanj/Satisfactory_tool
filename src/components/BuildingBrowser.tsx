import React, { useState, useMemo, useEffect } from 'react';
import { buildings, type Building } from '../engine/data';
import { AppImage } from './AppImage';
import { Pagination } from './Pagination';

const CATEGORY_ORDER = [
  'Production', 'Power Generation', 'Resource Extraction', 'Power Infrastructure',
  'Conveyors', 'Pipes', 'Storage', 'Transport', 'Vehicles', 'Special',
  'Foundations', 'Walls', 'Ramps & Roofs', 'Structures', 'Decoration', 'Other',
];

interface Props {
  /** Back to the Codex hub. */
  onBack: () => void;
  /** Open a building's detail view (owned by the Codex parent). */
  onSelect: (buildingId: string) => void;
}

export function BuildingBrowser({ onBack, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const all = useMemo(() => Object.values(buildings).sort((a, b) => a.name.localeCompare(b.name)), []);
  const categories = useMemo(() => {
    const cats = new Set(all.map(b => b.category));
    return ['All', ...CATEGORY_ORDER.filter(c => cats.has(c)), ...Array.from(cats).filter(c => !CATEGORY_ORDER.includes(c)).sort()];
  }, [all]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return all.filter(b => (!q || b.name.toLowerCase().includes(q)) && (selectedCategory === 'All' || b.category === selectedCategory));
  }, [all, search, selectedCategory]);

  useEffect(() => { setPage(1); }, [search, selectedCategory]);
  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="ib-root">
      {/* FICSIT Telemetry Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-2 border-b border-[#2a2d33] bg-[#121316]/60 shrink-0">
        <button className="cdx-back-btn" onClick={onBack}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Codex
        </button>
        <div style={{ width: 3, height: 14, background: 'linear-gradient(180deg, #f48721, #c45700)', borderRadius: 2 }} />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">FICSIT // Building Codex</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
        <span className="text-[8px] font-mono text-[#6b7280] tracking-widest uppercase">DATABASE STATUS: ACTIVE</span>
      </div>

      {/* Toolbar */}
      <div className="ib-toolbar">
        <div className="ib-search-wrap">
          <svg className="ib-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="ib-search" placeholder="Search for a building…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="ib-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>

        <div className="ib-pagesize-selector">
          <span className="ib-pagesize-label">Show:</span>
          {[20, 40, 60].map(size => (
            <button
              key={size}
              className={`ib-pagesize-btn ${pageSize === size ? 'ib-pagesize-btn--active' : ''}`}
              onClick={() => {
                setPageSize(size);
                setPage(1);
              }}
            >
              {size}
            </button>
          ))}
        </div>

        <span className="ib-count">{filtered.length} buildings</span>
      </div>

      {/* Category pills */}
      <div className="ib-cats">
        {categories.map(cat => (
          <button key={cat} className={`ib-cat-pill ${selectedCategory === cat ? 'ib-cat-pill--active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="ib-grid-wrap">
        {filtered.length === 0 ? (
          <div className="ib-empty">No buildings found for "{search}"</div>
        ) : (
          <>
            <div className="ib-grid">
              {pageItems.map(b => <BuildingCard key={b.id} building={b} onClick={() => onSelect(b.id)} />)}
            </div>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

function BuildingCard({ building, onClick }: { building: Building; onClick: () => void }) {
  return (
    <button className="ib-card" onClick={onClick} title={building.name}>
      <div className="ib-card-img-wrap">
        <AppImage idKey={building.id} fallbackUrl={building.imageUrl} alt={building.name} className="ib-card-img" />
        {building.powerConsumption > 0 && <span className="ib-card-badge ib-card-badge--power">{building.powerConsumption}MW</span>}
      </div>
      <span className="ib-card-name">{building.name}</span>
      <span className="ib-card-cat">{building.category}</span>
    </button>
  );
}
