'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface MetaAutocompleteOption {
  label: string;
  val: string;
  sub?: string;
}

interface MetaAutocompleteProps {
  value: string;
  placeholder: string;
  options: MetaAutocompleteOption[];
  type: 'deck' | 'skill';
  disabled?: boolean;
  hasError?: boolean;
  onSelect: (val: string) => void;
  onRefreshMeta?: () => Promise<void>;
}

export function MetaAutocompleteDropdown({
  value,
  placeholder,
  options,
  type,
  disabled = false,
  hasError = false,
  onSelect,
  onRefreshMeta,
}: MetaAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!query.trim()) return options.slice(0, 30);
    const q = query.toLowerCase();
    return options
      .filter((o) => o.label.toLowerCase().includes(q) || o.val.toLowerCase().includes(q))
      .slice(0, 30);
  }, [options, query]);

  const exactMatch = options.some((o) => o.val.toLowerCase() === query.trim().toLowerCase());
  const canAdd = query.trim().length >= 2 && !exactMatch;

  const handleAddNewToKV = async () => {
    const newName = query.trim();
    if (!newName) return;

    setIsSubmitting(true);
    try {
      // Menggunakan endpoint resmi sync-meta
      const res = await fetch('/api/admin/match-report/sync-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === 'deck'
            ? { deck: newName, skill: null }
            : { deck: null, skill: newName }
        ),
      });

      const json = await res.json();
      if (json.success) {
        // Ambil string nama rapi dari syncCustomDeckAndSkillToMaster
        const savedVal = (type === 'deck' ? json.cleanDeck : json.cleanSkill) || newName;
        onSelect(savedVal);
        setQuery(savedVal);
        setIsOpen(false);
        if (onRefreshMeta) await onRefreshMeta();
      }
    } catch (e: any) {
      console.error('Gagal menambahkan metadata ke KV:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <div className="w-full px-3 py-2 rounded-xl text-xs bg-muted/30 border border-border/40 text-muted-foreground/50 cursor-not-allowed">
        -- Terkunci (Isi Archetype Dahulu) --
      </div>
    );
  }

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
        className={`w-full px-3 py-2 rounded-xl text-xs bg-background border transition shadow-2xs focus:outline-hidden ${
          hasError
            ? 'border-rose-500 bg-rose-500/5 text-foreground'
            : 'border-border focus:border-primary text-foreground'
        }`}
      />

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1.5 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          {canAdd && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAddNewToKV}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-left cursor-pointer"
            >
              <span>➕</span>
              <span className="truncate">
                {isSubmitting
                  ? 'Menyimpan...'
                  : `Simpan "${query.trim()}" ke Master KV`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onSelect('');
              setQuery('');
              setIsOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/70 transition cursor-pointer"
          >
            {type === 'deck' ? '-- Kosongkan (Deckloss) --' : '-- Kosongkan Skill --'}
          </button>

          {filtered.map((opt, i) => (
            <button
              key={`${opt.val}-${i}`}
              type="button"
              onClick={() => {
                onSelect(opt.val);
                setQuery(opt.val);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                value && opt.val.toLowerCase() === value.toLowerCase()
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-muted/60 text-foreground'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.sub && (
                <span className="text-[10px] font-mono opacity-60 shrink-0">
                  {opt.sub}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
