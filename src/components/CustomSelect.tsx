import React, { useState, useRef, useEffect } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full bg-[#1c1e22] border rounded-lg px-3 py-2 outline-none transition-colors text-xs ${isOpen ? 'border-orange-500 text-white' : 'border-[#2a2d33] text-[#e4e3e0] hover:border-orange-500 focus:border-orange-500'}`}
      >
        <span className="truncate font-medium">{selectedOption?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#8E9299] transition-transform ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#242528] border border-[#3b3d42] rounded-lg shadow-2xl overflow-hidden py-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${option.value === value ? 'bg-orange-500/10 text-orange-500 font-medium' : 'text-[#e4e3e0] hover:bg-[#3b3d42]'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
