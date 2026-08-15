"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem } from "@/lib/types/tournament";
import {
  X,
  Trophy,
  Swords,
  Users,
  Loader2,
  Crown,
  Activity,
  Copy,
  Check,
} from "lucide-react";

interface TeamProfileModalProps {
  team: any;
  allSchedules: MatchScheduleItem[];
  onClose: () => void;
}

export function TeamProfileModal({
  team,
  allSchedules,
  onClose,
}: TeamProfileModalProps) {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fetch(`/api/tournament/team-roster?teamName=${encodeURIComponent(team.teamName)}`)
      .then((r) => r.json())
      .then((j) => j.success && setRoster(j.data.players || []))
      .finally(() => setLoading(false));
    return () => {
      document.body.style.overflow = prev;
    };
  }, [team.teamName]);

  const copy = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { history, nextMatch, streak } = useMemo(() => {
    const q = team.teamName.toLowerCase();
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
      nextMatch: matches.find((m) => !m.isFinished),
      streak: [...hist]
        .slice(0, 5)
        .reverse()
        .map((h) => (h.isWin ? "W" : "L")),
    };
  }, [team.teamName, allSchedules]);

  const total = (team.matchWins || 0) + (team.matchLosses || 0);
  const wr = total > 0 ? Math.round((team.matchWins / total) * 100) : 0;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden">
        
        {/* HEADER PROFIL */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-1 flex items-center justify-center">
              <img
                src={team.teamLogo || "/logo.webp"}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate text-white">
                {team.teamName}
              </h2>
              <p className="text-[10.5px] font-semibold text-sky-400">
                {team.groupName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* 1. STATISTIK PERFORMA */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span className="font-bold flex items-center gap-1 text-slate-200 uppercase tracking-wider text-[9.5px]">
                <Activity className="h-3.5 w-3.5 text-sky-400" /> Performa Tim
              </span>
              <div className="flex items-center gap-1">
                {streak.length > 0 ? (
                  streak.map((s, i) => (
                    <span
                      key={i}
                      className={`h-4 w-4 flex items-center justify-center rounded text-[8.5px] font-black ${
                        s === "W"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] text-slate-500">0 Match</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-slate-400 font-bold uppercase">
                  POIN
                </span>
                <span className="text-sm font-black text-sky-400">{team.points}</span>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-slate-400 font-bold uppercase">
                  SET WIN
                </span>
                <span className="text-xs font-black text-white">
                  {team.setWins || 0}
                </span>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-slate-400 font-bold uppercase">
                  ROUND DIFF
                </span>
                <span
                  className={`text-xs font-black ${
                    team.roundDifference > 0
                      ? "text-emerald-400"
                      : team.roundDifference < 0
                      ? "text-rose-400"
                      : "text-slate-300"
                  }`}
                >
                  {team.roundDifference > 0
                    ? `+${team.roundDifference}`
                    : team.roundDifference}
                </span>
              </div>
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 py-2">
                <span className="block text-[8px] sm:text-[8.5px] text-slate-400 font-bold uppercase">
                  WIN RATE
                </span>
                <span className="text-xs font-black text-amber-400">{wr}%</span>
              </div>
            </div>

            <div className="h-1.5 w-full rounded-full bg-rose-500/30 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${wr}%` }}
              />
            </div>
          </div>

          {/* 2. LAGA BERIKUTNYA */}
          {nextMatch && (
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-1.5">
              <span className="text-[9.5px] font-black text-sky-400 flex items-center gap-1.5 uppercase">
                <Swords className="h-3 w-3" /> Laga Mendatang (Week {nextMatch.weekNumber})
              </span>
              <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-sky-500/20 text-[11px] font-bold">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img
                    src={nextMatch.teamALogo || "/logo.webp"}
                    alt=""
                    className="h-5 w-5 object-contain shrink-0"
                  />
                  <span className="truncate text-white">{nextMatch.teamAName}</span>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-800 text-sky-400 shrink-0">
                  VS
                </span>
                <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                  <span className="truncate text-right text-white">{nextMatch.teamBName}</span>
                  <img
                    src={nextMatch.teamBLogo || "/logo.webp"}
                    alt=""
                    className="h-5 w-5 object-contain shrink-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. RIWAYAT PERTANDINGAN */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Riwayat Pertandingan
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-[11px]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-black shrink-0 ${
                        m.isWin
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {m.isWin ? "WIN" : "LOSE"}
                    </span>
                    <span className="text-slate-400 text-[10.5px] shrink-0 font-medium">
                      vs
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <img
                        src={m.oppLogo || "/logo.webp"}
                        alt=""
                        className="h-4 w-4 object-contain shrink-0"
                      />
                      <span className="truncate font-bold text-white">{m.oppName}</span>
                    </div>
                  </div>

                  <div className="px-3 shrink-0 text-center">
                    <span className="rounded-md bg-slate-950 border border-slate-800 px-2 py-0.5 font-bold text-[9px] text-slate-400">
                      Week {m.week}
                    </span>
                  </div>

                  <div className="font-black text-xs min-w-[45px] text-right shrink-0">
                    <span className={m.isWin ? "text-emerald-400" : "text-slate-200"}>
                      {m.myScore}
                    </span>
                    <span className="text-slate-500 mx-1">-</span>
                    <span className={!m.isWin ? "text-rose-400" : "text-slate-200"}>
                      {m.oppScore}
                    </span>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 text-center text-[10.5px] text-slate-400">
                  Belum ada pertandingan yang selesai.
                </p>
              )}
            </div>
          </div>

          {/* 4. SKUAD / ROSTER ANGGOTA */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Users className="h-3 w-3 text-sky-400" /> Roster Anggota
            </span>
            {loading ? (
              <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                Memuat data pemain...
              </div>
            ) : roster.length > 0 ? (
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {roster.map((p, idx) => {
                  const dl = p.idDuelLinks || p.duelId;
                  const isCap = p.role === "Ketua" || p.role === "Kapten";
                  const isCoCap = p.role === "Wakil Ketua";

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1.5">
                        {isCap ? (
                          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        ) : isCoCap ? (
                          <Crown className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        ) : (
                          <span className="text-[9px] text-slate-500 w-3.5 text-center shrink-0 font-bold">
                            {idx + 1}
                          </span>
                        )}
                        <span className="font-bold text-[11px] truncate text-white">
                          {p.ign || p.playerName || p.namaLengkap}
                        </span>
                      </div>

                      {dl ? (
                        <button
                          type="button"
                          onClick={() => copy(dl)}
                          title="Klik untuk menyalin Duel Links ID"
                          className="flex items-center gap-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 px-1.5 py-0.5 rounded font-mono text-[9px] text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                        >
                          {copiedId === dl ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5 text-sky-400" />
                              <span>{dl}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-3 text-center text-[10.5px] text-slate-400">
                Roster belum terdaftar di database.
              </p>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-800/80 bg-slate-900/95 p-3">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-sky-500 py-2 text-xs font-bold text-white hover:bg-sky-600 transition cursor-pointer"
          >
            Tutup Profil Tim
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
      }
          
