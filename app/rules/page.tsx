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

  // FUNGSI AJAIB: Mengubah teks "a.", "1.", "i." menjadi UI Badge interaktif
  const renderPointUI = (rawText: string, isSub: boolean = false) => {
    // 1. Deteksi list standar (a., 1., i., dll)
    const listMatch = rawText.match(/^([a-zA-Z0-9]{1,3})\.\s+(.*)/);
    if (listMatch) {
      return (
        <div className="flex items-start gap-3">
          <span className={`flex shrink-0 items-center justify-center font-bold uppercase rounded-md mt-0.5 ${
            isSub 
              ? 'h-5 min-w-[24px] bg-secondary/40 text-[10px] text-secondary-foreground' 
              : 'h-6 min-w-[28px] bg-primary/10 text-xs text-primary ring-1 ring-primary/20'
          }`}>
            {listMatch[1]}
          </span>
          <span className="w-full text-sm leading-relaxed text-muted-foreground">{listMatch[2]}</span>
        </div>
      );
    }

    // 2. Deteksi kasus khusus di Bab E (Kasus 1:, Player A:, dll)
    const caseMatch = rawText.match(/^(Kasus\s\d+|Player\s[A-Z]):\s+(.*)/i);
    if (caseMatch) {
      return (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive ring-1 ring-destructive/20">
            {caseMatch[1]}
          </span>
          <span className="w-full text-sm leading-relaxed text-muted-foreground">{caseMatch[2]}</span>
        </div>
      );
    }

    // 3. Teks paragraf biasa
    return (
      <div className="flex items-start gap-3">
        {isSub && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />}
        <span className="w-full text-sm leading-relaxed text-muted-foreground">{rawText}</span>
      </div>
    );
  };
  
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Official Rulebook" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader description="Baca dan pahami seluruh regulasi sebelum bertanding. Ketidaktahuan akan peraturan tidak membebaskan peserta dari sanksi." />

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

          {/* RULES LIST - MODERN APP UI */}
          <div className="flex w-full flex-col gap-6">
            {filteredRules.length === 0 ? (
              <div className="glass glow-border flex flex-col items-center justify-center rounded-2xl border p-12 text-center text-muted-foreground">
                <span className="mb-2 text-3xl">👻</span>
                <p>Peraturan yang lu cari nggak ketemu.</p>
              </div>
            ) : (
              filteredRules.map((category) => (
                <div key={category.id} className="glass glow-border rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-border pb-4">
                    <h2 className="text-xl font-bold tracking-tight text-primary">
                      BAB {category.id} - {category.title}
                    </h2>
                  </div>

                  <div className="space-y-8">
                    {category.rules.map((rule, idx) => (
                      <div key={idx} className="space-y-4">
                        
                        {/* Judul Aturan dengan Aksen Garis */}
                        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                          <span className="h-5 w-1.5 rounded-full bg-primary/80" aria-hidden="true" />
                          {rule.title}
                        </h3>
                        
                        {/* Konten Aturan */}
                        <div className="space-y-4 pt-1">
                          {rule.points.map((point, pIdx) => (
                            <div key={pIdx}>
                              {typeof point === "string" ? (
                                renderPointUI(point, false)
                              ) : (
                                <div className="space-y-3">
                                  {renderPointUI(point.text, false)}
                                  
                                  {/* Sub-poin dengan Indentasi & Garis Tepi Kiri yang Elegan */}
                                  <div className="ml-3.5 space-y-3 border-l-2 border-border/50 pl-5">
                                    {point.subPoints.map((sp, spIdx) => (
                                      <div key={spIdx}>
                                        {renderPointUI(sp, true)}
                                      </div>
                                    ))}
                                  </div>
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
