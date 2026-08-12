"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchScheduleItem, GameDetailLog, PlayerDeckInfo, WarningLogItem } from "@/lib/types/tournament";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import Swal from "sweetalert2";

import { ConsoleHeader } from "./components/console-header";
import { Section1Metadata } from "./components/sections/section-1-metadata";
import { Section2Lineup } from "./components/sections/section-2-lineup";
import { Section3GameInput } from "./components/sections/section-3-game-input";
import { Section4GameTable } from "./components/sections/section-4-game-table";
import { ReviewSubmitModal } from "./components/review-submit-modal";

interface PlayerItem {
  id: string;
  name: string;
  ign?: string;
  duellinksId?: string;
}

export default function MatchInputConsolePage({ params }: { params: Promise<{ matchId: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const [match, setMatch] = useState<MatchScheduleItem | null>(null);
  const [dbRosterA, setDbRosterA] = useState<PlayerItem[]>([]);
  const [dbRosterB, setDbRosterB] = useState<PlayerItem[]>([]);

  const [referee, setReferee] = useState("");
  const [streamer, setStreamer] = useState("");
  const [streamLink, setStreamLink] = useState("");

  const [lateDecksA, setLateDecksA] = useState(0);
  const [lateDecksB, setLateDecksB] = useState(0);

  const [lineupA, setLineupA] = useState<PlayerDeckInfo[]>([]);
  const [lineupB, setLineupB] = useState<PlayerDeckInfo[]>([]);
  const [isLineupLocked, setIsLineupLocked] = useState(false);

  const [gameLogs, setGameLogs] = useState<GameDetailLog[]>([]);
  const [warningLogs, setWarningLogs] = useState<WarningLogItem[]>([]);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const [masterDecks, setMasterDecks] = useState<string[]>([]);
  const [masterSkills, setMasterSkills] = useState<string[]>([]);

  const LOCAL_STORAGE_KEY = `match_draft_logs_${matchId}`;

  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`/api/tournament?matchId=${matchId}&token=${token}`);
      const data = await res.json();

      if (res.ok && data.success) {
        const m = data.match;
        setMatch(m);
        setDbRosterA(data.dbRosterA || []);
        setDbRosterB(data.dbRosterB || []);
        setIsAuthorized(true);

        setReferee(m.refereeName || m.referee || "");
        setStreamer(m.streamerName || m.streamer || "");
        setStreamLink(m.streamLink || "");

        if (m.lateDecksA) setLateDecksA(m.lateDecksA);
        if (m.lateDecksB) setLateDecksB(m.lateDecksB);

        if (m.lineupA?.length > 0) setLineupA(m.lineupA);
        if (m.lineupB?.length > 0) setLineupB(m.lineupB);

        // Persistent Lock Lineup
        const savedLockState = localStorage.getItem(`lineup_locked_${matchId}`);
        if (savedLockState === "true" || m.isLineupLocked) {
          setIsLineupLocked(true);
        }

        const savedLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedLocal) {
          try {
            const parsed = JSON.parse(savedLocal);
            setGameLogs(Array.isArray(parsed) && parsed.length > 0 ? parsed : m.gameLogs || []);
          } catch {
            setGameLogs(m.gameLogs || []);
          }
        } else {
          setGameLogs(m.gameLogs || []);
        }

        setIsInitialLoaded(true);
      } else {
        setIsAuthorized(false);
        if (data.accessReason === "TOKEN_EXPIRED") setIsExpired(true);
      }
    } catch (err) {
      console.error("Error fetching match details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const res = await fetch("/api/tournament/master-data");
      const data = await res.json();
      if (res.ok && data.success) {
        setMasterDecks(data.decks || []);
        setMasterSkills(data.skills || []);
      }
    } catch (err) {
      console.error("Error fetching master data:", err);
    }
  };

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
      fetchMasterData();
    }
  }, [matchId, token]);

  useEffect(() => {
    if (isInitialLoaded && matchId) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameLogs));
    }
  }, [gameLogs, isInitialLoaded, matchId]);

  const handleAddMasterItem = async (type: "DECK" | "SKILL", newItem: string) => {
    try {
      const res = await fetch("/api/tournament/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, newItem }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (type === "DECK") setMasterDecks(data.decks);
        if (type === "SKILL") setMasterSkills(data.skills);
        Swal.fire({
          icon: "success",
          title: `${type === "DECK" ? "Deck" : "Skill"} Ditambahkan!`,
          toast: true,
          position: "top-end",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch {
      Swal.fire("Error", "Gagal menambahkan master data", "error");
    }
  };

  const handleSaveLineupToKV = async () => {
    if (!match) return;
    const payload = {
      lineupA,
      lineupB,
      isLineupLocked: true,
      rosterA: {
        teamId: match.teamAId,
        teamName: match.teamAName,
        teamLogo: match.teamALogo,
        mainPlayers: lineupA.map((p) => ({ playerId: p.playerName, playerName: p.playerName })),
      },
      rosterB: {
        teamId: match.teamBId,
        teamName: match.teamBName,
        teamLogo: match.teamBLogo,
        mainPlayers: lineupB.map((p) => ({ playerId: p.playerName, playerName: p.playerName })),
      },
    };

    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_MATCH_CONSOLE",
        matchId,
        token,
        matchData: payload,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setMatch(data.updatedMatch);
    } else {
      throw new Error(data.error || "Gagal update lineup");
    }
  };

  const handleSaveToKV = async () => {
    if (!match) return;
    setIsSaving(true);

    const payload = {
      referee,
      streamer,
      streamLink,
      lateDecksA,
      lateDecksB,
      lineupA,
      lineupB,
      gameLogs,
      warningLogs,
      isLineupLocked,
      rosterA: {
        teamId: match.teamAId,
        teamName: match.teamAName,
        teamLogo: match.teamALogo,
        mainPlayers: lineupA.map((p) => ({ playerId: p.playerName, playerName: p.playerName })),
      },
      rosterB: {
        teamId: match.teamBId,
        teamName: match.teamBName,
        teamLogo: match.teamBLogo,
        mainPlayers: lineupB.map((p) => ({ playerId: p.playerName, playerName: p.playerName })),
      },
    };

    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MATCH_CONSOLE",
          matchId,
          token,
          matchData: payload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMatch(data.updatedMatch);
        setIsReviewOpen(false);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        Swal.fire({
          icon: "success",
          title: "Match Report Tersimpan!",
          text: "Laporan pertandingan Conquest berhasil dikunci ke KV.",
        });
      } else {
        Swal.fire("Gagal", data.error || "Gagal menyimpan laporan", "error");
      }
    } catch {
      Swal.fire("Error", "Gagal menghubungi server", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <TopBar title="Match Console" />
        <div className="flex flex-1 items-center justify-center p-8 text-xs font-bold text-primary animate-pulse">
          ⏳ Memuat Match Console &amp; Master Data KV...
        </div>
        <Footer />
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <TopBar title="Match Console" />
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="glass glow-border max-w-md rounded-2xl border bg-popover/90 p-6 text-center shadow-2xl">
            <div className="text-4xl mb-2">🔒</div>
            <h2 className="text-lg font-bold text-destructive uppercase">Akses Ditolak</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {isExpired
                ? "Token Wasit untuk pertandingan ini sudah kedaluwarsa (lebih dari 7 hari)."
                : "Kamu tidak memiliki Token Wasit yang sah untuk mengakses halaman ini."}
            </p>
            <button
              onClick={() => router.push("/tournament")}
              className="mt-6 w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 cursor-pointer"
            >
              Kembali ke Jadwal
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Official Referee Console" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-8 sm:px-6">
        <div className="w-full max-w-4xl space-y-6">
          <HeroHeader showDetails={false} />

          {match && (
            <ConsoleHeader
              match={match}
              gameLogs={gameLogs}
              onExit={() => router.push("/tournament")}
            />
          )}

          <Section1Metadata
            referee={referee}
            streamer={streamer}
            streamLink={streamLink}
            teamAName={match?.teamAName}
            teamBName={match?.teamBName}
            lateDecksA={lateDecksA}
            setLateDecksA={setLateDecksA}
            lateDecksB={lateDecksB}
            setLateDecksB={setLateDecksB}
          />

          {match && (
            <Section2Lineup
              match={match}
              lineupA={lineupA}
              setLineupA={setLineupA}
              lineupB={lineupB}
              setLineupB={setLineupB}
              dbRosterA={dbRosterA}
              dbRosterB={dbRosterB}
              masterDecks={masterDecks}
              masterSkills={masterSkills}
              lateDecksA={lateDecksA}
              lateDecksB={lateDecksB}
              onAddMasterItem={handleAddMasterItem}
              onSaveLineupToKV={handleSaveLineupToKV}
              isLineupLocked={isLineupLocked}
              setIsLineupLocked={setIsLineupLocked}
              gameLogs={gameLogs}
              setGameLogs={setGameLogs}
            />
          )}

          {match && (
            <Section3GameInput
              match={match}
              gameLogs={gameLogs}
              setGameLogs={setGameLogs}
              lineupA={lineupA}
              lineupB={lineupB}
              isLineupLocked={isLineupLocked}
              lateDecksA={lateDecksA}
              lateDecksB={lateDecksB}
              warningLogs={warningLogs}
              setWarningLogs={setWarningLogs}
            />
          )}

          {match && (
            <Section4GameTable
              match={match}
              gameLogs={gameLogs}
              setGameLogs={setGameLogs}
              warningLogs={warningLogs}
              setWarningLogs={setWarningLogs}
            />
          )}

          <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
            <button
              onClick={() => setIsReviewOpen(true)}
              disabled={gameLogs.length === 0}
              className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              📋 Review &amp; Submit Match Report ({gameLogs.length} Game)
            </button>
          </section>
        </div>
      </div>

      {match && (
        <ReviewSubmitModal
          open={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          match={match}
          referee={referee}
          streamer={streamer}
          gameLogs={gameLogs}
          isSaving={isSaving}
          onConfirm={handleSaveToKV}
        />
      )}

      <Footer />
    </main>
  );
}