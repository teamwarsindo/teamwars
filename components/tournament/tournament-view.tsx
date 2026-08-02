"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";
import Swal from "sweetalert2";

export function TournamentView({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<"SCHEDULE" | "GROUP_STANDING" | "GLOBAL_STANDING" | "PLAYOFF">("SCHEDULE");
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [standings, setStandings] = useState<TeamStandingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTournamentData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const data = await res.json();
      if (data) {
        setSchedules(data.schedules || []);
        setStandings(data.standings || []);
      }
    } catch (err) {
      console.error("Error fetching tournament:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, []);

  // Handler Quick Score Admin (10 - 4 Testing)
  const handleQuickScoreUpdate = async (match: MatchScheduleItem) => {
    const { value: formValues } = await Swal.fire({
      title: `UPDATE SKOR MATCH`,
      html: `
        <div className="flex flex-col gap-3 text-left text-xs">
          <p className="font-bold text-center text-sky-400">${match.teamAName} VS ${match.teamBName}</p>
          <div className="flex gap-2 items-center">
            <span className="w-24 font-semibold">${match.teamAName}:</span>
            <input id="swal-scoreA" type="number" min="0" max="10" defaultValue="${match.scoreA}" class="swal2-input !m-0 !w-full" />
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-24 font-semibold">${match.teamBName}:</span>
            <input id="swal-scoreB" type="number" min="0" max="10" defaultValue="${match.scoreB}" class="swal2-input !m-0 !w-full" />
          </div>
          <hr className="my-1 border-border"/>
          <div className="flex gap-2 items-center">
            <span className="w-24">Wasit/Judge:</span>
            <input id="swal-referee" type="text" defaultValue="${match.referee || ''}" class="swal2-input !m-0 !w-full" />
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-24">Streamer:</span>
            <input id="swal-streamer" type="text" defaultValue="${match.streamer || ''}" class="swal2-input !m-0 !w-full" />
          </div>
        </div>
      `,
      focusConfirm: false,
      background: "#171717",
      color: "#fff",
      showCancelButton: true,
      confirmButtonText: "Simpan Score",
      preConfirm: () => {
        return {
          scoreA: Number((document.getElementById("swal-scoreA") as HTMLInputElement).value),
          scoreB: Number((document.getElementById("swal-scoreB") as HTMLInputElement).value),
          referee: (document.getElementById("swal-referee") as HTMLInputElement).value,
          streamer: (document.getElementById("swal-streamer") as HTMLInputElement).value,
        };
      },
    });

    if (formValues) {
      await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MATCH_SCORE",
          matchId: match.id,
          ...formValues,
        }),
      });
      fetchTournamentData();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Data Turnamen...</div>;
  }

  const groupAStandings = standings.filter((s) => s.groupName === "Group A");
  const groupBStandings = standings.filter((s) => s.groupName === "Group B");

  // Filter 8 Tim Teratas Wildcard untuk Play-Ins
  const wildcardStandings = [...standings]
    .sort((a, b) => b.matchWins - a.matchWins || b.roundDifference - a.roundDifference)
    .slice(0, 12);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col gap-6">
      
      {/* 📌 NAVIGATION TAB ATAS */}
      <div className="flex w-full items-center justify-around rounded-2xl border border-border bg-card/80 p-1.5 backdrop-blur-md">
        {[
          { key: "SCHEDULE", label: "Group Schedule" },
          { key: "GROUP_STANDING", label: "Group Standing" },
          { key: "GLOBAL_STANDING", label: "Global Standing" },
          { key: "PLAYOFF", label: "Playoff & Play-Ins" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold uppercase tracking-wider transition ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📅 TAB 1: GROUP SCHEDULE */}
      {activeTab === "SCHEDULE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((match) => (
            <div key={match.id} className="relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3 text-[10px] text-muted-foreground">
                <span className="font-bold text-sky-400">{match.groupName}</span>
                <span>Judge: {match.referee || "TBA"} | Streamer: {match.streamer || "TBA"}</span>
              </div>

              <div className="flex items-center justify-between my-2">
                <div className="flex items-center gap-3 flex-1">
                  <img src={match.teamALogo} alt={match.teamAName} className="h-9 w-9 object-contain" />
                  <span className="text-xs font-bold">{match.teamAName}</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-background border border-border font-black text-sm">
                  <span className={match.scoreA >= 10 ? "text-emerald-400" : ""}>{match.scoreA}</span>
                  <span className="text-muted-foreground text-xs">-</span>
                  <span className={match.scoreB >= 10 ? "text-emerald-400" : ""}>{match.scoreB}</span>
                </div>

                <div className="flex items-center justify-end gap-3 flex-1">
                  <span className="text-xs font-bold text-right">{match.teamBName}</span>
                  <img src={match.teamBLogo} alt={match.teamBName} className="h-9 w-9 object-contain" />
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={() => handleQuickScoreUpdate(match)}
                  className="mt-3 w-full rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/20"
                >
                  ⚙️ Input Score (Admin Test)
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 📊 TAB 2: GROUP STANDING */}
      {activeTab === "GROUP_STANDING" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StandingTable title="Group A" data={groupAStandings} />
          <StandingTable title="Group B" data={groupBStandings} />
        </div>
      )}

      {/* 🌍 TAB 3: GLOBAL STANDING (WILDCARD) */}
      {activeTab === "GLOBAL_STANDING" && (
        <div className="w-full flex flex-col gap-3">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4 text-xs text-sky-300">
            📌 <strong>Top 8 Wildcard / Global Standing</strong> berhak melaju ke babak <strong>Play-Ins</strong>.
          </div>
          <StandingTable title="Global Wildcard Standings" data={wildcardStandings} isGlobal />
        </div>
      )}

      {/* 🏆 TAB 4: PLAYOFF & PLAY-INS */}
      {activeTab === "PLAYOFF" && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-8 text-center">
          <span className="text-4xl mb-2">⚔️</span>
          <h3 className="text-base font-extrabold text-primary uppercase">Babak Play-Ins & Playoff Single Elimination</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Top 2 Group A & Group B mengunci slot Quarterfinals. Top 8 Wildcard akan diadu pada babak Play-Ins.
          </p>
        </div>
      )}

    </div>
  );
}

