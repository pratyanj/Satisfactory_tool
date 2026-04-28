import React, { useState } from 'react';
import { items, belts, machines, BeltId, MachineId } from '../engine/data';
import { ItemModal } from './ItemModal';

interface InputFormProps {
  onCalculate: (itemId: string, rate: number, minerId: MachineId, beltId: BeltId) => void;
  initialValues?: { itemId: string, rate: number, minerId: MachineId, beltId: BeltId };
}

export function InputForm({ onCalculate, initialValues }: InputFormProps) {
  const [selectedItem, setSelectedItem] = useState<string>(initialValues?.itemId || 'copper_sheet');
  const [rate, setRate] = useState<number>(initialValues?.rate || 120);
  const [minerId, setMinerId] = useState<MachineId>(initialValues?.minerId || 'miner_mk1');
  const [beltId, setBeltId] = useState<BeltId>(initialValues?.beltId || 'mk1');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state if initialValues changes (e.g. from URL load)
  React.useEffect(() => {
    if (initialValues) {
      setSelectedItem(initialValues.itemId);
      setRate(initialValues.rate);
      setMinerId(initialValues.minerId);
      setBeltId(initialValues.beltId);
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && rate > 0) {
      onCalculate(selectedItem, rate, minerId, beltId);
    }
  };

  const producibleItems = Object.values(items).filter(item => 
    !['copper_ore', 'iron_ore', 'limestone', 'coal'].includes(item.id)
  );
  
  const availableMiners = Object.values(machines).filter(m => m.id.startsWith('miner'));
  const availableBelts = Object.values(belts);

  const selectedItemData = items[selectedItem as keyof typeof items];

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-[#151619] border border-[#2a2d33] rounded-2xl p-6 text-white w-full max-w-sm flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#f0f0f0] mb-1">Production Goal</h2>
          <p className="text-xs text-[#8E9299]">Calculate your optimal factory layout.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase">Target Item</label>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-between w-full bg-[#1c1e22] border border-[#2a2d33] rounded-lg px-3 py-2 outline-none hover:border-orange-500 transition-colors group focus:border-orange-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-[#242528] flex items-center justify-center p-0.5">
                {selectedItemData?.imageUrl ? (
                  <img src={`https://wsrv.nl/?url=${encodeURIComponent(selectedItemData.imageUrl)}&default=${encodeURIComponent(selectedItemData.imageUrl)}`} crossOrigin="anonymous" alt={selectedItemData.name} className="w-full h-full object-contain" />
                ) : null}
              </div>
              <span className="text-sm font-medium">{selectedItemData?.name || 'Select Item'}</span>
            </div>
            <div className="text-[#8E9299] group-hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </button>
        </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase">Rate (per min)</label>
        <input 
          type="number" 
          step="1"
          min="1"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="bg-[#1c1e22] border border-[#2a2d33] rounded-lg px-3 py-2.5 outline-none focus:border-orange-500 transition-colors font-mono text-sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase text-[10px]">Miner Tier</label>
          <select 
            value={minerId}
            onChange={(e) => setMinerId(e.target.value as MachineId)}
            className="bg-[#1c1e22] border border-[#2a2d33] rounded-lg px-2 py-2 outline-none focus:border-orange-500 transition-colors text-xs"
          >
            {availableMiners.map(miner => (
              <option key={miner.id} value={miner.id}>{miner.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono tracking-widest text-[#8E9299] uppercase text-[10px]">Belt Tier</label>
          <select 
            value={beltId}
            onChange={(e) => setBeltId(e.target.value as BeltId)}
            className="bg-[#1c1e22] border border-[#2a2d33] rounded-lg px-2 py-2 outline-none focus:border-orange-500 transition-colors text-xs"
          >
            {availableBelts.map(belt => (
              <option key={belt.id} value={belt.id}>{belt.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button 
        type="submit"
        className="mt-2 bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 px-4 rounded-lg transition-colors active:scale-[0.98] transform flex justify-center items-center gap-2"
      >
        <span>Calculate Flow</span>
      </button>
    </form>
    
    <ItemModal 
      isOpen={isModalOpen} 
      onClose={() => setIsModalOpen(false)} 
      onSelect={(id) => setSelectedItem(id)} 
    />
  </>
  );
}
