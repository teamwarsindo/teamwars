"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";
import Swal from "sweetalert2";

export function TournamentView({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<"SCHEDULE" | "GROUP_STANDING" | "GLOBAL_STANDING" | "PLAYOFF">("SCHEDULE");
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [standings, setStandings] = useState<TeamStandingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter Schedule State
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

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

  // Handler Admin Edit Reschedule & Score
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
          <hr className="my-1 border-border"/>
          <div className="grid grid-cols-2 gap-2">
            <input id="swal-referee" type="text" placeholder="Judge" defaultValue="${match.referee || ''}" class="swal2-input !m-0 !w-full" />
            <input id="swal-streamer" type="text" placeholder="Streamer" defaultValue="${match.streamer || ''}" class="swal2-input !m-0 !w-full" />
          </div>
        </div>
      `,
      focusConfirm: false,
      background: "#171717",
      color: "#fff",
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      preConfirm: () => {
        return {
          matchDate: new Date((document.getElementById("swal-date") as HTMLInputElement).value).toISOString(),
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
          action: "UPDATE_MATCH",
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

  // Filter Schedule
  const filteredSchedules = schedules.filter((m) => {
    const matchGroup = selectedGroupFilter === "ALL" || m.groupName === selectedGroupFilter;
    if (!selectedDateFilter) return matchGroup;
    
    const mDate = new Date(m.matchDate).toLocaleDateString("sv-SE"); // YYYY-MM-DD
    return matchGroup && mDate === selectedDateFilter;
  });

  const groupAStandings = standings.filter((s) => s.groupName === "Group A");
  const groupBStandings = standings.filter((s) => s.groupName === "Group B");

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 flex flex-col gap-6">
      
      {/* 📌 NAVIGATION TAB ATAS (RESPONSIVE MOBILE SCROLL) */}
      <div className="flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card/80 p-1.5 backdrop-blur-md no-scrollbar">
        {[
          { key: "SCHEDULE", label: "Schedule" },
          { key: "GROUP_STANDING", label: "Group Standing" },
          { key: "GLOBAL_STANDING", label: "Global Standing" },
          { key: "PLAYOFF", label: "Playoff & Play-Ins" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 min-w-[110px] rounded-xl py-2.5 text-[11px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📅 TAB 1: GROUP SCHEDULE (MOBILE FRIENDLY WITH FILTERS) */}
      {activeTab === "SCHEDULE" && (
        <div className="flex flex-col gap-4">
          
          {/* FILTER BAR MOBILE */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <button
                onClick={() => setSelectedGroupFilter("ALL")}
                className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition ${
                  selectedGroupFilter === "ALL" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                Semua Grup
              </button>
              <button
                onClick={() => setSelectedGroupFilter("Group A")}
                className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition ${
                  selectedGroupFilter === "Group A" ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                Group A
              </button>
              <button
                onClick={() => setSelectedGroupFilter("Group B")}
                className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition ${
                  selectedGroupFilter === "Group B" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                Group B
              </button>
            </div>

            {/* DatePicker Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-[10px] font-bold text-muted-foreground">📅 Tanggal:</span>
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground cursor-pointer"
              />
              {selectedDateFilter && (
                <button
                  onClick={() => setSelectedDateFilter("")}
                  className="rounded-lg bg-rose-500/20 px-2 py-1 text-[10px] font-bold text-rose-400 hover:bg-rose-500/30"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* LIST JADWAL MATCH */}
          {filteredSchedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs font-bold text-muted-foreground">
              ⚠️ Tidak ada jadwal pertandingan pada filter ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchedules.map((match) => {
                const dateObj = new Date(match.matchDate);
                const dateFormatted = dateObj.toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Jakarta",
                });
                const timeFormatted = dateObj.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                }) + " WIB";

                return (
                  <div key={match.id} className="relative flex flex-col justify-between rounded-2xl border border-border bg-card/70 p-4 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3 text-[10px] text-muted-foreground">
                      <span className={`font-bold ${match.groupName === "Group A" ? "text-sky-400" : "text-amber-400"}`}>
                        {match.groupName}
                      </span>
                      <span className="font-semibold text-primary">{dateFormatted} - {timeFormatted}</span>
                    </div>

                    <div className="flex items-center justify-between my-2 gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <img src={match.teamALogo} alt="" className="h-8 w-8 object-contain shrink-0" />
                        <span className="text-xs font-bold line-clamp-1">{match.teamAName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-background border border-border font-black text-sm shrink-0">
                        <span className={match.scoreA >= 10 ? "text-emerald-400" : ""}>{match.scoreA}</span>
                        <span className="text-muted-foreground text-xs">-</span>
                        <span className={match.scoreB >= 10 ? "text-emerald-400" : ""}>{match.scoreB}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 flex-1">
                        <span className="text-xs font-bold text-right line-clamp-1">{match.teamBName}</span>
                        <img src={match.teamBLogo} alt="" className="h-8 w-8 object-contain shrink-0" />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                      <span>Judge: {match.referee || "TBA"}</span>
                      <span>Streamer: {match.streamer || "TBA"}</span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleEditMatch(match)}
                        className="mt-3 w-full rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/20"
                      >
                        ⚙️ Edit Schedule / Score
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 📊 TAB 2: GROUP STANDING */}
      {activeTab === "GROUP_STANDING" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StandingTable title="Group A Standing" data={groupAStandings} />
          <StandingTable title="Group B Standing" data={groupBStandings} />
        </div>
      )}

      {/* 🌍 TAB 3: GLOBAL STANDING (DENGAN PEMBATAS DIVIDER TOP 4 & 16 TIM LENGKAP) */}
      {activeTab === "GLOBAL_STANDING" && (
        <div className="w-full flex flex-col gap-4">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4 text-xs text-sky-300">
            📌 <strong>Sistem Kualifikasi:</strong> Top 2 Group A + Top 2 Group B (4 Tim) melaju langsung ke <strong>Quarterfinals Playoff</strong>. Peringkat 5–16 bertanding di babak <strong>Play-Ins</strong>.
          </div>
          <StandingTable title="Global Wildcard Standings (16 Tim)" data={standings} isGlobal />
        </div>
      )}

      {/* 🏆 TAB 4: BAGAN PLAYOFF & PLAY-INS BRACKET */}
      {activeTab === "PLAYOFF" && (
        <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card/80 p-6 backdrop-blur-md">
          
          {/* Section 1: Play-Ins Bracket */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-sky-400 border-b border-border pb-2 mb-4">
              ⚔️ Babak Play-Ins (Wildcard Seed 5–16)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { match: "Play-Ins #1", p1: "Wildcard Seed 5", p2: "Wildcard Seed 12" },
                { match: "Play-Ins #2", p1: "Wildcard Seed 6", p2: "Wildcard Seed 11" },
                { match: "Play-Ins #3", p1: "Wildcard Seed 7", p2: "Wildcard Seed 10" },
                { match: "Play-Ins #4", p1: "Wildcard Seed 8", p2: "Wildcard Seed 9" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-border bg-background p-3 flex flex-col gap-2">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase">{item.match}</span>
                  <div className="flex items-center justify-between rounded-lg bg-card p-2 text-xs font-bold border border-border">
                    <span>{item.p1}</span>
                    <span className="text-sky-400">0</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card p-2 text-xs font-bold border border-border">
                    <span>{item.p2}</span>
                    <span className="text-sky-400">0</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Quarterfinals Playoff Bracket */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 border-b border-border pb-2 mb-4">
              🏆 Babak Playoff Quarterfinals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { match: "Quarterfinal #1", p1: "Top 1 Group A", p2: "Winner Play-Ins #4" },
                { match: "Quarterfinal #2", p1: "Top 2 Group B", p2: "Winner Play-Ins #3" },
                { match: "Quarterfinal #3", p1: "Top 1 Group B", p2: "Winner Play-Ins #2" },
                { match: "Quarterfinal #4", p1: "Top 2 Group A", p2: "Winner Play-Ins #1" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-3 flex flex-col gap-2">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase">{item.match}</span>
                  <div className="flex items-center justify-between rounded-lg bg-card p-2 text-xs font-bold border border-border">
                    <span>{item.p1}</span>
                    <span className="text-amber-400">0</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card p-2 text-xs font-bold border border-border">
                    <span>{item.p2}</span>
                    <span className="text-amber-400">0</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

// Sub-Komponen Tabel Standing Mobile Friendly + Divider Emas Top 4
function StandingTable({ title, data, isGlobal }: { title: string; data: TeamStandingItem[]; isGlobal?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card/70 p-3 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden">
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
            {data.map((team, idx) => {
              const isTop4 = isGlobal && idx === 3; // Batas divider emas di rank 4
              return (
                <tr
                  key={team.teamId}
                  className={`hover:bg-muted/20 transition ${
                    isTop4 ? "border-b-2 border-amber-500/80 bg-amber-500/5" : "border-b border-border/40"
                  }`}
                >
                  <td className="py-2.5 px-1 font-extrabold">{idx + 1}</td>
                  <td className="py-2.5 px-2 flex items-center gap-2 min-w-[120px]">
                    <img src={team.teamLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
                    <span className="font-bold truncate">{team.teamName}</span>
                  </td>
                  <td className="py-2.5 px-1 text-center font-semibold">{team.matchWins}-{team.matchLosses}</td>
                  <td className="py-2.5 px-1 text-center text-muted-foreground">{team.roundDifference > 0 ? `+${team.roundDifference}` : team.roundDifference}</td>
                  <td className="py-2.5 px-1 text-center">{team.setWins}</td>
                  <td className="py-2.5 px-1 text-center font-black text-sky-400">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
    }
                    
