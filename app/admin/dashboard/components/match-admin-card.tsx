'use client';

import { useState } from 'react';
import { MatchScheduleItem } from '@/lib/types/tournament';

interface StaffItem {
  discordId: string;
  discordName: string;
}

interface MatchAdminCardProps {
  match: MatchScheduleItem;
  refereeList: StaffItem[];
  streamerList: StaffItem[];
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
  onSave,
  onSync,
  onDeleteChannel,
  onCopyLink,
}: MatchAdminCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<MatchScheduleItem>(match);

  const handleSave = () => {
    onSave(draft);
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between border-b border-border/40 pb-2 text-xs">
        <span className="font-extrabold text-primary uppercase">
          {match.groupName} • {match.id} • Week {match.weekNumber || 1}
        </span>
        <span className="text-muted-foreground font-semibold">
          {new Date(match.matchDate).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta',
          })}{' '}
          WIB
        </span>
      </div>

      <div className="flex items-center justify-between my-2 font-black text-sm">
        <div className="flex items-center gap-2">
          <img src={match.teamALogo} alt="" className="h-6 w-6 object-contain" />
          <span>{match.teamAName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-extrabold text-xs px-2.5 py-1 rounded-full ${
              match.isFinished
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}
          >
            {match.scoreA} - {match.scoreB} {match.isFinished ? '(FINISHED)' : '(SCHEDULED)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>{match.teamBName}</span>
          <img src={match.teamBLogo} alt="" className="h-6 w-6 object-contain" />
        </div>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-muted/20 rounded-xl text-xs">
          <div>
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              TANGGAL & WAKTU (WIB)
            </label>
            <input
              type="datetime-local"
              value={formatISOToWIBInput(draft.matchDate)}
              onChange={(e) => setDraft({ ...draft, matchDate: formatWIBInputToISO(e.target.value) })}
              className="w-full rounded-lg bg-background border border-input p-2 font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              WASIT / REFEREE
            </label>
            <select
              value={draft.refereeDiscordId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                const selectedStaff = refereeList.find((r) => r.discordId === selectedId);
                setDraft({
                  ...draft,
                  refereeDiscordId: selectedId,
                  referee: selectedStaff ? selectedStaff.discordName : '',
                });
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

          <div>
            <label className="block text-[10px] text-muted-foreground font-bold mb-1">
              STREAMER / CASTER
            </label>
            <select
              value={draft.streamerDiscordId || draft.casterDiscordId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                const selectedStaff = streamerList.find((s) => s.discordId === selectedId);
                setDraft({
                  ...draft,
                  streamerDiscordId: selectedId,
                  casterDiscordId: selectedId,
                  streamer: selectedStaff ? selectedStaff.discordName : '',
                });
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
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 cursor-pointer"
            >
              💾 Simpan
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-border/40 gap-2">
          <div className="space-x-3 text-muted-foreground">
            <span>
              <b>Wasit:</b> {match.referee || '-'}
            </span>
            <span>
              <b>Streamer:</b> {match.streamer || '-'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 text-[11px] font-bold hover:bg-sky-500/20 cursor-pointer"
            >
              ✏️ Quick Edit
            </button>

            {/* 📝 TOMBOL LENGKAP MATCH REPORT */}
            <div className="flex items-center rounded-lg border border-amber-500/40 bg-amber-500/10 overflow-hidden">
              <a
                href={`/tournament/match-input/${match.id}?token=${match.refereeToken || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition flex items-center gap-1"
              >
                📝 Match Report
              </a>
              <button
                onClick={() => onCopyLink(match)}
                title="Salin Magic Link Wasit"
                className="px-2 py-1 border-l border-amber-500/30 text-amber-400 text-[11px] hover:bg-amber-500/20 transition cursor-pointer"
              >
                📋
              </button>
            </div>

            <button
              onClick={() => onSync(match)}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm cursor-pointer"
            >
              🔄 Sync
            </button>
            <button
              onClick={() => onDeleteChannel(match)}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm cursor-pointer"
            >
              🗑️ Delete Channel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}