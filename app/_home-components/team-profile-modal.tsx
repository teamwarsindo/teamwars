"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamProfileStats,
} from "@/app/tournament/_library/calculator";
import {
  X,
  Trophy,
  Users,
  Loader2,
  Crown,
  Activity,
  Copy,
  Check,
} from "lucide-react";

interface TeamProfileModalProps {
  team: any;
  allTeams?: ExtendedStandingItem[];
  allSchedules: MatchScheduleItem[];
  onClose: () => void;
}

export function TeamProfileModal({
  team,
  allTeams = [],
  allSchedules = [],
  onClose,
}: TeamProfileModalProps) {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const teamData = useMemo(() => {
    if (!team) return null;
    return getTeamProfileStats(team, allTeams, allSchedules);
  }, [team, allTeams, allSchedules]);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (teamData?.teamName) {
      setLoading(true);
      fetch(`/api/tournament/team-roster?teamName=${encodeURIComponent(teamData.teamName)}`)
        .then((r) => r.json())
        .then((j) => {
          if (j?.success && Array.isArray(j?.data?.players)) {
            setRoster(j.data.players);
          } else {
            setRoster([]);
          }
        })
        .catch(() => setRoster([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      document.body.style.overflow = prev;
    };
  }, [teamData?.teamName]);

  const copy = (id: string) => {
    if (!id) return;
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = id;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { leftColumn, rightColumn } = useMemo(() => {
    if (!roster.length) return { leftColumn: [], rightColumn: [] };
    const mid = Math.ceil(roster.length / 2);
    return {
      leftColumn: roster.slice(0, mid),
      rightColumn: roster.slice(mid),
    };
  }, [roster]);

  if (!mounted || !team || !teamData) return null;

  const renderPlayerItem = (p: any, displayIndex: number) => {
    const dl = p?.idDuelLinks || p?.duelId || p?.idDl || p?.id;
    const isCap = p?.role === "Ketua" || p?.role === "Kapten";
    const isCoCap = p?.role === "Wakil Ketua";

    return (
      <div
        key={displayIndex}
        className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-2.5 py-1.5 md:px-3 md:py-2"
      >
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1 mr-1.5">
          {isCap ? (
            <Crown className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 shrink-0" />
          ) : isCoCap ? (
            <Crown className="h-3.5 w-3.5 md:h-4 md:w-4 text-sky-500 shrink-0" />
          ) : (
            <span className="text-[9px] md:text-[10.5px] text-muted-foreground w-3.5 md:w-4 text-center shrink-0 font-bold">
              {displayIndex + 1}
            </span>
          )}
          <span className="font-bold text-[11px] md:text-xs truncate text-foreground">
            {p?.ign || p?.playerName || p?.namaLengkap || "Pemain"}
          </span>
        </div>

        {dl ? (
          <button
            type="button"
            onClick={() => copy(String(dl))}
            title="Klik untuk menyalin Duel Links ID"
            className="flex items-center gap-1 bg-card hover:bg-muted border border-border hover:border-primary/50 px-1.5 py-0.5 md:px-2 md:py-1 rounded font-mono text-[9px] md:text-[10px] text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0"
          >
            {copiedId === String(dl) ? (
              <>
                <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Disalin</span>
              </>
            ) : (
              <>
                <Copy className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary" />
                <span>{dl}</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-[9px] md:text-[10px] text-muted-foreground font-mono shrink-0">-</span>
        )}
      </div>
    );
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-5 md:p-6 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex max-h-[90vh] w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER PROFIL */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-5 md:px-6 md:py-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-background p-1 flex items-center justify-center">
              <img
                src={teamData.teamLogo}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-black truncate text-foreground">
                {teamData.teamName}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span
                  className={`rounded-md border px-1.5 py-0.5 md:px-2 md:py-0.5 text-[9px] md:text-[10px] font-bold ${
                    teamData.isGroupA
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {teamData.qualification.rankLabel} • {teamData.groupName}
                </span>

                <span
                  className={`rounded-md border px-1.5 py-0.5 md:px-2 md:py-0.5 text-[9px] md:text-[10px] font-bold ${
                    teamData.qualification.isQualified
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {teamData.qualification.stageLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 md:p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>

        {/* BODY KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 text-xs md:text-sm">
          
          {/* 1. STATISTIK PERFORMA */}
          <div className="space-y-2.5 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
            <div className="flex justify-between items-center text-[10px] md:text-xs text-muted-foreground">
              <span className="font-bold flex items-center gap-1 text-foreground uppercase tracking-wider text-[9.5px] md:text-xs">
                <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Performa Tim
              </span>
              <div className="flex items-center gap-1 md:gap-1.5">
                {teamData.streak.length > 0 ? (
                  teamData.streak.map((s, i) => (
                    <span
                      key={i}
                      className={`h-4 w-4 md:h-5 md:w-5 flex items-center justify-center rounded text-[8.5px] md:text-[9.5px] font-black ${
                        s === "W"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">0 Match</span>
                )}
              </div>
            </div>

            {/* 4 KOTAK STATISTIK */}
            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="rounded-xl bg-primary/10 border border-primary/20 py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  WINS
                </span>
                <span className="text-sm sm:text-base md:text-lg font-black text-primary">{teamData.matchWins}</span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  PTS DIFF
                </span>
                <span
                  className={`text-xs sm:text-sm md:text-base font-black ${
                    teamData.rawDiff > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : teamData.rawDiff < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground"
                  }`}
                >
                  {teamData.roundDifference}
                </span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  SCORED
                </span>
                <span className="text-xs sm:text-sm md:text-base font-black text-foreground">
                  {teamData.setWins}
                </span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  WIN RATE
                </span>
                <span className="text-xs sm:text-sm md:text-base font-black text-amber-500">{teamData.winRate}%</span>
              </div>
            </div>

            <div className="h-1.5 md:h-2 w-full rounded-full bg-rose-500/20 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${teamData.winRate}%` }}
              />
            </div>
          </div>

          {/* 2. RIWAYAT PERTANDINGAN */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] md:text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-500" /> Riwayat Pertandingan
            </span>
            <div className="space-y-1.5 max-h-44 md:max-h-56 overflow-y-auto pr-1">
              {teamData.history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-3 py-2 md:px-4 md:py-2.5 text-[11px] md:text-xs"
                >
                  <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
                    <span
                      className={`px-1.5 py-0.5 md:px-2 md:py-0.5 rounded text-[8.5px] md:text-[9.5px] font-black shrink-0 ${
                        m.isWin
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {m.isWin ? "WIN" : "LOSE"}
                    </span>
                    <span className="text-muted-foreground text-[10.5px] md:text-xs shrink-0 font-medium">
                      vs
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <img
                        src={m.oppLogo}
                        alt=""
                        className="h-4 w-4 md:h-5 md:w-5 object-contain shrink-0"
                      />
                      <span className="truncate font-bold text-foreground">{m.oppName}</span>
                    </div>
                  </div>

                  <div className="px-3 shrink-0 text-center">
                    <span className="rounded-md bg-card border border-border px-2 py-0.5 md:px-2.5 md:py-1 font-bold text-[9px] md:text-[10px] text-muted-foreground">
                      Week {m.week}
                    </span>
                  </div>

                  <div className="font-black text-xs md:text-sm min-w-[45px] text-right shrink-0">
                    <span className={m.isWin ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
                      {m.myScore}
                    </span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className={!m.isWin ? "text-rose-600 dark:text-rose-400" : "text-foreground"}>
                      {m.oppScore}
                    </span>
                  </div>
                </div>
              ))}
              {teamData.history.length === 0 && (
                <p className="rounded-xl border border-border bg-muted/10 p-3 text-center text-[10.5px] md:text-xs text-muted-foreground">
                  Belum ada pertandingan yang selesai.
                </p>
              )}
            </div>
          </div>

          {/* 3. ROSTER ANGGOTA */}
          <div className="space-y-1.5 pb-2">
            <span className="text-[9.5px] md:text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> Roster Anggota
            </span>
            {loading ? (
              <div className="py-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin text-primary" />
                Memuat data pemain...
              </div>
            ) : roster.length > 0 ? (
              <div className="max-h-48 md:max-h-60 overflow-y-auto pr-1">
                <div className="flex flex-col gap-1.5 sm:hidden">
                  {roster.map((p, idx) => renderPlayerItem(p, idx))}
                </div>

                <div className="hidden sm:grid sm:grid-cols-2 gap-1.5 md:gap-2">
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    {leftColumn.map((p, idx) => renderPlayerItem(p, idx))}
                  </div>
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    {rightColumn.map((p, idx) =>
                      renderPlayerItem(p, idx + leftColumn.length)
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/10 p-3 text-center text-[10.5px] md:text-xs text-muted-foreground">
                Roster belum terdaftar di database.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}