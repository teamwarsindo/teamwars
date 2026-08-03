'use client';

import { useState, useEffect } from 'react';
import { MatchScheduleItem } from '@/lib/types/tournament';
import Swal from 'sweetalert2';

export function ScheduleAdminTab() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<MatchScheduleItem | null>(null);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/tournament');
      const data = await res.json();
      if (data && data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleSaveMatchSchedule = async (updated: MatchScheduleItem) => {
    try {
      const res = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MATCH_CONSOLE',
          matchId: updated.id,
          token: 'tsaqif', // Admin Override Token
          matchData: updated,
        }),
      });

      if (res.ok) {
        await fetchSchedules();
        setEditingMatch(null);
        Swal.fire({
          icon: 'success',
          title: 'Jadwal Berhasil Disimpan!',
          toast: true,
          position: 'top-end',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch {
      Swal.fire('Error', 'Gagal menyimpan perubahan jadwal', 'error');
    }
  };

  const handleGenerateDiscordChannel = async (match: MatchScheduleItem) => {
    Swal.fire({ title: 'Generating Channel...', text: 'Membuat channel Discord & mengatur permission Wasit/Streamer', didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/tournament/generate-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        Swal.fire('Berhasil!', `Channel Discord berhasil dibuat! ID Channel: ${data.channelId}`, 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal membuat channel Discord', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    }
  };

  const handleCopyMagicLink = (match: MatchScheduleItem) => {
    const magicUrl = `${window.location.origin}/tournament/match-input/${match.id}?token=${match.refereeToken || ''}`;
    navigator.clipboard.writeText(magicUrl);
    Swal.fire({
      icon: 'success',
      title: 'Magic Link Wasit Disalin!',
      text: magicUrl,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Jadwal Admin...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Manajemen Schedule Pertandingan</h2>
          <p className="text-xs text-muted-foreground">Kelola waktu, Wasit, Streamer, dan otomatisasi channel Discord match.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {schedules.map((m) => {
          const isEditing = editingMatch?.id === m.id;
          const currentData = isEditing ? editingMatch : m;

          return (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-border/40 pb-2 text-xs">
                <span className="font-extrabold text-primary uppercase">{m.groupName} • {m.id}</span>
                <span className="text-muted-foreground font-semibold">
                  {new Date(m.matchDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                </span>
              </div>

              {/* TEAM VS TEAM BANNER */}
              <div className="flex items-center justify-between my-2 font-black text-sm">
                <div className="flex items-center gap-2">
                  <img src={m.teamALogo} alt="" className="h-6 w-6 object-contain" />
                  <span>{m.teamAName}</span>
                </div>
                <span className="text-amber-500 font-extrabold text-xs">{m.scoreA} - {m.scoreB}</span>
                <div className="flex items-center gap-2">
                  <span>{m.teamBName}</span>
                  <img src={m.teamBLogo} alt="" className="h-6 w-6 object-contain" />
                </div>
              </div>

              {/* FORM EDIT / READONLY */}
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-muted/20 rounded-xl text-xs">
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">TANGGAL & WAKTU (ISO/WIB)</label>
                    <input
                      type="datetime-local"
                      value={currentData.matchDate ? new Date(currentData.matchDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingMatch({ ...currentData, matchDate: new Date(e.target.value).toISOString() })}
                      className="w-full rounded-lg bg-background border border-input p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">WASIT (NAMA & DISCORD ID)</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Nama Wasit"
                        value={currentData.referee || ''}
                        onChange={(e) => setEditingMatch({ ...currentData, referee: e.target.value })}
                        className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="ID Discord Wasit"
                        value={currentData.refereeDiscordId || ''}
                        onChange={(e) => setEditingMatch({ ...currentData, refereeDiscordId: e.target.value })}
                        className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">STREAMER (NAMA & DISCORD ID)</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Nama Streamer"
                        value={currentData.streamer || ''}
                        onChange={(e) => setEditingMatch({ ...currentData, streamer: e.target.value })}
                        className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="ID Discord Streamer"
                        value={currentData.caster || ''} // Menggunakan field caster/streamer
                        onChange={(e) => setEditingMatch({ ...currentData, caster: e.target.value })}
                        className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">YOUTUBE / STREAM LINK</label>
                    <input
                      type="text"
                      placeholder="https://youtube.com/..."
                      value={currentData.streamLink || ''}
                      onChange={(e) => setEditingMatch({ ...currentData, streamLink: e.target.value })}
                      className="w-full rounded-lg bg-background border border-input p-2 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingMatch(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted">
                      Batal
                    </button>
                    <button onClick={() => handleSaveMatchSchedule(currentData)} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500">
                      💾 Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-border/40 gap-2">
                  <div className="space-x-3 text-muted-foreground">
                    <span><b>Wasit:</b> {m.referee || '-'}</span>
                    <span><b>Streamer:</b> {m.streamer || '-'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingMatch(m)}
                      className="px-3 py-1 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 text-[11px] font-bold hover:bg-sky-500/20"
                    >
                      ✏️ Edit Schedule
                    </button>

                    <button
                      onClick={() => handleCopyMagicLink(m)}
                      className="px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[11px] font-bold hover:bg-amber-500/20"
                    >
                      📋 Copy Link Wasit
                    </button>

                    <button
                      onClick={() => handleGenerateDiscordChannel(m)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-500 shadow-sm"
                    >
                      🚀 Generate Discord Channel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  }
          
