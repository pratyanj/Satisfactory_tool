import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
}

export function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sf-input-container w-full px-3 py-1.5 outline-none transition-all text-xs text-[#e4e3e0] bg-[#111214] border border-[#2a2d33] font-mono cursor-pointer appearance-none pr-8 hover:border-[#f48721] hover:text-white"
        style={{
          clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#111214] text-[#e4e3e0] font-mono py-1"
          >
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <ChevronDown size={12} className="text-[#8E9299]" />
      </div>
    </div>
  );
}

