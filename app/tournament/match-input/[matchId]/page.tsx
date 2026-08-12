"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import { MetadataBlock } from "./components/metadata-block";
import { RosterLineupBlock, PlayerDeckInfo } from "./components/roster-lineup-block";
import { GameLogsBlock } from "./components/game-logs-block";
import { ArrowLeft, Send, Trophy, CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";

export default function MatchInputPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.matchId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [match, setMatch] = useState<MatchScheduleItem | null>(null);

  // METADATA
  const [referee, setReferee] = useState("");
  const [streamer, setStreamer] = useState("");
  const [streamLink, setStreamLink] = useState("");
  const [lateDecksA, setLateDecksA] = useState(0);
  const [lateDecksB, setLateDecksB] = useState(0);

  // ROSTER DB & MASTER DATA
  const [dbRosterA, setDbRosterA] = useState<Array<{ id: string; name: string; ign?: string; duellinksId?: string }>>([]);
  const [dbRosterB, setDbRosterB] = useState<Array<{ id: string; name: string; ign?: string; duellinksId?: string }>>([]);
  const [masterDecks, setMasterDecks] = useState<string[]>([]);
  const [masterSkills, setMasterSkills] = useState<string[]>([]);

  // LINEUP
  const [lineupA, setLineupA] = useState<PlayerDeckInfo[]>([]);
  const [lineupB, setLineupB] = useState<PlayerDeckInfo[]>([]);
  const [isLineupLocked, setIsLineupLocked] = useState(false);

  // GAME LOGS
  const [gameLogs, setGameLogs] = useState<GameDetailLog[]>([]);

  // AUTO-DETECT AKHIR MATCH (SKOR 10)
  const scoreA = gameLogs.filter((g) => g.winnerTeamId === match?.teamAId).length;
  const scoreB = gameLogs.filter((g) => g.winnerTeamId === match?.teamBId).length;
  const isMatchEnded = scoreA >= 10 || scoreB >= 10;

  useEffect(() => {
    async function fetchMatchData() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/match-input/${matchId}`);
        if (!res.ok) throw new Error("Gagal mengambil data match");

        const data = await res.json();
        setMatch(data.match);
        setReferee(data.match.referee || "");
        setStreamer(data.match.streamer || "");
        setStreamLink(data.match.streamLink || "");

        setDbRosterA(data.dbRosterA || []);
        setDbRosterB(data.dbRosterB || []);
        setMasterDecks(data.masterDecks || []);
        setMasterSkills(data.masterSkills || []);

        if (data.existingLineup) {
          setLineupA(data.existingLineup.lineupA || []);
          setLineupB(data.existingLineup.lineupB || []);
          setIsLineupLocked(data.existingLineup.isLocked || false);
        }

        if (data.existingLogs) {
          setGameLogs(data.existingLogs);
        }
      } catch {
        Swal.fire("Error", "Gagal memuat data pertandingan", "error");
      } finally {
        setIsLoading(false);
      }
    }

    if (matchId) fetchMatchData();
  }, [matchId]);

  // TAMBAH MASTER DECK / SKILL BARU
  const handleAddMasterItem = async (type: "DECK" | "SKILL", newItem: string) => {
    try {
      const res = await fetch(`/api/tournament/master-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: newItem }),
      });

      if (!res.ok) throw new Error("Gagal menambah master item");

      if (type === "DECK") {
        setMasterDecks((prev) => [...prev, newItem].sort());
      } else {
        setMasterSkills((prev) => [...prev, newItem].sort());
      }

      Swal.fire("Berhasil", `Master ${type === "DECK" ? "Deck" : "Skill"} ditambahkan!`, "success");
    } catch {
      Swal.fire("Gagal", "Gagal menyimpan ke Master Database", "error");
    }
  };

  // SIMPAN LINEUP KE KV
  const handleSaveLineupToKV = async () => {
    try {
      const res = await fetch(`/api/match-input/${matchId}/save-lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineupA, lineupB }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan lineup");
      Swal.fire("Tersimpan", "Lineup berhasil dikunci & disimpan!", "success");
    } catch {
      Swal.fire("Gagal", "Terjadi kesalahan saat menyimpan lineup", "error");
    }
  };

  // SUBMIT LAPORAN AKHIR MATCH
  const handleSubmitFinalReport = async () => {
    if (!isMatchEnded) {
      const confirm = await Swal.fire({
        title: "Konfirmasi Submit Early",
        text: "Skor belum menyentuh 10. Apakah pertandingan ini memang sudah selesai secara sah?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Submit Sekarang",
        cancelButtonText: "Batal",
        confirmButtonColor: "#10b981",
      });
      if (!confirm.isConfirmed) return;
    }

    try {
      const winnerId = scoreA > scoreB ? match?.teamAId : match?.teamBId;
      const res = await fetch(`/api/match-input/${matchId}/submit-final`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineupA,
          lineupB,
          gameLogs,
          scoreA,
          scoreB,
          winnerId,
        }),
      });

      if (!res.ok) throw new Error("Gagal mengirim laporan akhir");

      await Swal.fire("Sukses!", "Laporan Pertandingan Berhasil Dikirim!", "success");
      router.push("/tournament/matches");
    } catch {
      Swal.fire("Gagal", "Terjadi kesalahan saat mengirim laporan", "error");
    }
  };

  if (isLoading || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Memuat Data Match Console...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* HEADER NAVIGASI */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
            Match Console (Conquest Mode)
          </h1>
          <p className="text-[10px] text-muted-foreground font-semibold">
            Match #{match.id || matchId}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-extrabold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
            {scoreA} - {scoreB}
          </span>
        </div>
      </div>

      {/* BANNER JIKA MATCH SELESAI (SKOR 10) */}
      {isMatchEnded && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-emerald-500 font-black text-sm uppercase">
            <Trophy className="h-5 w-5" />
            <span>MATCH ENDED - TIM {scoreA >= 10 ? match.teamAName : match.teamBName} MENANG!</span>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            Skor Akhir: {scoreA} - {scoreB}. Silakan periksa kembali data sebelum menekan tombol Submit Laporan.
          </p>
        </div>
      )}

      {/* SECTION 1: METADATA & PENALTI */}
      <MetadataBlock
        referee={referee}
        streamer={streamer}
        streamLink={streamLink}
        teamAName={match.teamAName}
        teamBName={match.teamBName}
        lateDecksA={lateDecksA}
        setLateDecksA={setLateDecksA}
        lateDecksB={lateDecksB}
        setLateDecksB={setLateDecksB}
      />

      {/* SECTION 2: LINEUP & ROSTER REGISTER */}
      <RosterLineupBlock
        match={match}
        lineupA={lineupA}
        setLineupA={setLineupA}
        lineupB={lineupB}
        setLineupB={setLineupB}
        dbRosterA={dbRosterA}
        dbRosterB={dbRosterB}
        masterDecks={masterDecks}
        masterSkills={masterSkills}
        onAddMasterItem={handleAddMasterItem}
        onSaveLineupToKV={handleSaveLineupToKV}
        isLineupLocked={isLineupLocked}
        setIsLineupLocked={setIsLineupLocked}
      />

      {/* SECTION 3: FORM GAME LOGS & TIMER CONTROL */}
      <GameLogsBlock
        match={match}
        gameLogs={gameLogs}
        setGameLogs={setGameLogs}
        lineupA={lineupA}
        lineupB={lineupB}
        isLineupLocked={isLineupLocked}
        lateDecksA={lateDecksA}
        lateDecksB={lateDecksB}
      />

      {/* FOOTER ACTION: SUBMIT REPORT */}
      <div className="pt-4 border-t border-border/40">
        <button
          type="button"
          onClick={handleSubmitFinalReport}
          className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            isMatchEnded
              ? "bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isMatchEnded ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          <span>📋 REVIEW &amp; SUBMIT MATCH REPORT</span>
        </button>
      </div>
    </div>
  );
}