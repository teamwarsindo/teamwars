"use client";

import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { useMatchReport } from "./_hooks/use-match-report";
import { MatchFormCard } from "./_components/match-form-card";
import { DiscordPreview } from "./_components/discord-preview";
import { MatchFilterPanel } from "./_components/match-filter-panel";
import { ResetConfirmModal } from "./_components/reset-confirm-modal";
import { MatchItem, STORAGE_KEY, generateFileName, maskImageUrl } from "./_utils/lib-match-report";
import { DIVISION_MAP } from "@/app/tournament/_library";

interface MatchReportPageClientProps {
  initialMatches?: MatchItem[];
  isAdmin?: boolean;
}

export default function MatchReportPageClient({
  initialMatches = [],
  isAdmin = false,
}: MatchReportPageClientProps) {
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
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

  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) {
      setMatches(initialMatches);
    }
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

      if (selectedGroupFilter !== "ALL") {
        const isGroupAMatch = m.group === "Group A" || m.group === DIVISION_MAP.GROUP_A;
        const isGroupBMatch = m.group === "Group B" || m.group === DIVISION_MAP.GROUP_B;
        if (selectedGroupFilter === "Group A" && !isGroupAMatch) return false;
        if (selectedGroupFilter === "Group B" && !isGroupBMatch) return false;
      }

      return true;
    });
  }, [matches, selectedWeekFilter, selectedGroupFilter, isAdmin, currentWeekNumber]);

  const selectedMatches = useMemo(() => {
    if (!matches) return [];
    return matches.filter((m) => selectedMatchIds.includes(m.id));
  }, [matches, selectedMatchIds]);

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
          title: "Berhasil Diperbarui!",
          text: "Data Match Report berhasil diperbarui di KV!",
          icon: "success",
          confirmButtonColor: "#AA1348",
          background: "#121212",
          color: "#ffffff",
        });

        window.location.reload();
      } else {
        const errData = await res.json();
        Swal.fire({
          title: "Gagal Memperbarui!",
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
            onResetFilter={() => {
              setSelectedWeekFilter("ALL");
              setSelectedGroupFilter("ALL");
            }}
          />

          <div className="glass glow-border rounded-2xl border p-5 space-y-3">
            <span className="font-bold text-sm block">Pilih Match yang Ingin Dilaporkan:</span>

            {filteredMatches.length === 0 ? (
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
                {isSending ? "Memperbarui Data..." : "Update Match Report"}
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