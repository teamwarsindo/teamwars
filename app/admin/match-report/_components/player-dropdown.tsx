'use client';

import { useState, useRef, useEffect } from 'react';

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
  isReleased?: boolean;
}

interface PlayerSelectDropdownProps {
  value: string;
  roster: RosterOption[];
  onSelect: (ign: string) => void;
}

export function PlayerSelectDropdown({ value, roster, onSelect }: PlayerSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selected = roster.find((p) => p.ign.toLowerCase() === (value || '').toLowerCase());

  return (
    <div className="relative flex-1 min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 bg-background border border-border/80 hover:border-primary/60 rounded-xl px-3 py-2 text-xs font-bold text-foreground transition shadow-2xs text-left"
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selected ? (
            <>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  selected.isReleased ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
              <span className="truncate text-foreground">{selected.ign}</span>
            </>
          ) : (
            <span className="text-muted-foreground font-medium truncate">Pilih Pemain...</span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          {roster.length === 0 ? (
            <div className="px-3 py-2.5 text-center text-[11px] text-muted-foreground font-medium">
              Tidak ada data pemain
            </div>
          ) : (
            roster.map((p, i) => (
              <button
                key={`${p.ign}-${i}`}
                type="button"
                onClick={() => {
                  onSelect(p.ign);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition text-left ${
                  value && p.ign.toLowerCase() === value.toLowerCase()
                    ? 'bg-primary/15 text-primary'
                    : 'hover:bg-muted/60 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      p.isReleased ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="truncate">{p.ign}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {p.idDuelLinks || '-'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
