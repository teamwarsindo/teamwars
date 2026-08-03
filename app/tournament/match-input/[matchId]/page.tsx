"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import Swal from "sweetalert2";

export default function MatchInputConsolePage({ params }: { params: Promise<{ matchId: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") || "";
  const adminParam = searchParams.get("admin") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Data Match & DB Roster dari Server
  const [match, setMatch] = useState<MatchScheduleItem | null>(null);
  const [dbRosterA, setDbRosterA] = useState<any[]>([]);
  const [dbRosterB, setDbRosterB] = useState<any[]>([]);

  // State Form
  const [referee, setReferee] = useState("");
  const [streamer, setStreamer] = useState("");
  const [streamLink, setStreamLink] = useState("");

  const [rosterLineupA, setRosterLineupA] = useState<string[]>([]);
  const [rosterLineupB, setRosterLineupB] = useState<string[]>([]);

  const [gameLogs, setGameLogs] = useState<GameDetailLog[]>([]);
  const [rawDiscordText, setRawDiscordText] = useState("");

  // 1. FETCH DATA MATCH & SYNC LOCAL DRAFT
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await fetch(`/api/tournament?matchId=${matchId}`);
        const data = await res.json();

        if (res.ok && data.match) {
          const m: MatchScheduleItem = data.match;
          setMatch(m);
          setDbRosterA(data.dbRosterA || []);
          setDbRosterB(data.dbRosterB || []);

          // Validasi Token / Admin Override
          const isValid =
            adminParam === "tsaqif" ||
            !m.refereeToken ||
            urlToken === m.refereeToken;

          if (!isValid) {
            setIsAuthorized(false);
            setIsLoading(false);
            return;
          }
          setIsAuthorized(true);

          // Cek apakah ada Local Draft
          const draftKey = `twi_draft_${matchId}`;
          const localDraft = localStorage.getItem(draftKey);

          if (localDraft) {
            try {
              const parsedDraft = JSON.parse(localDraft);
              setReferee(parsedDraft.referee || m.referee || "");
              setStreamer(parsedDraft.streamer || m.streamer || "");
              setStreamLink(parsedDraft.streamLink || m.streamLink || "");
              setRosterLineupA(parsedDraft.rosterLineupA || []);
              setRosterLineupB(parsedDraft.rosterLineupB || []);
              setGameLogs(parsedDraft.gameLogs || m.gameLogs || []);
            } catch {
              loadFromMatchData(m);
            }
          } else {
            loadFromMatchData(m);
          }
        }
      } catch (err) {
        console.error("Error loading match:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, [matchId, urlToken, adminParam]);

  const loadFromMatchData = (m: MatchScheduleItem) => {
    setReferee(m.referee || "");
    setStreamer(m.streamer || "");
    setStreamLink(m.streamLink || "");
    setGameLogs(m.gameLogs || []);

    if (m.rosterA?.mainPlayers) {
      setRosterLineupA(m.rosterA.mainPlayers.map((p) => p.playerName));
    }
    if (m.rosterB?.mainPlayers) {
      setRosterLineupB(m.rosterB.mainPlayers.map((p) => p.playerName));
    }
  };

  // 2. AUTO-SAVE DRAFT TO LOCALSTORAGE
  useEffect(() => {
    if (!matchId || !isAuthorized) return;
    const draftKey = `twi_draft_${matchId}`;
    const draftPayload = {
      referee,
      streamer,
      streamLink,
      rosterLineupA,
      rosterLineupB,
      gameLogs,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draftPayload));
  }, [referee, streamer, streamLink, rosterLineupA, rosterLineupB, gameLogs, matchId, isAuthorized]);

  // List IGN Resmi dari DB KV
  const availableIgnA = dbRosterA.map((p) => p.ign || p.playerName || p.namaLengkap).filter(Boolean);
  const availableIgnB = dbRosterB.map((p) => p.ign || p.playerName || p.namaLengkap).filter(Boolean);

  const activeListA = rosterLineupA.length > 0 ? rosterLineupA : (availableIgnA.length > 0 ? availableIgnA : ["Player A1", "Player A2", "Player A3", "Player A4", "Player A5"]);
  const activeListB = rosterLineupB.length > 0 ? rosterLineupB : (availableIgnB.length > 0 ? availableIgnB : ["Player B1", "Player B2", "Player B3", "Player B4", "Player B5"]);

  // Kalkulasi Skor
  const scoreA = Math.min(10, gameLogs.filter((g) => g.winnerTeamId === match?.teamAId).length);
  const scoreB = Math.min(10, gameLogs.filter((g) => g.winnerTeamId === match?.teamBId).length);
  const isReachMaxScore = scoreA >= 10 || scoreB >= 10;

  // 3. PARSER SMART PASTE DISCORD LOG
  const handleParseDiscordText = () => {
    if (!rawDiscordText.trim() || !match) return;

    const lines = rawDiscordText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedLineupA: string[] = [];
    const parsedLineupB: string[] = [];
    const newLogs: GameDetailLog[] = [];

    let currentSection: "NONE" | "LINEUP_A" | "LINEUP_B" | "LOGS" = "NONE";

    lines.forEach((line) => {
      if (line.toLowerCase().includes("line up") || line.toLowerCase().includes("lineup")) {
        if (currentSection === "NONE") {
          currentSection = "LINEUP_A";
        } else if (currentSection === "LINEUP_A") {
          currentSection = "LINEUP_B";
        }
        return;
      }

      if (line.startsWith("---") || line.startsWith("===")) {
        if (currentSection === "LINEUP_B") currentSection = "LOGS";
        return;
      }

      if (currentSection === "LINEUP_A" || currentSection === "LINEUP_B") {
        const playerMatch = line.match(/^\d+\.\s*(.+)/);
        if (playerMatch) {
          const rawName = playerMatch[1].trim();
          const targetDb = currentSection === "LINEUP_A" ? availableIgnA : availableIgnB;
          const matchedName = targetDb.find(
            (ign) => ign.toLowerCase().replace(/[^a-z0-9]/g, "") === rawName.toLowerCase().replace(/[^a-z0-9]/g, "")
          ) || rawName;

          if (currentSection === "LINEUP_A") parsedLineupA.push(matchedName);
          else parsedLineupB.push(matchedName);
        }
      }

      if (currentSection === "LOGS" || line.includes(" - ")) {
        const scoreMatch = line.match(/(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)/);
        if (scoreMatch) {
          const [, sideA, valA, valB, sideB] = scoreMatch;
          const numA = parseInt(valA, 10);

          const partsA = sideA.split(" ");
          const playerA = partsA[0];
          const deckA = partsA.slice(1).join(" ") || "Archetype A";

          const partsB = sideB.split(" ");
          const deckB = partsB.slice(0, -1).join(" ") || "Archetype B";
          const playerB = partsB[partsB.length - 1];

          const prevScoreA = newLogs.filter((g) => g.winnerTeamId === match.teamAId).length;
          const isAWin = numA > prevScoreA;

          newLogs.push({
            gameNumber: newLogs.length + 1,
            teamAPlayerId: playerA,
            teamAPlayerName: playerA,
            teamADeck: deckA,
            teamASkill: "Skill A",
            teamBPlayerId: playerB,
            teamBPlayerName: playerB,
            teamBDeck: deckB,
            teamBSkill: "Skill B",
            winnerTeamId: isAWin ? match.teamAId : match.teamBId,
          });
        }
      }
    });

    if (parsedLineupA.length > 0) setRosterLineupA(parsedLineupA);
    if (parsedLineupB.length > 0) setRosterLineupB(parsedLineupB);
    if (newLogs.length > 0) setGameLogs(newLogs);

    Swal.fire({
      icon: "success",
      title: "Smart Paste Berhasil!",
      text: `Berhasil mengekstrak Roster & ${newLogs.length} Log Pertandingan dari Discord.`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // 4. API SAVE HANDLER
  const handleSaveToKV = async (partialData?: Partial<MatchScheduleItem>) => {
    if (!match) return;
    setIsSaving(true);

    const payloadMatchData: Partial<MatchScheduleItem> = {
      referee,
      streamer,
      streamLink,
      scoreA,
      scoreB,
      gameLogs,
      rosterA: {
        teamId: match.teamAId,
        teamName: match.teamAName,
        teamLogo: match.teamALogo,
        mainPlayers: activeListA.map((p) => ({
          playerId: p,
          playerName: p,
          decks: [
            { deckName: "-", skillName: "-" },
            { deckName: "-", skillName: "-" },
          ],
        })),
      },
      rosterB: {
        teamId: match.teamBId,
        teamName: match.teamBName,
        teamLogo: match.teamBLogo,
        mainPlayers: activeListB.map((p) => ({
          playerId: p,
          playerName: p,
          decks: [
            { deckName: "-", skillName: "-" },
            { deckName: "-", skillName: "-" },
          ],
        })),
      },
      ...partialData,
    };

    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MATCH_CONSOLE",
          matchId,
          token: urlToken || adminParam,
          matchData: payloadMatchData,
        }),
      });

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Tersimpan ke KV!",
          toast: true,
          position: "top-end",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const err = await res.json();
        Swal.fire("Gagal Simpan", err.error || "Gagal menyimpan data", "error");
      }
    } catch {
      Swal.fire("Error", "Gagal menghubungi server", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs font-bold text-sky-400 animate-pulse">⏳ Memuat Console Match Input...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000d21] p-4 text-white">
        <div className="max-w-md rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-center shadow-2xl">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-lg font-black text-rose-400 uppercase">AKSES DITOLAK</h2>
          <p className="my-2 text-xs text-slate-300">
            Kamu tidak memiliki izin/token yang sah untuk menginput pertandingan ini.
          </p>
          <button
            onClick={() => router.push("/tournament")}
            className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 transition cursor-pointer"
          >
            Kembali ke Jadwal
          </button>
        </div>
      </div>
    );
                                }
  
