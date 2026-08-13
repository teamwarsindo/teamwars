"use client";

import { useState } from "react";
import { TopBar, Footer } from "@/components/layout-shared";
import { useMatchReport } from "./hooks/use-match-report";
import { MatchFormCard } from "./components/match-form-card";
import { DiscordPreview } from "./components/discord-preview";
import { MatchItem, STORAGE_KEY, generateFileName, maskImageUrl } from "./utils/lib-match-report";

// Dummy Data Contoh (Bisa ditarik dari KV atau Props)
const DUMMY_MATCHES: MatchItem[] = [
  {
    id: "m1",
    group: "Group A",
    week: 1,
    matchNumber: 1,
    teamA: { name: "Team Alpha", code: "TA", emoji: "🟦" },
    teamB: { name: "Team Bravo", code: "TB", emoji: "🟥" },
  },
  {
    id: "m2",
    group: "Group A",
    week: 1,
    matchNumber: 2,
    teamA: { name: "Team Charlie", code: "TC", emoji: "🟨" },
    teamB: { name: "Team Delta", code: "TD", emoji: "🟩" },
  },
];

export default function MatchReportPageClient() {
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
  } = useMatchReport(DUMMY_MATCHES);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const selectedMatches = DUMMY_MATCHES.filter((m) => selectedMatchIds.includes(m.id));

  const handleSendAll = async () => {
    setIsSending(true);

    const formattedDate = new Date().toLocaleDateString("id-ID", {
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
        onClearStorage={() => {
          localStorage.removeItem(STORAGE_KEY);
          window.location.reload();
        }}
      />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6 mt-6">
        <section className="w-full max-w-4xl space-y-6">
          
          {/* Week Selector */}
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
            </select>
          </div>

          {/* Match Checkboxes */}
          <div className="glass glow-border rounded-2xl border p-5 space-y-3">
            <span className="font-bold text-sm block">Pilih Match yang Ingin Dilaporkan:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DUMMY_MATCHES.map((m) => (
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
                    Match #{m.matchNumber}: {m.teamA.name} vs {m.teamB.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Form Dynamic Cards */}
          {selectedMatches.map((m) => (
            <MatchFormCard
              key={m.id}
              match={m}
              entry={reports[m.id]}
              onUpload={(file) => handleDirectUpload(m, file)}
              onNotesChange={(notes) => updateNotes(m.id, notes)}
            />
          ))}

          {/* Actions */}
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

          {/* Discord Preview Section */}
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