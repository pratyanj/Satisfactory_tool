import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { items, ItemId } from '../engine/data';
import { AppImage } from './AppImage';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (itemId: ItemId) => void;
}

export function ItemModal({ isOpen, onClose, onSelect }: ItemModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const filteredItems = Object.values(items).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="sf-modal-container w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="sf-modal-header p-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white tracking-widest uppercase">Select Product</h2>
          <button 
            onClick={onClose}
            className="text-[#8E9299] hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Toolbar / Search */}
        <div className="p-4 bg-[#111214] border-b border-[#2a2d33] shrink-0 z-10">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sf-input-container w-full text-white py-2 pl-10 pr-4 focus:outline-none placeholder:text-[#5c5f66] font-mono text-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1 bg-[#111315] space-y-8 relative">
          {Object.entries(
            filteredItems.reduce((acc, item) => {
              const cat = item.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {} as Record<string, typeof filteredItems>)
          ).map(([category, itemsInCategory]) => (
            <div key={category}>
              <h3 className="text-xs font-mono font-bold text-[#f48721] uppercase tracking-[0.2em] mb-4 border-b border-[#2a2d33] pb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#f48721] inline-block clip-path-polygon-[50%_0,100%_50%,50%_100%,0_50%]"></span>
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {itemsInCategory.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className="sf-item-card flex flex-col items-center justify-center p-4 group"
                  >
                    <div className="w-16 h-16 mb-3 flex items-center justify-center relative">
                      {/* Background glow effect on hover */}
                      <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {item.imageUrl ? (
                        <AppImage 
                          idKey={item.id}
                          fallbackUrl={item.imageUrl}
                          alt={item.name} 
                          className="w-full h-full object-contain relative z-10 drop-shadow-md group-hover:drop-shadow-[0_0_8px_rgba(244,135,33,0.8)] group-hover:scale-110 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#2a2d33] relative z-10" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                      )}
                    </div>
                    <span className="text-xs font-mono font-medium text-[#a0a2a5] text-center group-hover:text-white transition-colors">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-[#8E9299]">
              No items found.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
