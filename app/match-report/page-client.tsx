"use client";

import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { useMatchReport } from "./hooks/use-match-report";
import { MatchFormCard } from "./components/match-form-card";
import { DiscordPreview } from "./components/discord-preview";
import { MatchFilterPanel } from "./components/match-filter-panel";
import { ResetConfirmModal } from "./components/reset-confirm-modal";
import { MatchItem, STORAGE_KEY, generateFileName, maskImageUrl } from "./utils/lib-match-report";

interface MatchReportPageClientProps {
  initialMatches?: MatchItem[];
  isAdmin?: boolean;
}

export default function MatchReportPageClient({
  initialMatches = [],
  isAdmin = false,
}: MatchReportPageClientProps) {
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshingKv, setIsRefreshingKv] = useState<boolean>(false);
  const [isConfirmTrashOpen, setIsConfirmTrashOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | "ALL">("ALL");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");

  const {
    setSelectedWeek,
    selectedMatchIds,
    handleMatchToggle,
    reports,
    updateNotes,
    handleDirectUpload,
    isSending,
    setIsSending,
  } = useMatchReport(matches);

  const getSlug = (str: string) =>
    str ? str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") : "";

  const handleRefreshKvData = async () => {
    setIsRefreshingKv(true);
    try {
      const res = await fetch("/api/tournament", { cache: "no-store" });
      if (!res.ok) throw new Error("API Refresh Failed");
      const data = await res.json();

      if (data?.schedules && Array.isArray(data.schedules) && data.schedules.length > 0) {
        const formatted: MatchItem[] = data.schedules.map((m: any, index: number) => {
          const rawId = m?.id || `match-${index + 1}`;
          const matchNumberStr = rawId.replace(/[^0-9]/g, "") || String(index + 1);

          return {
            id: rawId,
            group: m?.groupName || "Group Stage",
            week: Number(m?.weekNumber) || 1,
            matchNumber: parseInt(matchNumberStr, 10) || index + 1,
            scoreA: m?.scoreA ?? 0,
            scoreB: m?.scoreB ?? 0,
            teamALogo: m?.teamALogo || "/logo.webp",
            teamBLogo: m?.teamBLogo || "/logo.webp",
            reportImageUrl: m?.reportImageUrl || "",
            reportNotes: m?.reportNotes || "",
            teamA: {
              name: m?.teamAName || "Team A",
              code: m?.teamACode || m?.teamAName || "Team A",
              emojiId: m?.teamAEmojiId || "",
              emoji: m?.teamAEmoji || "",
            },
            teamB: {
              name: m?.teamBName || "Team B",
              code: m?.teamBCode || m?.teamBName || "Team B",
              emojiId: m?.teamBEmojiId || "",
              emoji: m?.teamBEmoji || "",
            },
          };
        });
        setMatches(formatted);
      }
    } catch (err) {
      console.error("Gagal refresh KV data:", err);
    } finally {
      setIsRefreshingKv(false);
    }
  };

  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) {
      setMatches(initialMatches);
      return;
    }
    handleRefreshKvData();
  }, [initialMatches]);

  const currentWeekNumber = useMemo(() => {
    const startDateStr = process.env.NEXT_PUBLIC_TWI_START_DATE || "2026-08-03";
    const startDate = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
    const now = Date.now();
    if (isNaN(startDate) || now < startDate) return 1;
    const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }, []);

  const availableWeeksFilter = useMemo(() => {
    if (!matches || matches.length === 0) return [1];
    const allWeekNumbers = Array.from(new Set(matches.map((m) => m.week))).sort((a, b) => a - b);
    if (isAdmin) return allWeekNumbers.length > 0 ? allWeekNumbers : [1];
    const restrictedWeeks = allWeekNumbers.filter((w) => w <= currentWeekNumber);
    return restrictedWeeks.length > 0 ? restrictedWeeks : [1];
  }, [matches, isAdmin, currentWeekNumber]);

  useEffect(() => {
    if (typeof selectedWeekFilter === "number") setSelectedWeek(selectedWeekFilter);
  }, [selectedWeekFilter, setSelectedWeek]);

  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    return matches.filter((m) => {
      if (!isAdmin && m.week > currentWeekNumber) return false;
      if (selectedWeekFilter !== "ALL" && m.week !== selectedWeekFilter) return false;
      if (selectedGroupFilter !== "ALL" && m.group !== selectedGroupFilter) return false;
      return true;
    });
  }, [matches, selectedWeekFilter, selectedGroupFilter, isAdmin, currentWeekNumber]);

  const selectedMatches = useMemo(() => {
    if (!matches) return [];
    return matches.filter((m) => selectedMatchIds.includes(m.id));
  }, [matches, selectedMatchIds]);

  // 🟢 SIMPAN KE KV UNTUK CRON JOB
  const handleSaveAll = async () => {
    if (selectedMatches.length === 0) return;

    setIsSending(true);

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

        await Swal.fire({
          title: "Berhasil Disimpan!",
          text: "Data Match Report tersimpan di KV dan siap diposting otomatis via Cron Job!",
          icon: "success",
          confirmButtonColor: "#AA1348",
          background: "#121212",
          color: "#ffffff",
        });

        window.location.reload();
      } else {
        const errData = await res.json();
        Swal.fire({
          title: "Gagal Menyimpan!",
          text: errData.error || "Gagal menyimpan data ke database.",
          icon: "error",
          confirmButtonColor: "#AA1348",
          background: "#121212",
          color: "#ffffff",
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: "Kesalahan Jaringan!",
        text: err.message || "Gagal menghubungi server.",
        icon: "error",
        confirmButtonColor: "#AA1348",
        background: "#121212",
        color: "#ffffff",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Official Match Report" showTrash={true} onClearStorage={() => setIsConfirmTrashOpen(true)} />

      <ResetConfirmModal
        isOpen={isConfirmTrashOpen}
        onClose={() => setIsConfirmTrashOpen(false)}
        onConfirm={() => {
          localStorage.removeItem(STORAGE_KEY);
          setIsConfirmTrashOpen(false);
          window.location.reload();
        }}
      />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader showDetails={false} />

        <section className="w-full max-w-4xl space-y-5">
          <MatchFilterPanel
            selectedGroup={selectedGroupFilter}
            onSelectGroup={setSelectedGroupFilter}
            selectedWeek={selectedWeekFilter}
            onSelectWeek={setSelectedWeekFilter}
            availableWeeks={availableWeeksFilter}
            isRefreshingKv={isRefreshingKv}
            onRefreshKv={handleRefreshKvData}
            onResetFilter={() => {
              setSelectedWeekFilter("ALL");
              setSelectedGroupFilter("ALL");
            }}
          />

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

          {selectedMatches.map((m) => (
            <MatchFormCard
              key={m.id}
              match={m}
              entry={reports[m.id]}
              onUpload={(file) => handleDirectUpload(m, file)}
              onNotesChange={(notes) => updateNotes(m.id, notes)}
            />
          ))}

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
                onClick={handleSaveAll}
                disabled={isSending}
                className="flex-1 rounded-xl bg-primary py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
              >
                {isSending ? "Menyimpan Data..." : "Simpan Match Report"}
              </button>
            </div>
          )}

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