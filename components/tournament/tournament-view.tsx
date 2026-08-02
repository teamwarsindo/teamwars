"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";
import Swal from "sweetalert2";

export function TournamentView({
  isAdmin,
  selectedGroupFilter,
  setSelectedGroupFilter,
  selectedDateFilter,
  setSelectedDateFilter,
}: {
  isAdmin: boolean;
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  setSelectedGroupFilter: (v: "ALL" | "Group A" | "Group B") => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (v: string) => void;
}) {
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

  const handleEditMatch = async (match: MatchScheduleItem) => {
    const formattedDate = match.matchDate ? new Date(match.matchDate).toISOString().slice(0, 16) : "";

    const { value: formValues } = await Swal.fire({
      title: `SETTINGS MATCH`,
      html: `
        <div className="flex flex-col gap-3 text-left text-xs">
          <p className="font-bold text-center text-sky-400">${match.teamAName} VS ${match.teamBName}</p>
          <div>
            <label className="font-semibold text-[10px] text-muted-foreground">Waktu Match / Reschedule:</label>
            <input id="swal-date" type="datetime-local" defaultValue="${formattedDate}" class="swal2-input !m-0 !w-full !mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <label className="font-semibold text-[10px]">${match.teamAName}:</label>
              <input id="swal-scoreA" type="number" min="0" max="10" defaultValue="${match.scoreA}" class="swal2-input !m-0 !w-full" />
            </div>
            <div>
              <label className="font-semibold text-[10px]">${match.teamBName}:</label>
              <input id="swal-scoreB" type="number" min="0" max="10" defaultValue="${match.scoreB}" class="swal2-input !m-0 !w-full" />
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      background: "#171717",
      color: "#fff",
      showCancelButton: true,
      confirmButtonText: "Simpan",
      preConfirm: () => {
        return {
          matchDate: new Date((document.getElementById("swal-date") as HTMLInputElement).value).toISOString(),
          scoreA: Number((document.getElementById("swal-scoreA") as HTMLInputElement).value),
          scoreB: Number((document.getElementById("swal-scoreB") as HTMLInputElement).value),
        };
      },
    });

    if (formValues) {
      await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_MATCH", matchId: match.id, ...formValues }),
      });
      fetchTournamentData();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Data Turnamen...</div>;
  }

  // Filter Match
  const filteredSchedules = schedules.filter((m) => {
    const matchGroup = selectedGroupFilter === "ALL" || m.groupName === selectedGroupFilter;
    if (!selectedDateFilter) return matchGroup;
    const mDate = new Date(m.matchDate).toLocaleDateString("sv-SE");
    return matchGroup && mDate === selectedDateFilter;
  });

  const groupAStandings = standings.filter((s) => s.groupName === "Group A");
  const groupBStandings = standings.filter((s) => s.groupName === "Group B");

  return (
    <div className="w-full flex flex-col gap-5">
      
      {/* 🔲 KOTAK TAB NAVIGATION (MOBILE FRIENDLY GRID) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        {[
          { key: "SCHEDULE", label: "Schedule" },
          { key: "GROUP_STANDING", label: "Group Standing" },
          { key: "GLOBAL_STANDING", label: "Global Standing" },
          { key: "PLAYOFF", label: "Playoff Bracket" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-xl py-3 px-2 text-center text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📅 SCHEDULE TAB */}
      {activeTab === "SCHEDULE" && (
        <div className="flex flex-col gap-4">
          
          {/* FILTER CONTROL BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              {(["ALL", "Group A", "Group B"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGroupFilter(g)}
                  className={`rounded-lg py-2 px-3 text-[10px] font-bold uppercase transition ${
                    selectedGroupFilter === g ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g === "ALL" ? "Semua" : g}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-[10px] font-bold text-muted-foreground">📅 Filter Tanggal:</span>
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              />
              {selectedDateFilter && (
                <button
                  onClick={() => setSelectedDateFilter("")}
                  className="rounded-lg bg-rose-500/20 px-2 py-1.5 text-[10px] font-bold text-rose-400"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* LIST MATCH */}
          {filteredSchedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs font-bold text-muted-foreground">
              ⚠️ Tidak ada jadwal pertandingan pada filter ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSchedules.map((match) => {
                const dateObj = new Date(match.matchDate);
                const dateFormatted = dateObj.toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Jakarta",
                });
                const timeFormatted = dateObj.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                }) + " WIB";

                return (
                  <div key={match.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 text-[10px]">
                      <span className={`font-bold ${match.groupName === "Group A" ? "text-sky-400" : "text-amber-400"}`}>
                        {match.groupName}
                      </span>
                      <span className="font-semibold text-primary">{dateFormatted} - {timeFormatted}</span>
                    </div>

                    <div className="flex items-center justify-between my-2 gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={match.teamALogo} alt="" className="h-7 w-7 object-contain shrink-0" />
                        <span className="text-xs font-bold truncate">{match.teamAName}</span>
                      </div>

                      <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-background border border-border font-black text-sm shrink-0">
                        <span className={match.scoreA >= 10 ? "text-emerald-400" : ""}>{match.scoreA}</span>
                        <span className="text-muted-foreground text-xs">-</span>
                        <span className={match.scoreB >= 10 ? "text-emerald-400" : ""}>{match.scoreB}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-right truncate">{match.teamBName}</span>
                        <img src={match.teamBLogo} alt="" className="h-7 w-7 object-contain shrink-0" />
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleEditMatch(match)}
                        className="mt-2 w-full rounded-lg border border-primary/30 bg-primary/10 py-1 text-[10px] font-bold uppercase text-primary"
                      >
                        ⚙️ Edit Match
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 📊 GROUP STANDING */}
      {activeTab === "GROUP_STANDING" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StandingTable title="Group A Standing" data={groupAStandings} />
          <StandingTable title="Group B Standing" data={groupBStandings} />
        </div>
      )}

      {/* 🌍 GLOBAL STANDING (16 TIM LENGKAP) */}
      {activeTab === "GLOBAL_STANDING" && (
        <StandingTable title="Global Wildcard Standings (16 Tim)" data={standings} isGlobal />
      )}

      {/* 🏆 PLAYOFF VISUAL BRACKET TREE */}
      {activeTab === "PLAYOFF" && (
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 overflow-x-auto">
          <h3 className="text-xs font-black uppercase text-primary border-b border-border pb-2">
            🏆 QUALIFIER & PLAYOFF BRACKET SCHEME
          </h3>
          
          <div className="min-w-[700px] grid grid-cols-4 gap-4 text-xs">
            {/* Round 1 */}
            <div className="flex flex-col justify-around gap-6">
              <span className="font-extrabold text-[10px] text-muted-foreground uppercase">Round One</span>
              <BracketCard p1="Top 1 Group A" p2="Wildcard Seed 8" />
              <BracketCard p1="Top 2 Group B" p2="Wildcard Seed 7" />
              <BracketCard p1="Top 1 Group B" p2="Wildcard Seed 6" />
              <BracketCard p1="Top 2 Group A" p2="Wildcard Seed 5" />
            </div>

            {/* Quarter-Final */}
            <div className="flex flex-col justify-around gap-12 my-auto">
              <span className="font-extrabold text-[10px] text-muted-foreground uppercase">Quarter-Final</span>
              <BracketCard p1="Winner R1 #1" p2="Winner R1 #2" />
              <BracketCard p1="Winner R1 #3" p2="Winner R1 #4" />
            </div>

            {/* Semi-Final */}
            <div className="flex flex-col justify-around gap-20 my-auto">
              <span className="font-extrabold text-[10px] text-muted-foreground uppercase">Semi-Final</span>
              <BracketCard p1="Winner QF #1" p2="Winner QF #2" />
            </div>

            {/* Grand Final */}
            <div className="flex flex-col justify-center my-auto">
              <span className="font-extrabold text-[10px] text-amber-400 uppercase mb-2">Grand Final</span>
              <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-950/20 p-4 text-center">
                <p className="font-extrabold text-amber-400">GRAND FINAL</p>
                <p className="text-[10px] text-muted-foreground mt-1">Winner SF #1 VS Winner SF #2</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function BracketCard({ p1, p2 }: { p1: string; p2: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-2.5 flex flex-col gap-1.5 shadow-sm">
      <div className="flex items-center justify-between font-bold text-[11px]">
        <span className="truncate">{p1}</span>
        <span className="text-sky-400">0</span>
      </div>
      <div className="border-t border-border/40" />
      <div className="flex items-center justify-between font-bold text-[11px]">
        <span className="truncate">{p2}</span>
        <span className="text-sky-400">0</span>
      </div>
    </div>
  );
}

function StandingTable({ title, data, isGlobal }: { title: string; data: TeamStandingItem[]; isGlobal?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-primary border-b border-border pb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
              <th className="py-2 px-1">Rank</th>
              <th className="py-2 px-2">Teams</th>
              <th className="py-2 px-1 text-center">W-L</th>
              <th className="py-2 px-1 text-center">RD</th>
              <th className="py-2 px-1 text-center">Set Wins</th>
              <th className="py-2 px-1 text-center font-bold text-primary">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.map((team, idx) => (
              <tr
                key={team.teamId}
                className={`hover:bg-muted/20 ${idx === 3 && isGlobal ? "border-b-2 border-amber-500 bg-amber-500/5" : "border-b border-border/40"}`}
              >
                <td className="py-2.5 px-1 font-extrabold">{idx + 1}</td>
                <td className="py-2.5 px-2 flex items-center gap-2 min-w-[120px]">
                  <img src={team.teamLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
                  <span className="font-bold truncate">{team.teamName}</span>
                </td>
                <td className="py-2.5 px-1 text-center font-semibold">{team.matchWins}-{team.matchLosses}</td>
                <td className="py-2.5 px-1 text-center text-muted-foreground">{team.roundDifference}</td>
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
                              
