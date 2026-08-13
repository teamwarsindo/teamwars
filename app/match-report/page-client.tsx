"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { useMatchReport } from "./hooks/use-match-report";
import { MatchFormCard } from "./components/match-form-card";
import { DiscordPreview } from "./components/discord-preview";
import { MatchItem, STORAGE_KEY, generateFileName, maskImageUrl } from "./utils/lib-match-report";
import { MatchScheduleItem } from "@/lib/types/tournament";
import { ChevronDown, Check, RotateCcw } from "lucide-react";

interface MatchReportPageClientProps {
  initialMatches?: MatchItem[];
}

export default function MatchReportPageClient({ initialMatches = [] }: MatchReportPageClientProps) {
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [isLoading, setIsLoading] = useState(initialMatches.length === 0);
  const [isConfirmTrashOpen, setIsConfirmTrashOpen] = useState(false);

  // Filter States
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | "ALL">("ALL");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const weekRef = useRef<HTMLDivElement>(null);

  const {
    selectedWeek,
    setSelectedWeek,
    selectedMatchIds,
    handleMatchToggle,
    reports,
    updateNotes,
    handleDirectUpload,
    isSending,
    setIsSending,
  } = useMatchReport(matches);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 1. Handle Click Outside Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weekRef.current && !weekRef.current.contains(event.target as Node)) {
        setIsWeekDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Fetch Data Jadwal Real dari API Tournament
  useEffect(() => {
    async function fetchSchedules() {
      setIsLoading(true);
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(`${origin}/api/tournament`, { cache: "no-store" });
        const data = await res.json();

        if (data.schedules && Array.isArray(data.schedules) && data.schedules.length > 0) {
          const formatted: MatchItem[] = data.schedules.map((m: MatchScheduleItem, index: number) => {
            const matchNumberStr = m.id ? m.id.replace(/[^0-9]/g, "") : String(index + 1);

            return {
              id: m.id,
              group: m.groupName || "Group Stage",
              week: m.weekNumber || 1,
              matchNumber: parseInt(matchNumberStr, 10) || index + 1,
              teamA: {
                name: m.teamAName || "Team A",
                code: m.teamAName || "Team A",
                emoji: "🔵",
              },
              teamB: {
                name: m.teamBName || "Team B",
                code: m.teamBName || "Team B",
                emoji: "🔴",
              },
            };
          });

          setMatches(formatted);
        }
      } catch (err) {
        console.error("Gagal mengambil jadwal turnamen:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (initialMatches.length === 0) {
      fetchSchedules();
    }
  }, [initialMatches]);

  // 3. Ekstrak Semua Daftar Week yang Ada Secara Dinamis (1 s/d N)
  const availableWeeks = useMemo(() => {
    const weeksSet = new Set(matches.map((m) => m.week));
    const weeksArr = Array.from(weeksSet).sort((a, b) => a - b);
    return weeksArr.length > 0 ? weeksArr : [1, 2, 3, 4, 5, 6, 7];
  }, [matches]);

  // Set default week jika terpilih angka
  useEffect(() => {
    if (typeof selectedWeekFilter === "number") {
      setSelectedWeek(selectedWeekFilter);
    }
  }, [selectedWeekFilter, setSelectedWeek]);

  // 4. Filtering Match
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedWeekFilter !== "ALL" && m.week !== selectedWeekFilter) return false;
      if (selectedGroupFilter !== "ALL" && m.group !== selectedGroupFilter) return false;
      return true;
    });
  }, [matches, selectedWeekFilter, selectedGroupFilter]);

  const selectedMatches = useMemo(() => {
    return matches.filter((m) => selectedMatchIds.includes(m.id));
  }, [matches, selectedMatchIds]);

  const handleSendAll = async () => {
    setIsSending(true);

    const formattedDate =
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) + ` at ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

    const payload = selectedMatches.map((m) => {
      const entry = reports[m.id];
      const fileName = generateFileName(m);
      return {
        matchId: m.id,
        group: m.group,
        week: m.week,
        matchNumber: m.matchNumber,
        teamA: m.teamA,
        teamB: m.teamB,
        notes: entry?.notes || "",
        imageUrl: entry?.imageUrl || "",
        maskedImageUrl: maskImageUrl(entry?.imageUrl || "", fileName),
        formattedDate,
      };
    });

    try {
      const res = await fetch("/api/match-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: payload }),
      });

      if (res.ok) {
        localStorage.removeItem(STORAGE_KEY);
        alert("Semua Match Report berhasil terkirim ke Discord!");
        window.location.reload();
      } else {
        alert("Gagal mengirim sebagian atau seluruh Match Report.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      {/* TOP BAR */}
      <TopBar
        title="Official Match Report"
        showTrash={true}
        onClearStorage={() => setIsConfirmTrashOpen(true)}
      />

      {/* MODAL KONFIRMASI HAPUS DRAFT */}
      {isConfirmTrashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass glow-border w-full max-w-sm rounded-2xl border bg-popover/90 p-6 shadow-2xl scale-in-95 animate-in">
            <h3 className="text-lg font-bold text-foreground">Reset Draft Match Report?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus semua catatan dan upload gambar yang tersimpan sementara di browser?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmTrashOpen(false)}
                className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  window.location.reload();
                }}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-destructive/90 active:scale-[0.98] cursor-pointer"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        
        {/* HERO HEADER (LOGO & JUDUL) */}
        <HeroHeader showDetails={false} />

        <section className="w-full max-w-4xl space-y-5">
          
          {/* FILTER PANEL */}
          <div className="glass glow-border border border-border p-4 rounded-2xl shadow-sm space-y-3">
            {/* BUTTON FILTER DIVISI */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                type="button"
                onClick={() => setSelectedGroupFilter("ALL")}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer leading-snug ${
                  selectedGroupFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                Semua Divisi
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroupFilter("Group A")}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer leading-snug ${
                  selectedGroupFilter === "Group A"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                Group A
              </button>
              <button
                type="button"
                onClick={() => setSelectedGroupFilter("Group B")}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer leading-snug ${
                  selectedGroupFilter === "Group B"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                Group B
              </button>
            </div>

            {/* CUSTOM DROPDOWN SELECT WEEK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative" ref={weekRef}>
                <button
                  type="button"
                  onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
                >
                  <span className="truncate">
                    {selectedWeekFilter === "ALL" ? "Semua Week" : `Week ${selectedWeekFilter}`}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-primary transition-transform ${isWeekDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isWeekDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWeekFilter("ALL");
                        setIsWeekDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        selectedWeekFilter === "ALL"
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-popover-foreground hover:bg-accent"
                      }`}
                    >
                      <span>Semua Week</span>
                      {selectedWeekFilter === "ALL" && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>

                    {availableWeeks.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setSelectedWeekFilter(w);
                          setIsWeekDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          selectedWeekFilter === w
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-popover-foreground hover:bg-accent"
                        }`}
                      >
                        <span>Week {w}</span>
                        {selectedWeekFilter === w && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RESET FILTER */}
              <button
                type="button"
                onClick={() => {
                  setSelectedWeekFilter("ALL");
                  setSelectedGroupFilter("ALL");
                }}
                disabled={selectedWeekFilter === "ALL" && selectedGroupFilter === "ALL"}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  selectedWeekFilter !== "ALL" || selectedGroupFilter !== "ALL"
                    ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                    : "bg-muted/30 text-muted-foreground/60 border border-border/30 cursor-not-allowed"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>

          {/* CHECKBOXES DOKUMEN MATCH REPORT */}
          <div className="glass glow-border rounded-2xl border p-5 space-y-3">
            <span className="font-bold text-sm block">Pilih Match yang Ingin Dilaporkan:</span>

            {isLoading ? (
              <div className="py-6 text-center text-xs font-bold text-muted-foreground animate-pulse">
                Memuat jadwal pertandingan...
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-muted-foreground">
                Tidak ada jadwal pertandingan yang sesuai dengan filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredMatches.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedMatchIds.includes(m.id)
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-background/50 hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMatchIds.includes(m.id)}
                      onChange={() => handleMatchToggle(m.id)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-xs font-bold">
                      Match #{m.matchNumber} : {m.teamA.name} vs {m.teamB.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* DYNAMIC FORM CARDS */}
          {selectedMatches.map((m) => (
            <MatchFormCard
              key={m.id}
              match={m}
              entry={reports[m.id]}
              onUpload={(file) => handleDirectUpload(m, file)}
              onNotesChange={(notes) => updateNotes(m.id, notes)}
            />
          ))}

          {/* ACTION BUTTONS */}
          {selectedMatches.length > 0 && (
            <div className="glass glow-border rounded-2xl border p-5 flex gap-4">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className="flex-1 rounded-xl border border-border bg-background py-3 text-xs sm:text-sm font-bold hover:bg-muted transition cursor-pointer"
              >
                {isPreviewOpen ? "Sembunyikan Preview" : "Preview Discord Embed"}
              </button>

              <button
                type="button"
                onClick={handleSendAll}
                disabled={isSending}
                className="flex-1 rounded-xl bg-primary py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
              >
                {isSending ? "Mengirim..." : "Kirim Semua ke Discord"}
              </button>
            </div>
          )}

          {/* PREVIEW DISCORD */}
          {isPreviewOpen && selectedMatches.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold">Live Preview Tampilan Discord</h3>
              {selectedMatches.map((m) => (
                <DiscordPreview key={m.id} match={m} entry={reports[m.id]} />
              ))}
            </div>
          )}

        </section>

        <Footer />
      </div>
    </main>
  );
    }
      
