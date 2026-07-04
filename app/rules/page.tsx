"use client";

import { useState, useMemo } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { ruleCategories } from "@/lib/rules-data";
import { BackToTop } from "@/components/back-to-top";

export default function RulebookPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  // Logika Filter & Search
  const filteredRules = useMemo(() => {
    return ruleCategories
      .filter((cat) => (activeCategory === "ALL" ? true : cat.id === activeCategory))
      .map((category) => {
        // Jika search kosong, kembalikan semua data di kategori tersebut
        if (!searchQuery.trim()) return category;

        const query = searchQuery.toLowerCase();
        
        // Cek apakah judul kategori match
        if (category.title.toLowerCase().includes(query)) return category;

        // Cek isi rules (subbab dan poin)
        const matchingRules = category.rules.filter((rule) => {
          if (rule.title.toLowerCase().includes(query)) return true;
          return rule.points.some((point) => {
            if (typeof point === "string") return point.toLowerCase().includes(query);
            return (
              point.text.toLowerCase().includes(query) ||
              point.subPoints.some((sp) => sp.toLowerCase().includes(query))
            );
          });
        });

        // Kembalikan kategori dengan rule yang match saja
        return { ...category, rules: matchingRules };
      })
      .filter((category) => category.rules.length > 0);
  }, [searchQuery, activeCategory]);

  // Fungsi untuk membersihkan filter
  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveCategory("ALL");
  };

  const isFilterActive = searchQuery !== "" || activeCategory !== "ALL";
  
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* Background Effect */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      {/* Reusable TopBar */}
      <TopBar title="Official Rulebook" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        
        {/* HERO SECTION */}
        <HeroHeader />

        <section className="flex w-full max-w-4xl flex-col items-center">
          
          {/* SEARCH & FILTER BAR */}
          <div className="mb-8 w-full space-y-4">
            
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Search Input */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Cari peraturan, sanksi, waktu kontrol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background/50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Dropdown Filter Kategori */}
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

            {/* Tombol Clear Filter */}
            {isFilterActive && (
              <div className="flex justify-end">
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                >
                  ✕ Bersihkan Pencarian
                </button>
              </div>
            )}
          </div>

          {/* RULES LIST */}
          <div className="flex w-full flex-col gap-6">
            {filteredRules.length === 0 ? (
              <div className="glass glow-border flex flex-col items-center justify-center rounded-2xl border p-12 text-center text-muted-foreground">
                <span className="mb-2 text-3xl">👻</span>
                <p>Peraturan yang lu cari nggak ketemu.</p>
              </div>
            ) : (
              filteredRules.map((category) => (
                <div key={category.id} className="glass glow-border rounded-2xl border p-5 sm:p-7">
                  <div className="mb-5 border-b border-border pb-4">
                    <h2 className="text-xl font-bold tracking-tight text-primary">
                      BAB {category.id} - {category.title}
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {category.rules.map((rule, idx) => (
                      <div key={idx} className="space-y-3">
                        <h3 className="font-semibold text-foreground">
                          {rule.title}
                        </h3>
                        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                          {rule.points.map((point, pIdx) => (
                            <li key={pIdx}>
                              {typeof point === "string" ? (
                                <p>{point}</p>
                              ) : (
                                <div>
                                  <p className="mb-1">{point.text}</p>
                                  <ul className="ml-4 space-y-1 border-l-2 border-primary/30 pl-3">
                                    {point.subPoints.map((sp, spIdx) => (
                                      <li key={spIdx}>{sp}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        </section>

        <Footer />
        <BackToTop />
        
      </div>
    </main>
  );
}
