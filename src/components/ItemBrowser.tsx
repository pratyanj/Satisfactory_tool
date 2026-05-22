import React, { useState, useMemo } from 'react';
import { items, recipes, machines, type Item } from '../engine/data';
import { ItemDetail } from './ItemDetail';
import { AppImage } from './AppImage';

const CATEGORY_ORDER = [
  'Ores', 'Ingots', 'Minerals', 'Standard Parts', 'Industrial Parts',
  'Electronics', 'Communications', 'Quantum Technology', 'Nuclear',
  'Liquids', 'Gas', 'Fuels', 'Containers', 'Aliens',
  'Ammos', 'Consumed', 'Waste', 'Special',
];

interface ItemBrowserProps {
  selectedItemId: string | null;
  setSelectedItemId: (itemId: string | null) => void;
}

export function ItemBrowser({ selectedItemId, setSelectedItemId }: ItemBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const allItems = useMemo(() => Object.values(items).sort((a, b) => a.name.localeCompare(b.name)), []);

  const categories = useMemo(() => {
    const cats = new Set(allItems.map(i => i.category));
    return ['All', ...CATEGORY_ORDER.filter(c => cats.has(c)), ...Array.from(cats).filter(c => !CATEGORY_ORDER.includes(c)).sort()];
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter(item => {
      const matchSearch = !q || item.name.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [allItems, search, selectedCategory]);

  if (selectedItemId) {
    return (
      <ItemDetail
        itemId={selectedItemId}
        onBack={() => setSelectedItemId(null)}
        onNavigate={setSelectedItemId}
      />
    );
  }

  return (
    <div className="ib-root">
      {/* FICSIT Telemetry Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-2 border-b border-[#2a2d33] bg-[#121316]/60 shrink-0">
        <div style={{
          width: 3, height: 14,
          background: 'linear-gradient(180deg, #f48721, #c45700)',
          borderRadius: 2,
        }} />
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#f48721] uppercase font-bold">
          FICSIT // Item Codex
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #f4872130, transparent)' }} />
        <span className="text-[8px] font-mono text-[#6b7280] tracking-widest uppercase">
          DATABASE STATUS: ACTIVE
        </span>
      </div>

      {/* Toolbar */}
      <div className="ib-toolbar">
        <div className="ib-search-wrap">
          <svg className="ib-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="ib-search"
            placeholder="Search for an item…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="ib-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <span className="ib-count">{filtered.length} items</span>
      </div>

      {/* Category pills */}
      <div className="ib-cats">
        {categories.map(cat => (
          <button
            key={cat}
            className={`ib-cat-pill ${selectedCategory === cat ? 'ib-cat-pill--active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="ib-grid-wrap">
        {filtered.length === 0 ? (
          <div className="ib-empty">No items found for "{search}"</div>
        ) : (
          <div className="ib-grid">
            {filtered.map(item => (
              <ItemCard key={item.id} item={item} onClick={() => setSelectedItemId(item.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const recipeCount = recipes.filter(r => r.outputItemId === item.id).length;
  return (
    <button className="ib-card" onClick={onClick} title={item.name}>
      <div className="ib-card-img-wrap">
        <AppImage
          idKey={item.id}
          fallbackUrl={item.imageUrl}
          alt={item.name}
          className="ib-card-img"
        />
        {recipeCount > 1 && <span className="ib-card-badge">{recipeCount}</span>}
      </div>
      <span className="ib-card-name">{item.name}</span>
      <span className="ib-card-cat">{item.category}</span>
    </button>
  );
}