// Sub-Komponen Tabel Standing Sesuai UI Gambar Reference
function StandingTable({ title, data, isGlobal }: { title: string; data: TeamStandingItem[]; isGlobal?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card/70 p-4 shadow-xl backdrop-blur-md">
      <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-primary border-b border-border pb-2">{title}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
              <th className="py-2 px-1">Rank</th>
              <th className="py-2 px-2">Teams</th>
              <th className="py-2 px-1 text-center">Match W-L</th>
              <th className="py-2 px-1 text-center">RD</th>
              <th className="py-2 px-1 text-center">Set Wins</th>
              <th className="py-2 px-1 text-center font-bold text-primary">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.map((team, idx) => (
              <tr key={team.teamId} className="border-b border-border/40 hover:bg-muted/20 transition">
                <td className="py-2.5 px-1 font-extrabold">{idx + 1}</td>
                <td className="py-2.5 px-2 flex items-center gap-2">
                  <img src={team.teamLogo} alt={team.teamName} className="h-5 w-5 object-contain" />
                  <span className="font-bold">{team.teamName}</span>
                </td>
                <td className="py-2.5 px-1 text-center font-semibold">{team.matchWins}-{team.matchLosses}</td>
                <td className="py-2.5 px-1 text-center text-muted-foreground">{team.roundDifference > 0 ? `+${team.roundDifference}` : team.roundDifference}</td>
                <td className="py-2.5 px-1 text-center">{team.setWins}</td>
                <td className="py-2.5 px-1 text-center font-black text-sky-400">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
    }
    
