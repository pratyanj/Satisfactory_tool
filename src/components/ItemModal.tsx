import React, { useState } from 'react';
import { items, ItemId } from '../engine/data';
import { AppImage } from './AppImage';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (itemId: ItemId) => void;
}

export function ItemModal({ isOpen, onClose, onSelect }: ItemModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredItems = Object.values(items).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#242528] border border-[#3b3d42] rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#3b3d42] bg-[#1e1f22] flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold text-white">Select Product</h2>
          <button 
            onClick={onClose}
            className="text-[#8E9299] hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Toolbar / Search */}
        <div className="p-4 border-b border-[#3b3d42] bg-[#2a2b30] shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#1e1f22] border border-[#3b3d42] text-white rounded-md py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 transition-colors placeholder:text-[#5c5f66]"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1 bg-[#1a1b1e] space-y-8">
          {Object.entries(
            filteredItems.reduce((acc, item) => {
              const cat = item.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {} as Record<string, typeof filteredItems>)
          ).map(([category, itemsInCategory]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-[#8E9299] uppercase tracking-wider mb-4 border-b border-[#3b3d42] pb-2">
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
                    className="flex flex-col items-center justify-center p-4 bg-[#242528] rounded-lg border border-[#3b3d42] hover:border-orange-500 hover:bg-[#2a2b30] transition-all group"
                  >
                    <div className="w-20 h-20 mb-3 flex items-center justify-center relative">
                      {/* Background glow effect on hover */}
                      <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {item.imageUrl ? (
                        <AppImage 
                          idKey={item.id}
                          fallbackUrl={item.imageUrl}
                          alt={item.name} 
                          className="w-full h-full object-contain relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#3b3d42] rounded-md relative z-10" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-[#e4e3e0] text-center group-hover:text-white transition-colors">{item.name}</span>
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
}
