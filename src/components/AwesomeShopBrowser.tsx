import React, { useMemo, useState, useEffect } from 'react';
import { awesomeShop, items, buildings } from '../engine/data';
import { AppImage } from './AppImage';
import { ShoppingCart, CheckSquare, Square, ArrowLeft, Search, Tag } from 'lucide-react';

interface Props {
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
  onNavigateBuilding: (buildingId: string) => void;
}

export function AwesomeShopBrowser({ onBack, onNavigateItem, onNavigateBuilding }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Track purchased items in localStorage
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sf_shop_purchased');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const savePurchasedItems = (nextSet: Set<string>) => {
    localStorage.setItem('sf_shop_purchased', JSON.stringify(Array.from(nextSet)));
    setPurchasedItems(nextSet);
  };

  const categories = useMemo(() => {
    const cats = new Set(awesomeShop.map(i => i.category));
    return ['All', ...Array.from(cats).sort()];
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return awesomeShop.filter(item => {
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const togglePurchased = (id: string) => {
    const next = new Set(purchasedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    savePurchasedItems(next);
  };

  // Calculations for tickets summary
  const statistics = useMemo(() => {
    let totalPurchasedCoupons = 0;
    let totalLockedCoupons = 0;
    for (const item of awesomeShop) {
      if (purchasedItems.has(item.id)) {
        totalPurchasedCoupons += item.cost;
      } else {
        totalLockedCoupons += item.cost;
      }
    }
    return {
      purchasedCount: purchasedItems.size,
      purchasedCoupons: totalPurchasedCoupons,
      lockedCount: awesomeShop.length - purchasedItems.size,
      lockedCoupons: totalLockedCoupons,
      totalCoupons: totalPurchasedCoupons + totalLockedCoupons
    };
  }, [purchasedItems]);

  return (
    <div className="shop-container flex flex-col h-full w-full bg-[#0d1117] text-[#e4e3e0] overflow-hidden">
      
      {/* ── Header Area ── */}
      <div className="shop-header bg-[#161b22] border-b border-[#30363d] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="cdx-back-btn mr-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Hub
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-[#f48721]">AWESOME Shop</h2>
            <p className="text-[11px] text-gray-400">Pioneer program catalog — unlock cosmetic architecture and custom tools.</p>
          </div>
        </div>

        {/* Coupon stats panel */}
        <div className="flex items-center gap-3 bg-[#0d1117] px-4 py-2 rounded-lg border border-[#30363d] font-mono text-xs">
          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-sans uppercase">Purchased</div>
            <div className="text-[#2ea44f] font-bold mt-0.5">{statistics.purchasedCount} ({statistics.purchasedCoupons} 🎫)</div>
          </div>
          <div className="w-px h-8 bg-[#30363d]" />
          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-sans uppercase">Locked</div>
            <div className="text-[#f48721] font-bold mt-0.5">{statistics.lockedCount} ({statistics.lockedCoupons} 🎫)</div>
          </div>
          <div className="w-px h-8 bg-[#30363d]" />
          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-sans uppercase">Total Tickets</div>
            <div className="text-white font-bold mt-0.5">{statistics.totalCoupons} 🎫</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar / Controls ── */}
      <div className="shop-toolbar bg-[#161b22]/50 border-b border-[#30363d]/80 px-4 py-3 flex flex-col sm:flex-row gap-3 shrink-0">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search shop items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-[#f48721]"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#f48721] text-black'
                  : 'bg-[#161b22] border border-[#30363d] text-gray-300 hover:border-[#8b949e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Catalog Grid ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0d1117]">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const isOwned = purchasedItems.has(item.id);
              
              // Find matching item or building in database to enable page links
              const isItem = item.unlockType === 'item' && items[item.unlockId || ''];
              const isBuilding = item.unlockType === 'building' && buildings[item.unlockId || ''];
              const hasLink = !!(isItem || isBuilding);

              const handleLink = (e: React.MouseEvent) => {
                e.stopPropagation(); // prevent triggering owned toggling
                if (isItem && item.unlockId) onNavigateItem(item.unlockId);
                if (isBuilding && item.unlockId) onNavigateBuilding(item.unlockId);
              };

              return (
                <div
                  key={item.id}
                  onClick={() => togglePurchased(item.id)}
                  className={`group relative rounded-xl border p-4 flex flex-col justify-between transition-all cursor-pointer ${
                    isOwned
                      ? 'border-[#2ea44f]/60 bg-[#161b22]/90 shadow-sm'
                      : 'border-[#30363d] bg-[#161b22]/40 hover:bg-[#161b22]/80 hover:border-[#8b949e]'
                  }`}
                >
                  
                  {/* Category badge & checkbox */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-gray-400 bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]/50">
                      {item.category}
                    </span>
                    <button
                      type="button"
                      aria-label={isOwned ? "Mark as unowned" : "Mark as purchased"}
                      className={`text-sm transition-colors ${isOwned ? 'text-[#2ea44f]' : 'text-gray-500 hover:text-gray-400'}`}
                    >
                      {isOwned ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Icon & Name */}
                  <div className="flex flex-col items-center text-center flex-1">
                    <div className="w-16 h-16 bg-[#0d1117]/80 rounded-lg p-2 border border-[#30363d] flex items-center justify-center mb-3">
                      <AppImage idKey={item.unlockId || item.id} fallbackUrl={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug group-hover:text-[#f48721] transition-colors">{item.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed line-clamp-3">{item.description}</p>
                  </div>

                  {/* Cost ticket & Link */}
                  <div className="mt-4 pt-3 border-t border-[#30363d]/50 flex items-center justify-between">
                    
                    {/* FICSIT Coupon ticket style */}
                    <div className="flex items-center gap-1.5 bg-[#f48721]/15 px-2.5 py-1 rounded-md border border-[#f48721]/30">
                      <Tag className="w-3.5 h-3.5 text-[#f48721]" />
                      <span className="text-[11px] font-mono font-black text-[#f48721]">{item.cost} {item.cost === 1 ? 'TICKET' : 'TICKETS'}</span>
                    </div>

                    {/* Codex deep-link if valid item/building */}
                    {hasLink && (
                      <button
                        onClick={handleLink}
                        className="text-[10px] font-bold text-gray-400 hover:text-white transition-all underline decoration-[#30363d] hover:decoration-white"
                      >
                        Inspect Codex
                      </button>
                    )}
                  </div>

                  {/* Completed overlay badge */}
                  {isOwned && (
                    <div className="absolute top-2 right-8 text-[9px] font-bold text-[#2ea44f] bg-[#2ea44f]/15 border border-[#2ea44f]/30 px-1.5 py-0.5 rounded uppercase pointer-events-none">
                      Unlocked
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 gap-2">
            <Tag className="w-8 h-8 text-gray-600" />
            No items matched search or category filters.
          </div>
        )}
      </div>
    </div>
  );
}
