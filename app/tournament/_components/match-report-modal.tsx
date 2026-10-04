"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { formatStageName } from "@/app/tournament/_library/utils";
import { ReportScoreboard } from "@/app/analytics/_components/report-scoreboard";
import { ReportSummary } from "@/app/analytics/_components/report-summary";
import { ExternalLink, X } from "lucide-react";

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

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];

  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? match?.scoreA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? match?.scoreB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10 || match?.isFinished);

  const scheduleDateInfo = useMemo(() => {
    const raw = match?.matchDate;
    if (!raw) return { day: "-", date: "-", time: "-" };
    try {
      const d = new Date(raw);
      const day = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(d);
      const date = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
      const timeStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(d);
      return { day, date, time: `${timeStr.replace(":", ".")} WIB` };
    } catch {
      return { day: "-", date: raw, time: "-" };
    }
  }, [match?.matchDate]);

  const resolvedMatchNumber = useMemo(() => {
    if (report?.metadata?.matchNumber) return report.metadata.matchNumber;
    if (match?.id) {
      const extracted = match.id.replace(/\D/g, "");
      if (extracted) return extracted;
    }
    return 1;
  }, [report?.metadata?.matchNumber, match?.id]);

  const liveInstruction = useMemo(() => {
    if (isFinished || !games.length) return null;
    const last = games[games.length - 1];
    const isWinnerA = last.winner === "teamA";
    return {
      nextGameNumber: games.length + 1,
      stayTable: (isWinnerA ? last.playerA?.ign : last.playerB?.ign) || "Pemenang Ronde Sebelumnya",
      nextActionTeam: (isWinnerA ? teamB.name : teamA.name) || "Kubu Lawan",
    };
  }, [isFinished, games, teamA.name, teamB.name]);

  const standardizedDivision = formatStageName(match?.groupName || meta.division || "");

  const handleNavigateToAnalytics = () => {
    onClose();
    router.push(`/analytics?tab=reports&match=${match?.id}`);
  };

  if (!match || (open !== undefined && !open)) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 pt-14 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/40 shrink-0">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-primary">
              RINGKASAN PERTANDINGAN • WEEK {match.weekNumber || weekNumber || 1}
            </div>
            <div className="text-xs font-bold text-muted-foreground truncate max-w-[280px] sm:max-w-md">
              {match.groupName || "Official Stage"}
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
              <div className="w-full">
                <ReportScoreboard
                  teamA={teamA.name ? teamA : { name: match.teamAName }}
                  teamB={teamB.name ? teamB : { name: match.teamBName }}
                  scoreA={scoreA}
                  scoreB={scoreB}
                  teamALogo={match.teamALogo}
                  teamBLogo={match.teamBLogo}
                  metadata={{
                    matchNumber: resolvedMatchNumber,
                    division: standardizedDivision,
                    week: match.weekNumber || report?.week || weekNumber,
                    day: scheduleDateInfo.day,
                    date: scheduleDateInfo.date,
                    time: scheduleDateInfo.time,
                    referee: meta.referee || match.referee,
                    streamer: meta.streamer || match.streamer,
                    streamUrl: meta.streamUrl || match.streamLink,
                  }}
                />
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
        <div className="p-3 border-t border-border/80 bg-muted/30 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground truncate">
            {standardizedDivision}
          </span>
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
