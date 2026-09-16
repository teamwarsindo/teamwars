'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface MetaAutocompleteOption {
  label: string;
  val: string;
  sub?: string;
}

interface MetaAutocompleteProps {
  value: string;
  placeholder: string;
  options: MetaAutocompleteOption[];
  onSelect: (val: string) => void;
  onAddNew: (newVal: string) => void;
}

export function MetaAutocompleteDropdown({
  value,
  placeholder,
  options,
  onSelect,
  onAddNew,
}: MetaAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(value || '');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 40);
    const q = query.toLowerCase();
    return options
      .filter((o) => o.label.toLowerCase().includes(q) || o.val.toLowerCase().includes(q))
      .slice(0, 40);
  }, [options, query]);

  const exactMatch = options.some((o) => o.val.toLowerCase() === query.trim().toLowerCase());
  const canAdd = query.trim().length >= 2 && !exactMatch;

  return (
    <div className="relative w-full" ref={ref}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        className="w-full bg-background border border-border/80 focus:border-primary rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-foreground focus:outline-none transition shadow-2xs truncate"
      />

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          {canAdd && (
            <button
              type="button"
              onClick={() => {
                onAddNew(query.trim());
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition text-left"
            >
              <span>➕</span>
              <span className="truncate">Tambah &quot;{query.trim()}&quot; ke Master</span>
            </button>
          )}

          {filtered.map((opt, i) => (
            <button
              key={`${opt.val}-${i}`}
              type="button"
              onClick={() => {
                onSelect(opt.val);
                setQuery(opt.val);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-left transition ${
                value && opt.val.toLowerCase() === value.toLowerCase()
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-muted/60 text-foreground'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.sub && (
                <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                  {opt.sub}
                </span>
              )}
            </button>
          ))}

          {filtered.length === 0 && !canAdd && (
            <div className="px-3 py-2 text-center text-[10px] text-muted-foreground">
              Tidak ada hasil
            </div>
          )}
        </div>
      )}
    </div>
  );
}
