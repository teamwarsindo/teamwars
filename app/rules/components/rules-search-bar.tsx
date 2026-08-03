"use client"

import { ruleCategories } from "./rules-data"

interface RulesSearchBarProps {
  searchQuery: string
  setSearchQuery: (val: string) => void
  activeCategory: string
  setActiveCategory: (val: string) => void
  onClearFilters: () => void
  isFilterActive: boolean
}

export function RulesSearchBar({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  onClearFilters,
  isFilterActive,
}: RulesSearchBarProps) {
  return (
    <div className="mb-8 w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Kolom Pencarian */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">🔍</span>
          <input
            type="text"
            placeholder="Cari peraturan, sanksi, waktu kontrol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background/50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Dropdown Bab */}
        <div className="relative w-full sm:w-64">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-border bg-background/50 py-3 pl-4 pr-10 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Semua Bab</option>
            {ruleCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>Bab {cat.id} - {cat.title}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">▼</div>
        </div>
      </div>

      {/* Tombol Bersihkan */}
      {isFilterActive && (
        <div className="flex justify-end">
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            ✕ Bersihkan Pencarian
          </button>
        </div>
      )}
    </div>
  )
}
