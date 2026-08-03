"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import Swal from "sweetalert2";

import { ConsoleHeader } from "@/components/tournament/match-console/console-header";
import { MetadataBlock } from "@/components/tournament/match-console/metadata-block";
import { SmartPasteBlock } from "@/components/tournament/match-console/smart-paste-block";
import { RosterLineupBlock } from "@/components/tournament/match-console/roster-lineup-block";
import { GameLogsBlock } from "@/components/tournament/match-console/game-logs-block";

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

  const [match, setMatch] = useState<MatchScheduleItem | null>(null);
  const [dbRosterA, setDbRosterA] = useState<any[]>([]);
  const [dbRosterB, setDbRosterB] = useState<any[]>([]);

  const [referee, setReferee] = useState("");
  const [streamer, setStreamer] = useState("");
  const [streamLink, setStreamLink] = useState("");

  const [rosterLineupA, setRosterLineupA] = useState<string[]>([]);
  const [rosterLineupB, setRosterLineupB] = useState<string[]>([]);

  const [gameLogs, setGameLogs] = useState<GameDetailLog[]>([]);
  const [rawDiscordText, setRawDiscordText] = useState("");

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

          const isValid = adminParam === "tsaqif" || !m.refereeToken || urlToken === m.refereeToken;
          if (!isValid) {
            setIsAuthorized(false);
            setIsLoading(false);
            return;
          }
          setIsAuthorized(true);

          const draftKey = `twi_draft_${matchId}`;
          const localDraft = localStorage.getItem(draftKey);

          if (localDraft) {
            try {
              const parsed = JSON.parse(localDraft);
              setReferee(parsed.referee || m.referee || "");
              setStreamer(parsed.streamer || m.streamer || "");
              setStreamLink(parsed.streamLink || m.streamLink || "");
              setRosterLineupA(parsed.rosterLineupA || []);
              setRosterLineupB(parsed.rosterLineupB || []);
              setGameLogs(parsed.gameLogs || m.gameLogs || []);
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
    if (m.rosterA?.mainPlayers) setRosterLineupA(m.rosterA.mainPlayers.map((p) => p.playerName));
    if (m.rosterB?.mainPlayers) setRosterLineupB(m.rosterB.mainPlayers.map((p) => p.playerName));
  };

  useEffect(() => {
    if (!matchId || !isAuthorized) return;
    localStorage.setItem(
      `twi_draft_${matchId}`,
      JSON.stringify({ referee, streamer, streamLink, rosterLineupA, rosterLineupB, gameLogs })
    );
  }, [referee, streamer, streamLink, rosterLineupA, rosterLineupB, gameLogs, matchId, isAuthorized]);

  const availableIgnA = dbRosterA.map((p) => p.ign || p.playerName || p.namaLengkap).filter(Boolean);
  const availableIgnB = dbRosterB.map((p) => p.ign || p.playerName || p.namaLengkap).filter(Boolean);

  const activeListA = rosterLineupA.length > 0 ? rosterLineupA : (availableIgnA.length > 0 ? availableIgnA : ["Player A1"]);
  const activeListB = rosterLineupB.length > 0 ? rosterLineupB : (availableIgnB.length > 0 ? availableIgnB : ["Player B1"]);

  const scoreA = Math.min(10, gameLogs.filter((g) => g.winnerTeamId === match?.teamAId).length);
  const scoreB = Math.min(10, gameLogs.filter((g) => g.winnerTeamId === match?.teamBId).length);
  const isReachMaxScore = scoreA >= 10 || scoreB >= 10;

  const handleParseDiscordText = () => {
    if (!rawDiscordText.trim() || !match) return;

    const lines = rawDiscordText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedA: string[] = [];
    const parsedB: string[] = [];
    const newLogs: GameDetailLog[] = [];

    let currentSec: "NONE" | "LINEUP_A" | "LINEUP_B" | "LOGS" = "NONE";

    lines.forEach((line) => {
      if (line.toLowerCase().includes("line up") || line.toLowerCase().includes("lineup")) {
        currentSec = currentSec === "NONE" ? "LINEUP_A" : "LINEUP_B";
        return;
      }
      if (line.startsWith("---") || line.startsWith("===")) {
        if (currentSec === "LINEUP_B") currentSec = "LOGS";
        return;
      }
      if (currentSec === "LINEUP_A" || currentSec === "LINEUP_B") {
        const pMatch = line.match(/^\d+\.\s*(.+)/);
        if (pMatch) {
          const rawName = pMatch[1].trim();
          const targetDb = currentSec === "LINEUP_A" ? availableIgnA : availableIgnB;
          const matched = targetDb.find(
            (ign) => ign.toLowerCase().replace(/[^a-z0-9]/g, "") === rawName.toLowerCase().replace(/[^a-z0-9]/g, "")
          ) || rawName;
          if (currentSec === "LINEUP_A") parsedA.push(matched);
          else parsedB.push(matched);
        }
      }
      if (currentSec === "LOGS" || line.includes(" - ")) {
        const sMatch = line.match(/(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)/);
        if (sMatch) {
          const [, sideA, valA, , sideB] = sMatch;
          const numA = parseInt(valA, 10);
          const partsA = sideA.split(" ");
          const playerA = partsA[0];
          const deckA = partsA.slice(1).join(" ") || "Archetype A";
          const partsB = sideB.split(" ");
          const deckB = partsB.slice(0, -1).join(" ") || "Archetype B";
          const playerB = partsB[partsB.length - 1];

          const isAWin = numA > newLogs.filter((g) => g.winnerTeamId === match.teamAId).length;

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

    if (parsedA.length > 0) setRosterLineupA(parsedA);
    if (parsedB.length > 0) setRosterLineupB(parsedB);
    if (newLogs.length > 0) setGameLogs(newLogs);

    Swal.fire({
      icon: "success",
      title: "Smart Paste Berhasil!",
      text: `Berhasil mengekstrak ${newLogs.length} Log Pertandingan.`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleSaveToKV = async (partialData?: Partial<MatchScheduleItem>) => {
    if (!match) return;
    setIsSaving(true);

    const payload: Partial<MatchScheduleItem> = {
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
          decks: [{ deckName: "-", skillName: "-" }, { deckName: "-", skillName: "-" }],
        })),
      },
      rosterB: {
        teamId: match.teamBId,
        teamName: match.teamBName,
        teamLogo: match.teamBLogo,
        mainPlayers: activeListB.map((p) => ({
          playerId: p,
          playerName: p,
          decks: [{ deckName: "-", skillName: "-" }, { deckName: "-", skillName: "-" }],
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
          matchData: payload,
        }),
      });

      if (res.ok) {
        Swal.fire({ icon: "success", title: "Tersimpan ke KV!", toast: true, position: "top-end", timer: 1500, showConfirmButton: false });
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
    return <div className="p-12 text-center text-xs font-bold text-sky-400 animate-pulse">⏳ Memuat Console...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000d21] p-4 text-white">
        <div className="max-w-md rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-center shadow-2xl">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-lg font-black text-rose-400 uppercase">AKSES DITOLAK</h2>
          <p className="my-2 text-xs text-slate-300">Kamu tidak memiliki token Wasit yang sah.</p>
          <button onClick={() => router.push("/tournament")} className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500">
            Kembali ke Jadwal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000d21] text-white p-3 sm:p-6 font-sans">
      <div className="mx-auto max-w-5xl space-y-6">
        <ConsoleHeader match={match} isSaving={isSaving} onSave={() => handleSaveToKV()} onExit={() => router.push("/tournament")} />
        <MetadataBlock referee={referee} setReferee={setReferee} streamer={streamer} setStreamer={setStreamer} streamLink={streamLink} setStreamLink={setStreamLink} onSave={() => handleSaveToKV({ referee, streamer, streamLink })} />
        <SmartPasteBlock rawText={rawDiscordText} setRawText={setRawDiscordText} onParse={handleParseDiscordText} />
        <RosterLineupBlock match={match} rosterA={rosterLineupA} setRosterA={setRosterLineupA} rosterB={rosterLineupB} setRosterB={setRosterLineupB} availableIgnA={availableIgnA} availableIgnB={availableIgnB} onSave={() => handleSaveToKV()} />
        <GameLogsBlock match={match} gameLogs={gameLogs} setGameLogs={setGameLogs} scoreA={scoreA} scoreB={scoreB} isReachMaxScore={isReachMaxScore} activeListA={activeListA} activeListB={activeListB} onSave={() => handleSaveToKV()} />
      </div>
    </div>
  );
          }
          
