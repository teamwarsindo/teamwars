"use client";

import { useState, useMemo } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { ruleCategories } from "@/lib/rules-data";
import { BackToTop } from "@/components/back-to-top";

export default function RulebookPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  const filteredRules = useMemo(() => {
    return ruleCategories
      .filter((cat) => (activeCategory === "ALL" ? true : cat.id === activeCategory))
      .map((category) => {
        if (!searchQuery.trim()) return category;

        const query = searchQuery.toLowerCase();
        
        if (category.title.toLowerCase().includes(query)) return category;

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

        return { ...category, rules: matchingRules };
      })
      .filter((category) => category.rules.length > 0);
  }, [searchQuery, activeCategory]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveCategory("ALL");
  };

  const isFilterActive = searchQuery !== "" || activeCategory !== "ALL";
  
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Official Rulebook" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        
        <HeroHeader />
          
        <section className="flex w-full max-w-4xl flex-col items-center">
          
          {/* SEARCH & FILTER BAR */}
          <div className="mb-8 w-full space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
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

          {/* RULES LIST - REAL MOBILE RESPONSIVE UI/UX */}
          <div className="flex w-full flex-col gap-6">
            {filteredRules.length === 0 ? (
              <div className="glass glow-border flex flex-col items-center justify-center rounded-2xl border p-12 text-center text-muted-foreground">
                <span className="mb-2 text-3xl">👻</span>
                <p>Peraturan yang lu cari nggak ketemu.</p>
              </div>
            ) : (
              filteredRules.map((category) => (
                <div key={category.id} className="glass glow-border rounded-2xl border p-5 sm:p-7">
                  <div className="mb-6 border-b border-border pb-4">
                    <h2 className="text-xl font-bold tracking-tight text-primary">
                      BAB {category.id} - {category.title}
                    </h2>
                  </div>

                  <div className="space-y-8">
                    {category.rules.map((rule, idx) => (
                      <div key={idx} className="space-y-4">
                        {/* Judul Aturan */}
                        <h3 className="text-base font-bold text-foreground">
                          {rule.title}
                        </h3>
                        
                        {/* Konten Aturan */}
                        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                          {rule.points.map((point, pIdx) => (
                            <div key={pIdx}>
                              {typeof point === "string" ? (
                                /* Menggunakan layout flex untuk memisahkan abjad/nomor bawaan teks */
                                <div className="flex items-start gap-2 text-left">
                                  {/* Jika string diawali abjad seperti "a. ", "b. ", atau nomor, deteksi atau biarkan mengalir rata kiri murni */}
                                  <p className="w-full text-left whitespace-pre-line">{point}</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <p className="text-left font-medium text-foreground/90">{point.text}</p>
                                  
                                  {/* List bullet sungguhan untuk sub-poin, rata kiri murni tanpa justify maksa */}
                                  <ul className="ml-2 space-y-2 text-left">
                                    {point.subPoints.map((sp, spIdx) => (
                                      <li key={spIdx} className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                        <span className="w-full text-left">{sp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
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
