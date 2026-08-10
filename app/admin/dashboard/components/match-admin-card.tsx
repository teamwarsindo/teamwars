'use client';

import { useState, useEffect } from 'react';
import { MatchScheduleItem, DIVISION_MAP } from '@/lib/types/tournament';
import { Pencil, FileText, Copy, RotateCcw, Trash2, ExternalLink } from 'lucide-react';

interface StaffItem {
  discordId: string;
  discordName: string;
}

interface MatchAdminCardProps {
  match: MatchScheduleItem;
  refereeList: StaffItem[];
  streamerList: StaffItem[];
  groupAName?: string;
  groupBName?: string;
  onSave: (updated: MatchScheduleItem) => void;
  onSync: (match: MatchScheduleItem) => void;
  onDeleteChannel: (match: MatchScheduleItem) => void;
  onCopyLink: (match: MatchScheduleItem) => void;
}

function formatISOToWIBInput(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const options = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  } as const;
  return new Intl.DateTimeFormat('sv-SE', options).format(d).replace(' ', 'T');
}

function formatWIBInputToISO(wibInputString: string): string {
  if (!wibInputString) return new Date().toISOString();
  return new Date(`${wibInputString}:00+07:00`).toISOString();
}

export function MatchAdminCard({
  match,
  refereeList,
  streamerList,
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
  onSave,
  onSync,
  onDeleteChannel,
  onCopyLink,
}: MatchAdminCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<MatchScheduleItem>(match);

  useEffect(() => {
    setDraft(match);
  }, [match]);

  const handleSave = () => {
    onSave(draft);
    setIsEditing(false);
  };

  const isGroupA = match.groupName === 'Group A' || match.groupName === groupAName;
  const groupDisplayName = isGroupA ? groupAName : groupBName;

  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  const isMatchDone = Boolean(match.isFinished || scoreA + scoreB > 0);

  const isTeamAWinner = isMatchDone && scoreA > scoreB;
  const isTeamBWinner = isMatchDone && scoreB > scoreA;

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* 1. HEADER JUDUL 3 TEMPAT (KIRI: MATCH | TENGAH: DIVISI | KANAN: WEEK) */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2 text-[11px] font-black uppercase tracking-wider">
        <span className="text-muted-foreground w-1/3 text-left">
          {match.id.toUpperCase()}
        </span>
        <span className={`w-1/3 text-center truncate ${isGroupA ? 'text-sky-500' : 'text-amber-500'}`}>
          {groupDisplayName}
        </span>
        <span className="text-muted-foreground w-1/3 text-right">
          WEEK {match.weekNumber || 1}
        </span>
      </div>

      {/* 2. BARIS BAWAH JUDUL: KIRI TANGGAL (DENGAN NAMA HARI) & KANAN WASIT */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="px-2 py-1 rounded-lg bg-muted/60 border border-border/60 text-foreground font-extrabold flex items-center gap-1">
          <span>
            {new Date(match.matchDate).toLocaleDateString('id-ID', {
              weekday: 'long', // 🟢 MENAMPILKAN NAMA HARI LENGKAP
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta',
            })}{' '}
            WIB
          </span>
        </div>

        <div className="px-2 py-1 rounded-lg bg-muted/60 border border-border/60 text-foreground font-extrabold flex items-center gap-1">
          <span className="text-muted-foreground font-bold">Wasit:</span>
          <span>{match.referee || '-'}</span>
        </div>
      </div>

      {/* DISPLAY NAMA TIM & SKOR */}
      <div className="flex items-center justify-between gap-1 my-2.5 px-0.5 font-black text-[11px] sm:text-xs">
        <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0 pr-0.5">
          <span className={`truncate text-right leading-tight ${isTeamAWinner ? 'text-emerald-500 font-black' : 'text-foreground font-bold'}`}>
            {match.teamAName}
          </span>
          <img src={match.teamALogo || '/logo.webp'} alt="" className="h-5 w-5 shrink-0 object-contain" />
        </div>

        <div className="flex flex-col items-center justify-center shrink-0 px-1">
          <span
            className={`font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-lg whitespace-nowrap border ${
              isMatchDone
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
            }`}
          >
            {scoreA} - {scoreB}
          </span>
          <span className="text-[8px] font-extrabold text-muted-foreground mt-0.5 uppercase tracking-wider">
            {isMatchDone ? 'FINISHED' : 'SCHEDULED'}
          </span>
        </div>

        <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0 pl-0.5">
          <img src={match.teamBLogo || '/logo.webp'} alt="" className="h-5 w-5 shrink-0 object-contain" />
          <span className={`truncate text-left leading-tight ${isTeamBWinner ? 'text-emerald-500 font-black' : 'text-foreground font-bold'}`}>
            {match.teamBName}
          </span>
        </div>
      </div>

      {/* MODE EDITING VS DISPLAY */}
      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-muted/20 rounded-xl text-xs">
          {/* INPUT TANGGAL & WAKTU + PRATINJAU NAMA HARI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] text-muted-foreground font-bold uppercase">
                TANGGAL &amp; WAKTU (WIB)
              </label>
              {draft.matchDate && !isNaN(new Date(draft.matchDate).getTime()) && (
                <span className="text-[10px] font-black text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  {new Date(draft.matchDate).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
            <input
              type="datetime-local"
              value={formatISOToWIBInput(draft.matchDate)}
              onChange={(e) => setDraft({ ...draft, matchDate: formatWIBInputToISO(e.target.value) })}
              className="w-full rounded-lg bg-background border border-input p-2 font-bold text-xs"
            />
          </div>

          {/* WASIT DROPDOWN */}
          <div>
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              WASIT / REFEREE
            </label>
            <select
              value={draft.refereeDiscordId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (!selectedId) {
                  setDraft({ ...draft, refereeDiscordId: '', referee: '' });
                } else {
                  const selectedStaff = refereeList.find((r) => r.discordId === selectedId);
                  setDraft({
                    ...draft,
                    refereeDiscordId: selectedId,
                    referee: selectedStaff ? selectedStaff.discordName : '',
                  });
                }
              }}
              className="w-full rounded-lg bg-background border border-input p-2 font-semibold text-xs cursor-pointer"
            >
              <option value="">-- Belum Ada Wasit --</option>
              {refereeList.map((r) => (
                <option key={r.discordId} value={r.discordId}>
                  {r.discordName}
                </option>
              ))}
            </select>
          </div>

          {/* STREAMER DROPDOWN */}
          <div>
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              STREAMER / CASTER
            </label>
            <select
              value={draft.streamerDiscordId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (!selectedId) {
                  setDraft({ ...draft, streamerDiscordId: '', streamer: '' });
                } else {
                  const selectedStaff = streamerList.find((s) => s.discordId === selectedId);
                  setDraft({
                    ...draft,
                    streamerDiscordId: selectedId,
                    streamer: selectedStaff ? selectedStaff.discordName : '',
                  });
                }
              }}
              className="w-full rounded-lg bg-background border border-input p-2 font-semibold text-xs cursor-pointer"
            >
              <option value="">-- Belum Ada Streamer --</option>
              {streamerList.map((s) => (
                <option key={s.discordId} value={s.discordId}>
                  {s.discordName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              SKOR TIM A ({draft.teamAName})
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={draft.scoreA ?? 0}
              onChange={(e) => setDraft({ ...draft, scoreA: parseInt(e.target.value, 10) || 0 })}
              className="w-full rounded-lg bg-background border border-input p-2 font-semibold text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              SKOR TIM B ({draft.teamBName})
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={draft.scoreB ?? 0}
              onChange={(e) => setDraft({ ...draft, scoreB: parseInt(e.target.value, 10) || 0 })}
              className="w-full rounded-lg bg-background border border-input p-2 font-semibold text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              id={`isFinished-${draft.id}`}
              checked={draft.isFinished ?? false}
              onChange={(e) => setDraft({ ...draft, isFinished: e.target.checked })}
              className="h-4 w-4 rounded border-input text-primary cursor-pointer"
            />
            <label htmlFor={`isFinished-${draft.id}`} className="text-xs font-bold cursor-pointer">
              Tandai Match FINISHED
            </label>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              YOUTUBE / STREAM LINK
            </label>
            <input
              type="text"
              placeholder="https://youtube.com/..."
              value={draft.streamLink || ''}
              onChange={(e) => setDraft({ ...draft, streamLink: e.target.value })}
              className="w-full rounded-lg bg-background border border-input p-2 font-medium"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setDraft(match);
                setIsEditing(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>
      ) : (
        /* 3. BARIS STREAMER (KIRI) & LINK STREAMING CUSTOM TEKS (KANAN) */
        <div className="space-y-2.5 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-[11px] px-0.5">
            <div className="text-muted-foreground">
              <b className="text-foreground">Streamer:</b> {match.streamer || '-'}
            </div>

            <div>
              {match.streamLink ? (
                <a
                  href={match.streamLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/30 font-bold hover:bg-rose-500/20 transition flex items-center gap-1"
                >
                  <span>Watch Live</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground italic">- No Stream -</span>
              )}
            </div>
          </div>

          {/* TOMBOL AKSI KARTU MATCH */}
          <div className="grid grid-cols-2 sm:flex sm:items-center justify-end gap-1.5 w-full">
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-400 text-[11px] font-bold hover:bg-sky-500/20 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Pencil className="h-3 w-3 shrink-0" />
              <span>Quick Edit</span>
            </button>

            <div className="flex items-center rounded-xl border border-amber-500/40 bg-amber-500/10 overflow-hidden min-w-0">
              <a
                href={`/tournament/match-input/${match.id}?token=${match.refereeToken || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition flex items-center justify-center gap-1 flex-1 truncate"
              >
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">Report</span>
              </a>
              <button
                onClick={() => onCopyLink(match)}
                title="Salin Magic Link Wasit"
                className="px-2 py-1.5 border-l border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
              >
                <Copy className="h-3 w-3 shrink-0" />
              </button>
            </div>

            <button
              onClick={() => onSync(match)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 shrink-0" />
              <span>Sync</span>
            </button>

            <button
              onClick={() => onDeleteChannel(match)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3 shrink-0" />
              <span className="truncate">Delete Channel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
          }
                
