"use client";

import { useState, useMemo } from "react";
import { TopBar, Footer } from "@/components/layout-shared"; // Pastikan layout-shared udah ada
import { ruleCategories } from "@/lib/rules-data";

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

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* Background Effect */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      {/* Reusable TopBar (tanpa tombol tong sampah) */}
      <TopBar title="Official Rulebook" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        
        {/* HERO SECTION KHUSUS RULES */}
        <header className="mt-6 mb-8 flex flex-col items-center text-center lg:mb-10">
          <h1 className="glow-text text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            TWI RULEBOOK
          </h1>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:py-1.5 sm:text-sm">
            Season 7 Guidelines
          </p>
          <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
            Baca dan pahami seluruh regulasi sebelum bertanding. Ketidaktahuan akan peraturan tidak membebaskan peserta dari sanksi.
          </p>
        </header>

        <section className="flex w-full max-w-4xl flex-col items-center">
          
          {/* SEARCH & FILTER BAR */}
          <div className="mb-8 w-full space-y-4">
            {/* Search Input */}
            <div className="relative w-full">
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

            {/* Filter Pills (Scrollable Horizontal) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeCategory === "ALL"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Semua Bab
              </button>
              {ruleCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                    activeCategory === cat.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Bab {cat.id}
                </button>
              ))}
            </div>
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
        
      </div>
    </main>
  );
                                   }
                        
