'use client';

import { useState, useEffect } from 'react';
import { MatchScheduleItem, MatchReportData, MatchReportRow, MasterData } from '@/lib/types/tournament';
import { X, Trophy, Save } from 'lucide-react';
import Swal from 'sweetalert2';

interface MatchReportModalProps {
  match: MatchScheduleItem | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (updatedMatch: MatchScheduleItem) => void;
}

const DEFAULT_MASTER_FALLBACK: MasterData = {
  referees: ['vG®D WHY', 'Levi Ghost', 'Xenon', 'Rexia'],
  streamers: ['Alroy_Yuan', 'TWI Official Stream'],
  decks: ['Blue-Eyes', 'Mayakashi', 'Tenyi', 'Shaddoll', 'Yubel', 'Constellar', 'Shiranui', 'Rokket', 'S-force', 'Photon', 'LiveTwin', 'Altergeist'],
  skills: ['TSM', 'BC', 'TLOTH', 'L5R', 'EB', 'PDA', 'SWP', 'CU', 'SSS', 'MOP', 'MS', 'BL'],
  streamPlatforms: ['Youtube', 'Twitch', 'TikTok'],
};

export function MatchReportModal({ match, isAdmin, onClose, onSaved }: MatchReportModalProps) {
  const [master, setMaster] = useState<MasterData>(DEFAULT_MASTER_FALLBACK);
  const [rosterListA, setRosterListA] = useState<string[]>([]);
  const [rosterListB, setRosterListB] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [streamPlatform, setStreamPlatform] = useState('Youtube');
  const [streamer, setStreamer] = useState('Alroy_Yuan');
  const [referee, setReferee] = useState('vG®D WHY');
  const [dateStr, setDateStr] = useState('Sabtu, 09 Maret 2024');
  const [rosterA, setRosterA] = useState<string[]>(['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']);
  const [rosterB, setRosterB] = useState<string[]>(['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']);
  const [games, setGames] = useState<MatchReportRow[]>([]);

  useEffect(() => {
    if (!match) return;

    fetch('/api/admin/master-data')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.masterData) setMaster(d.masterData);
      })
      .catch(() => {});

    const fetchTeamRoster = async (teamName: string, setRosterList: (names: string[]) => void) => {
      try {
        const slug = teamName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const res = await fetch(`/api/check-team?name=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data && Array.isArray(data.players)) {
          const names = data.players.map((p: any) => p.ign || p.namaLengkap).filter(Boolean);
          if (names.length > 0) setRosterList(names);
          else setRosterList([`Player 1`, `Player 2`, `Player 3`, `Player 4`, `Player 5`]);
        } else {
          setRosterList([`Player 1`, `Player 2`, `Player 3`, `Player 4`, `Player 5`]);
        }
      } catch {
        setRosterList([`Player 1`, `Player 2`, `Player 3`, `Player 4`, `Player 5`]);
      }
    };

    fetchTeamRoster(match.teamAName, setRosterListA);
    fetchTeamRoster(match.teamBName, setRosterListB);

    if (match.report) {
      setStreamPlatform(match.report.streamPlatform || 'Youtube');
      setStreamer(match.report.streamer || 'Alroy_Yuan');
      setReferee(match.report.referee || match.referee || 'vG®D WHY');
      setDateStr(match.report.matchDateFormatted || formatIndoDate(match.matchDate));
      setRosterA(match.report.rosterA || ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']);
      setRosterB(match.report.rosterB || ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']);
      setGames(match.report.games || []);
    } else {
      setDateStr(formatIndoDate(match.matchDate));
      setReferee(match.referee || 'vG®D WHY');
      const initialGames: MatchReportRow[] = Array.from({ length: 19 }, (_, idx) => ({
        id: `g-${idx + 1}`,
        playerA: rosterListA[0] || 'Player A1',
        deckA: 'Mayakashi',
        skillA: 'TSM',
        resultA: '-',
        resultB: '-',
        skillB: 'BL',
        deckB: 'Rokket',
        playerB: rosterListB[0] || 'Player B1',
      }));
      setGames(initialGames);
    }
  }, [match]);

  if (!match) return null;

  // ATURAN: Maksimal W adalah 10 untuk menentukan tim pemenang
  const rawScoreA = games.filter((g) => g.resultA === 'W').length;
  const rawScoreB = games.filter((g) => g.resultB === 'W').length;
  const calcScoreA = Math.min(10, rawScoreA);
  const calcScoreB = Math.min(10, rawScoreB);
  const isAWin = calcScoreA === 10 || (calcScoreA > calcScoreB && calcScoreA >= 10);
  const isFinished = calcScoreA === 10 || calcScoreB === 10;

  const handleSaveReport = async () => {
    setIsSaving(true);
    const reportData: MatchReportData = {
      streamPlatform,
      streamer,
      referee,
      matchDateFormatted: dateStr,
      rosterA,
      rosterB,
      games,
    };

    try {
      const res = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MATCH',
          matchId: match.id,
          scoreA: calcScoreA,
          scoreB: calcScoreB,
          report: reportData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Match Report & Skor Berhasil Disimpan!',
          showConfirmButton: false,
          timer: 2000,
          background: '#171717',
          color: '#fff',
        });
        const updatedMatch: MatchScheduleItem = {
          ...match,
          scoreA: calcScoreA,
          scoreB: calcScoreB,
          referee: referee,
          isFinished: isFinished,
          report: reportData,
        };
        onSaved(updatedMatch);
        onClose();
      } else {
        throw new Error(data.error || 'Gagal menyimpan report.');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Simpan',
        text: err.message || 'Terjadi kesalahan sistem.',
        background: '#171717',
        color: '#fff',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateGameRow = (idx: number, patch: Partial<MatchReportRow>) => {
    setGames((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md animate-in fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-sky-800 bg-[#0A192F] shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-sky-800/80 bg-[#0F2D54] px-6 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <h2 className="text-xl font-black uppercase tracking-wider text-sky-300">Match Report — TWI Season 7</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-sky-400 hover:bg-sky-900/50 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* INFO BROADCAST & REFEREE HEADER */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-sky-800 bg-[#0D2444] p-4 text-xs sm:grid-cols-4">
            <div>
              <span className="block font-semibold text-sky-400">Stream Platform</span>
              {isAdmin ? (
                <select
                  value={streamPlatform}
                  onChange={(e) => setStreamPlatform(e.target.value)}
                  className="mt-1 w-full rounded bg-[#0A192F] border border-sky-700 px-2 py-1 font-bold text-white outline-none"
                >
                  {master.streamPlatforms.map((p) => <option key={p}>{p}</option>)}
                </select>
              ) : <span className="font-bold text-white">{streamPlatform}</span>}
            </div>
            <div>
              <span className="block font-semibold text-sky-400">Streamer</span>
              {isAdmin ? (
                <select
                  value={streamer}
                  onChange={(e) => setStreamer(e.target.value)}
                  className="mt-1 w-full rounded bg-[#0A192F] border border-sky-700 px-2 py-1 font-bold text-white outline-none"
                >
                  {master.streamers.map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : <span className="font-bold text-white">{streamer}</span>}
            </div>
            <div>
              <span className="block font-semibold text-sky-400">Referee</span>
              {isAdmin ? (
                <select
                  value={referee}
                  onChange={(e) => setReferee(e.target.value)}
                  className="mt-1 w-full rounded bg-[#0A192F] border border-sky-700 px-2 py-1 font-bold text-white outline-none"
                >
                  {master.referees.map((r) => <option key={r}>{r}</option>)}
                </select>
              ) : <span className="font-bold text-white">{referee}</span>}
            </div>
            <div>
              <span className="block font-semibold text-sky-400">Date</span>
              <span className="mt-1 block font-bold text-white">{dateStr}</span>
            </div>
          </div>

          {/* VS ROSTER BANNER */}
          <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-sky-800 bg-[#0E284A] p-6 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-neutral-900 border border-sky-600 mb-2">
                <img src={match.teamALogo} alt={match.teamAName} className="h-full w-full object-cover" />
              </div>
              <h3 className="text-lg font-black text-sky-300">{match.teamAName}</h3>
              <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-sky-400">5 Selected Roster</span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {rosterA.map((p, idx) => (
                  <span key={idx} className="rounded bg-sky-950/80 border border-sky-700 px-2 py-0.5 text-xs font-semibold text-white">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl font-black italic text-white/40">VS</span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-neutral-900 border border-sky-600 mb-2">
                <img src={match.teamBLogo} alt={match.teamBName} className="h-full w-full object-cover" />
              </div>
              <h3 className="text-lg font-black text-sky-300">{match.teamBName}</h3>
              <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-sky-400">5 Selected Roster</span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {rosterB.map((p, idx) => (
                  <span key={idx} className="rounded bg-sky-950/80 border border-sky-700 px-2 py-0.5 text-xs font-semibold text-white">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* TABEL DUEL ROW */}
          <div className="overflow-x-auto rounded-xl border border-sky-800 bg-[#081528]">
            <table className="w-full min-w-[850px] text-center text-xs">
              <thead className="bg-[#0C2240] text-sky-300 uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="py-2.5 px-2">Player</th>
                  <th className="py-2.5 px-2">Deck</th>
                  <th className="py-2.5 px-2">Skill</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-2">Skill</th>
                  <th className="py-2.5 px-2">Deck</th>
                  <th className="py-2.5 px-2">Player</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-900/40">
                {games.map((g, i) => (
                  <tr key={i} className="hover:bg-sky-900/20">
                    <td className="py-2 px-2 font-bold text-sky-100">{g.playerA}</td>
                    <td className="py-2 px-2 text-sky-200">{g.deckA}</td>
                    <td className="py-2 px-2 font-mono text-sky-400">{g.skillA}</td>
                    
                    <td className="py-2 px-3">
                      {isAdmin ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateGameRow(i, { resultA: 'W', resultB: 'L' })}
                            className={`rounded px-2 py-0.5 font-black ${g.resultA === 'W' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                          >
                            W
                          </button>
                          <button
                            type="button"
                            onClick={() => updateGameRow(i, { resultA: 'L', resultB: 'W' })}
                            className={`rounded px-2 py-0.5 font-black ${g.resultA === 'L' ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                          >
                            L
                          </button>
                        </div>
                      ) : (
                        <span className="font-extrabold text-sm">
                          <span className={g.resultA === 'W' ? 'text-emerald-400' : 'text-rose-500'}>{g.resultA}</span>
                          <span className="mx-1 text-white/40">:</span>
                          <span className={g.resultB === 'W' ? 'text-emerald-400' : 'text-rose-500'}>{g.resultB}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-2 font-mono text-sky-400">{g.skillB}</td>
                    <td className="py-2 px-2 text-sky-200">{g.deckB}</td>
                    <td className="py-2 px-2 font-bold text-sky-100">{g.playerB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BOTTOM SCORE BANNER */}
          <div className="flex items-center justify-between rounded-xl border border-sky-800 bg-[#0F2D54] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-lg px-3 py-1 font-black text-lg ${isAWin ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                {isAWin ? 'W' : 'L'}
              </span>
              <span className="font-bold text-lg text-white">{match.teamAName}</span>
            </div>

            <div className="text-3xl font-black text-white tracking-widest">
              {calcScoreA} - {calcScoreB}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-white">{match.teamBName}</span>
              <span className={`rounded-lg px-3 py-1 font-black text-lg ${!isAWin ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                {!isAWin ? 'W' : 'L'}
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center justify-end gap-3 border-t border-sky-800/80 bg-[#0C2240] px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-sky-700 bg-transparent px-5 py-2.5 text-xs font-bold text-sky-300 hover:bg-sky-900"
            >
              Batal
            </button>
            <button
              onClick={handleSaveReport}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-xs font-extrabold text-neutral-950 hover:bg-sky-400 shadow-lg"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan & Update Skor'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatIndoDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Sabtu, 09 Maret 2024';
  }
}
