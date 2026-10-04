"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ReportSummary } from "@/app/analytics/_components/report-summary";
import { ExternalLink, X, Shield } from "lucide-react";

interface MatchReportModalProps {
  open?: boolean;
  match: MatchScheduleItem | null;
  weekNumber?: number;
  onClose: () => void;
}

export function MatchReportModal({
  open,
  match,
  weekNumber,
  onClose,
}: MatchReportModalProps) {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [summaryTab, setSummaryTab] = useState<"duelist" | "archetype">("duelist");

  useEffect(() => {
    if (match || open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [match, open]);

  useEffect(() => {
    if (!open && !match) {
      setReport(null);
      return;
    }

    const fetchReport = async () => {
      if (!match?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/match-report?matchId=${match.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setReport(json.data);
        } else {
          setReport(null);
        }
      } catch (err) {
        console.error("Gagal memuat report data analytics:", err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [match?.id, open]);

  // Penanganan data murni identik dengan Match Report Analytics dari KV
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];

  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10);

  const teamAName = teamA.name || match?.teamAName || "Team A";
  const teamBName = teamB.name || match?.teamBName || "Team B";
  const teamALogo = teamA.logo || match?.teamALogo;
  const teamBLogo = teamB.logo || match?.teamBLogo;

  const liveInstruction = null;

  const handleNavigateToAnalytics = () => {
    onClose();
    router.push(`/analytics?tab=reports&match=${match?.id}`);
  };

  if (!match || (open !== undefined && !open)) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 pt-12 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/40 shrink-0">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-primary">
              RINGKASAN PERTANDINGAN • WEEK {report?.week || match.weekNumber || weekNumber || 1}
            </div>
            <div className="text-xs font-bold text-muted-foreground truncate max-w-[280px] sm:max-w-md">
              {report?.metadata?.division || match.groupName || "Official Stage"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 text-xs w-full">
          {loading && !report ? (
            <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-muted/20 rounded-2xl border border-border w-full">
              Memuat data laporan duel...
            </div>
          ) : (
            <div className="flex flex-col space-y-3 w-full">
              {/* PAPAN SKOR INTI DARI KV */}
              <div className="rounded-2xl border border-border bg-card p-3 shadow-xs w-full">
                <div className="flex items-center justify-between gap-2">
                  {/* Tim A */}
                  <div className="flex-1 flex flex-col items-center text-center min-w-0">
                    <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-border bg-muted/40 flex items-center justify-center mb-1 shrink-0 shadow-xs">
                      {teamALogo ? (
                        <Image
                          src={teamALogo}
                          alt={teamAName}
                          fill
                          sizes="48px"
                          className="object-cover rounded-full"
                          unoptimized
                        />
                      ) : (
                        <Shield className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-foreground truncate w-full px-1">
                      {teamAName}
                    </span>
                  </div>

                  {/* Skor & Repeat / Warn */}
                  <div className="flex flex-col items-center justify-center px-2 shrink-0">
                    <div className="flex items-center gap-2 font-mono text-2xl sm:text-3xl font-black">
                      <span className={scoreA > scoreB ? "text-primary" : "text-foreground"}>
                        {scoreA}
                      </span>
                      <span className="text-muted-foreground/40 font-sans text-xl font-normal">—</span>
                      <span className={scoreB > scoreA ? "text-primary" : "text-foreground"}>
                        {scoreB}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-col items-center gap-0.5 text-[9px] font-bold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{teamA.repeats || 0}/2</span>
                        <span className="text-[8px] font-black text-amber-500 uppercase">REPEAT</span>
                        <span>{teamB.repeats || 0}/2</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{teamA.warns || 0}/2</span>
                        <span className="text-[8px] font-black text-rose-500 uppercase">WARN</span>
                        <span>{teamB.warns || 0}/2</span>
                      </div>
                    </div>
                  </div>

                  {/* Tim B */}
                  <div className="flex-1 flex flex-col items-center text-center min-w-0">
                    <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-border bg-muted/40 flex items-center justify-center mb-1 shrink-0 shadow-xs">
                      {teamBLogo ? (
                        <Image
                          src={teamBLogo}
                          alt={teamBName}
                          fill
                          sizes="48px"
                          className="object-cover rounded-full"
                          unoptimized
                        />
                      ) : (
                        <Shield className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-foreground truncate w-full px-1">
                      {teamBName}
                    </span>
                  </div>
                </div>
              </div>

              {/* SWITCH TAB RINGKASAN */}
              {isFinished && (
                <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60 w-full">
                  <button
                    type="button"
                    onClick={() => setSummaryTab("duelist")}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition cursor-pointer ${
                      summaryTab === "duelist"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⭐ Duelist Highlight
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryTab("archetype")}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition cursor-pointer ${
                      summaryTab === "archetype"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🃏 Archetype Highlight
                  </button>
                </div>
              )}

              {/* SUMMARY HIGHLIGHT DARI ANALYTICS */}
              <div className="w-full">
                <ReportSummary
                  games={games}
                  isFinished={isFinished}
                  scoreA={scoreA}
                  scoreB={scoreB}
                  liveInstruction={liveInstruction}
                  activeTab={summaryTab}
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER NAVIGASI */}
        <div className="p-3 border-t border-border/80 bg-muted/30 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNavigateToAnalytics}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Lihat Match History Lengkap</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchReportModal;
