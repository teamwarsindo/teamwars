"use client";

import { useState, useEffect } from "react";
import { TopBar, Footer } from "@/components/layout-shared";
import { useMatchReport } from "./hooks/use-match-report";
import { MatchFormCard } from "./components/match-form-card";
import { DiscordPreview } from "./components/discord-preview";
import { MatchItem, STORAGE_KEY, generateFileName, maskImageUrl } from "./utils/lib-match-report";

export default function MatchReportPageClient() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmTrashOpen, setIsConfirmTrashOpen] = useState(false);

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

  // 🟢 HELPER: KALKULASI WEEK NUMBER BERDASARKAN TANGGAL MATCH
  const calculateWeekFromDate = (matchDateIso?: string): number => {
    if (!matchDateIso) return 1;
    // Gunakan TWI_START_DATE dari env public atau default 3 Agt 2026
    const startDateStr = process.env.NEXT_PUBLIC_TWI_START_DATE || "2026-08-03";
    const startDate = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
    const matchTime = new Date(matchDateIso).getTime();

    if (isNaN(matchTime) || isNaN(startDate)) return 1;

    const diffDays = Math.floor((matchTime - startDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  };

  // 🟢 FETCH & AUTOCORRECT SCHEDULES
  useEffect(() => {
    async function fetchSchedules() {
      setIsLoading(true);
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(`${origin}/api/tournament`, { cache: "no-store" });
        const data = await res.json();

        if (data.schedules && Array.isArray(data.schedules) && data.schedules.length > 0) {
          const formatted: MatchItem[] = [];

          for (const m of data.schedules) {
            let finalWeek = m.weekNumber;

            // Jika weekNumber tidak valid di KV, hitung otomatis dari tanggal
            if (!finalWeek || typeof finalWeek !== "number" || finalWeek < 1) {
              finalWeek = calculateWeekFromDate(m.matchDate);
            }

            const matchNumberStr = m.id ? m.id.replace(/[^0-9]/g, "") : "1";

            formatted.push({
              id: m.id,
              group: m.groupName || "Group Stage",
              week: finalWeek,
              matchNumber: parseInt(matchNumberStr, 10) || 1,
              teamA: {
                name: m.teamAName || "Team A",
                code: (m.teamAName || "TMA").substring(0, 3).toUpperCase(),
                emoji: "🔵",
              },
              teamB: {
                name: m.teamBName || "Team B",
                code: (m.teamBName || "TMB").substring(0, 3).toUpperCase(),
                emoji: "🔴",
              },
            });
          }

          setMatches(formatted);
        } else {
          console.warn("Jadwal di KV masih kosong.");
        }
      } catch (err) {
        console.error("Gagal mengambil jadwal turnamen:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchedules();
  }, []);

  const matchesInSelectedWeek = matches.filter((m) => m.week === selectedWeek);
  const selectedMatches = matches.filter((m) => selectedMatchIds.includes(m.id));

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

      <TopBar
        title="Match Report System"
        showTrash={true}
        onClearStorage={() => setIsConfirmTrashOpen(true)}
      />

      {/* MODAL KONFIRMASI RESET DRAFT */}
      {isConfirmTrashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass glow-border w-full max-w-sm rounded-2xl border bg-popover/90 p-6 shadow-2xl scale-in-95 animate-in">
            <h3 className="text-lg font-bold text-foreground">Reset Draft Match Report?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus semua catatan dan upload gambar yang tersimpan sementara di browser?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsConfirmTrashOpen(false)}
                className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  window.location.reload();
                }}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-destructive/90 active:scale-[0.98]"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6 mt-6">
        <section className="w-full max-w-4xl space-y-6">

          {/* Selector Week */}
          <div className="glass glow-border rounded-2xl border p-5 flex items-center justify-between">
            <span className="font-bold text-sm">Pilih Week Aktif:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold focus:outline-none"
            >
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
              <option value={4}>Week 4</option>
              <option value={5}>Week 5</option>
              <option value={6}>Week 6</option>
              <option value={7}>Week 7</option>
            </select>
          </div>

          {/* Match Checkboxes List */}
          <div className="glass glow-border rounded-2xl border p-5 space-y-3">
            <span className="font-bold text-sm block">Pilih Match yang Ingin Dilaporkan (Week {selectedWeek}):</span>

            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                Memuat jadwal pertandingan...
              </div>
            ) : matchesInSelectedWeek.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Belum ada jadwal pertandingan untuk Week {selectedWeek}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matchesInSelectedWeek.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedMatchIds.includes(m.id)
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background/50 hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMatchIds.includes(m.id)}
                      onChange={() => handleMatchToggle(m.id)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span className="text-sm font-medium">
                      Match #{m.matchNumber} : {m.teamA.name} vs {m.teamB.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Form Dynamic Upload Cards */}
          {selectedMatches.map((m) => (
            <MatchFormCard
              key={m.id}
              match={m}
              entry={reports[m.id]}
              onUpload={(file) => handleDirectUpload(m, file)}
              onNotesChange={(notes) => updateNotes(m.id, notes)}
            />
          ))}

          {/* Action Buttons */}
          {selectedMatches.length > 0 && (
            <div className="glass glow-border rounded-2xl border p-5 flex gap-4">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-bold hover:bg-muted"
              >
                {isPreviewOpen ? "Sembunyikan Preview" : "Preview Discord Embed"}
              </button>

              <button
                type="button"
                onClick={handleSendAll}
                disabled={isSending}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isSending ? "Mengirim..." : "Kirim Semua ke Discord"}
              </button>
            </div>
          )}

          {/* Live Discord Embed Preview */}
          {isPreviewOpen && selectedMatches.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold">Live Preview Tampilan Discord</h3>
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
