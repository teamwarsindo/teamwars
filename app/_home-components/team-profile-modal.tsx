"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem, DIVISION_MAP, TOURNAMENT_RULES } from "@/app/tournament/_library";
import { buildGlobalStandings } from "@/app/tournament/_library/calculator";
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
  allTeams?: any[];
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

  const teamName = team?.teamName || team?.name || "";

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (teamName) {
      fetch(`/api/tournament/team-roster?teamName=${encodeURIComponent(teamName)}`)
        .then((r) => r.json())
        .then((j) => j.success && setRoster(j.data.players || []))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      document.body.style.overflow = prev;
    };
  }, [teamName]);

  const copy = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Hitung status peringkat divisi dan wildcard secara tepat
  const teamRankInfo = useMemo(() => {
    // 1. Ambil rank divisi asli dari allTeams (calculateStandings)
    const originalTeam = allTeams.find(
      (t) => (t.teamName || t.name || "").toLowerCase() === teamName.toLowerCase()
    );
    const divRank = originalTeam?.rank ?? team?.rank ?? 1;
    const isTopGroup = divRank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP;

    // 2. Jika Top 2 grup, jangan pernah tampilkan wildcard
    if (isTopGroup) {
      return {
        isTopGroup: true,
        divRank,
        wildcardRank: null,
      };
    }

    // 3. Jika bukan top group, cari nomor urut di standing global wildcard
    const globalStandings = buildGlobalStandings(allTeams);
    const wildcardItem = globalStandings.find(
      (t) => !t.isTopGroup && (t.teamName || "").toLowerCase() === teamName.toLowerCase()
    );

    return {
      isTopGroup: false,
      divRank,
      wildcardRank: wildcardItem ? wildcardItem.rank : null,
    };
  }, [team, allTeams, teamName]);

  // Riwayat match dan streak W/L
  const { history, streak } = useMemo(() => {
    const q = teamName.toLowerCase();
    const matches = allSchedules.filter(
      (m) =>
        m.teamAName.toLowerCase() === q || m.teamBName.toLowerCase() === q
    );
    const hist = matches
      .filter((m) => m.isFinished)
      .sort(
        (a, b) =>
          new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      )
      .map((m) => {
        const isA = m.teamAName.toLowerCase() === q;
        return {
          id: m.id,
          week: m.weekNumber,
          isWin: (isA ? m.scoreA : m.scoreB)! > (isA ? m.scoreB : m.scoreA)!,
          myScore: isA ? m.scoreA : m.scoreB,
          oppScore: isA ? m.scoreB : m.scoreA,
          oppName: isA ? m.teamBName : m.teamAName,
          oppLogo: isA ? m.teamBLogo : m.teamALogo,
        };
      });
    return {
      history: hist,
      streak: [...hist]
        .slice(0, 5)
        .reverse()
        .map((h) => (h.isWin ? "W" : "L")),
    };
  }, [teamName, allSchedules]);

  const totalMatches = (team.matchWins || 0) + (team.matchLosses || 0);
  const wr = totalMatches > 0 ? Math.round(((team.matchWins || 0) / totalMatches) * 100) : 0;

  const { leftColumn, rightColumn } = useMemo(() => {
    const mid = Math.ceil(roster.length / 2);
    return {
      leftColumn: roster.slice(0, mid),
      rightColumn: roster.slice(mid),
    };
  }, [roster]);

  const renderPlayerItem = (p: any, displayIndex: number) => {
    const dl = p.idDuelLinks || p.duelId || p.idDl || p.id;
    const isCap = p.role === "Ketua" || p.role === "Kapten";
    const isCoCap = p.role === "Wakil Ketua";

    return (
      <div
        key={displayIndex}
        className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-2.5 py-1.5"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1.5">
          {isCap ? (
            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          ) : isCoCap ? (
            <Crown className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          ) : (
            <span className="text-[9px] text-muted-foreground w-3.5 text-center shrink-0 font-bold">
              {displayIndex + 1}
            </span>
          )}
          <span className="font-bold text-[11px] truncate text-foreground">
            {p.ign || p.playerName || p.namaLengkap}
          </span>
        </div>

        {dl ? (
          <button
            type="button"
            onClick={() => copy(dl)}
            title="Klik untuk menyalin Duel Links ID"
            className="flex items-center gap-1 bg-card hover:bg-muted border border-border hover:border-primary/50 px-1.5 py-0.5 rounded font-mono text-[9px] text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0"
          >
            {copiedId === dl ? (
              <>
                <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Disalin</span>
              </>
            ) : (
              <>
                <Copy className="h-2.5 w-2.5 text-primary" />
                <span>{dl}</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-[9px] text-muted-foreground font-mono shrink-0">-</span>
        )}
      </div>
    );
  };

  if (!mounted || !team) return null;

  const isGroupA = team.groupName === DIVISION_MAP.GROUP_A;

  return createPortal(
    <div
      onClick={(e) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER PROFIL */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-border bg-background p-1 flex items-center justify-center">
              <img
                src={team.teamLogo || team.logo || "/logo.webp"}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate text-foreground">
                {teamName}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {/* 1. BADGE DIVISI RESMI */}
                <span
                  className={`rounded-md border px-1.5 py-0.2 text-[9px] font-black ${
                    isGroupA
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  #{teamRankInfo.divRank} {team.groupName}
                </span>

                {/* 2. BADGE WILDCARD (HANYA JIKA BUKAN TOP GROUP) */}
                {!teamRankInfo.isTopGroup && typeof teamRankInfo.wildcardRank === "number" && (
                  <span
                    className={`rounded-md border px-1.5 py-0.2 text-[9px] font-black ${
                      teamRankInfo.wildcardRank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    #{teamRankInfo.wildcardRank} Wildcard
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* 1. STATISTIK PERFORMA */}
          <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-3">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span className="font-bold flex items-center gap-1 text-foreground uppercase tracking-wider text-[9.5px]">
                <Activity className="h-3.5 w-3.5 text-primary" /> Performa Tim
              </span>
              <div className="flex items-center gap-1">
                {streak.length > 0 ? (
                  streak.map((s, i) => (
                    <span
                      key={i}
                      className={`h-4 w-4 flex items-center justify-center rounded text-[8.5px] font-black ${
                        s === "W"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] text-muted-foreground">0 Match</span>
                )}
              </div>
            </div>

            {/* 4 KOTAK STATISTIK: WINS - PTS DIFF - SCORED - WIN RATE */}
            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="rounded-xl bg-primary/10 border border-primary/20 py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-muted-foreground font-bold uppercase">
                  WINS
                </span>
                <span className="text-sm font-black text-primary">{team.matchWins ?? 0}</span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-muted-foreground font-bold uppercase">
                  PTS DIFF
                </span>
                <span
                  className={`text-xs font-black ${
                    (team.roundDifference ?? 0) > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : (team.roundDifference ?? 0) < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground"
                  }`}
                >
                  {(team.roundDifference ?? 0) > 0
                    ? `+${team.roundDifference}`
                    : team.roundDifference ?? 0}
                </span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-muted-foreground font-bold uppercase">
                  SCORED
                </span>
                <span className="text-xs font-black text-foreground">
                  {team.setWins ?? 0}
                </span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-muted-foreground font-bold uppercase">
                  WIN RATE
                </span>
                <span className="text-xs font-black text-amber-500">{wr}%</span>
              </div>
            </div>

            <div className="h-1.5 w-full rounded-full bg-rose-500/20 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${wr}%` }}
              />
            </div>
          </div>

          {/* 2. RIWAYAT PERTANDINGAN */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black uppercase text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Riwayat Pertandingan
            </span>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-3 py-2 text-[11px]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-black shrink-0 ${
                        m.isWin
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {m.isWin ? "WIN" : "LOSE"}
                    </span>
                    <span className="text-muted-foreground text-[10.5px] shrink-0 font-medium">
                      vs
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <img
                        src={m.oppLogo || "/logo.webp"}
                        alt=""
                        className="h-4 w-4 object-contain shrink-0"
                      />
                      <span className="truncate font-bold text-foreground">{m.oppName}</span>
                    </div>
                  </div>

                  <div className="px-3 shrink-0 text-center">
                    <span className="rounded-md bg-card border border-border px-2 py-0.5 font-bold text-[9px] text-muted-foreground">
                      Week {m.week}
                    </span>
                  </div>

                  <div className="font-black text-xs min-w-[45px] text-right shrink-0">
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
              {history.length === 0 && (
                <p className="rounded-xl border border-border bg-muted/10 p-3 text-center text-[10.5px] text-muted-foreground">
                  Belum ada pertandingan yang selesai.
                </p>
              )}
            </div>
          </div>

          {/* 3. ROSTER ANGGOTA */}
          <div className="space-y-1.5 pb-2">
            <span className="text-[9.5px] font-black uppercase text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" /> Roster Anggota
            </span>
            {loading ? (
              <div className="py-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Memuat data pemain...
              </div>
            ) : roster.length > 0 ? (
              <div className="max-h-48 overflow-y-auto pr-1">
                <div className="flex flex-col gap-1.5 sm:hidden">
                  {roster.map((p, idx) => renderPlayerItem(p, idx))}
                </div>

                <div className="hidden sm:grid sm:grid-cols-2 gap-1.5">
                  <div className="flex flex-col gap-1.5">
                    {leftColumn.map((p, idx) => renderPlayerItem(p, idx))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {rightColumn.map((p, idx) =>
                      renderPlayerItem(p, idx + leftColumn.length)
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/10 p-3 text-center text-[10.5px] text-muted-foreground">
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
  
