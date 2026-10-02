'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItemOption {
  id: string;
  label: string;
}

interface StaffFilterDropdownProps {
  label: string;
  items: DropdownItemOption[];
  selectedValue: string;
  onSelect: (val: string) => void;
  disabled?: boolean;
  icon?: ReactNode;
  align?: 'left' | 'right';
}

export default function StaffFilterDropdown({
  label,
  items,
  selectedValue,
  onSelect,
  disabled = false,
  icon,
  align = 'left',
}: StaffFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold shadow-xs transition ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground'
            : 'hover:border-primary/50 cursor-pointer text-foreground'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
      </button>

      {!disabled && isOpen && (
        <div
          className={`absolute ${alignClass} top-full mt-1.5 z-50 w-full min-w-[140px] max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition truncate cursor-pointer ${
                selectedValue === item.id
                  ? 'bg-primary/10 text-primary font-black'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
