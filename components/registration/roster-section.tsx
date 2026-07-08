"use client"

import { TrashIcon, PlusIcon, AlertIcon, CheckIcon } from "@/components/icons"
import { ROSTER_ROLES, MIN_PLAYERS, MAX_PLAYERS, type Player, type RosterRole } from "@/lib/registration"
import { formatDuelId, sanitizeRealName, sanitizeDiscord, toProperCase } from "@/lib/validators"
import { inputBase, ErrorText } from "./shared"

interface RosterSectionProps {
  players: Player[]
  rosterRuleOk: boolean
  bulkText: string
  notification: string | null
  setBulkText: (val: string) => void
  handleSmartPaste: () => void
  updatePlayer: (id: string, patch: Partial<Player>) => void
  changeRole: (id: string, role: RosterRole) => void
  addPlayer: () => void
  removePlayer: (id: string) => void
  err: (key: string) => string | undefined
  markTouched: (key: string) => void
  // ✅ TAMBAHKAN INI AGAR TYPESCRIPT TIDAK ERROR
  isEditMode?: boolean 
}

export function RosterSection({ 
  players, 
  rosterRuleOk, 
  bulkText, 
  notification, 
  setBulkText, 
  handleSmartPaste, 
  updatePlayer, 
  changeRole, 
  addPlayer, 
  removePlayer, 
  err, 
  markTouched,
  isEditMode = false // Default false
}: RosterSectionProps) {
  return (
    <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
          <div><h2 className="text-base font-semibold text-foreground">Roster Pemain</h2></div>
        </div>
      </div>

      {!rosterRuleOk && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Komposisi roster tidak valid</p>
            <p>Wajib memiliki tepat 1 Ketua dan 1 Wakil Ketua.</p>
          </div>
        </div>
      )}

      {/* AREA SMART PASTE (Hanya Muncul Jika BUKAN Edit Mode) */}
      {!isEditMode && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          {notification && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500 animate-in fade-in slide-in-from-top-2">
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{notification}</p>
            </div>
          )}
          <div className="mb-3">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">⚡ Smart Paste (Isi Cepat)</h3>
            <p className="text-xs text-muted-foreground mt-1">Copy-paste data pemain dari Spreadsheet/Notepad ke sini. <br/> <strong>Format:</strong> Nama - Discord - IGN - ID Duel Links (Gunakan koma/strip/garis miring sebagai pemisah).</p>
          </div>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Contoh:&#10;Seto Kaiba / kaiba / BlueEyesMaster / 123-456-789&#10;Yugi Moto, yugi, KingOfGames, 987654321" className="w-full h-24 rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/40 transition-all" />
          <button type="button" onClick={handleSmartPaste} disabled={!bulkText.trim()} className="mt-3 flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            Ekstrak & Masukkan ke Form
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {players.map((p, index) => {
          
          // 🛑 LOGIKA PENGUNCIAN KETUA & WAKIL DI EDIT MODE
          const isLeadership = p.role === "Ketua" || p.role === "Wakil Ketua";
          const isLockedLeader = isEditMode && isLeadership;
          
          const canDelete = players.length > MIN_PLAYERS && !isLockedLeader;
          
          const roleBg = isLeadership ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-blue-100 text-blue-700 border-blue-300"
          const roleIcon = p.role === "Ketua" ? "👑" : p.role === "Wakil Ketua" ? "🌟" : "👤"

          return (
            <div key={p.id} className="rounded-xl border border-border bg-background/40 p-4 transition-all duration-300 ease-in-out">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isLeadership ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                    {index + 1}
                  </span>
                  
                  <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${roleBg} ${isLockedLeader ? 'opacity-70' : ''}`}>
                    <span>{roleIcon}</span>
                    <select disabled={isLockedLeader} value={p.role} onChange={(e) => changeRole(p.id, e.target.value as RosterRole)} className={`bg-transparent font-semibold outline-none ${isLockedLeader ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {ROSTER_ROLES.map((r) => <option key={r} value={r} className="text-foreground bg-background">{r}</option>)}
                    </select>
                  </div>
                  {isLockedLeader && <span className="text-xs font-bold text-destructive ml-2">(Terkunci)</span>}
                </div>
                <button type="button" onClick={() => removePlayer(p.id)} disabled={!canDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <input disabled={isLockedLeader} type="text" value={p.namaLengkap} onChange={(e) => updatePlayer(p.id, { namaLengkap: sanitizeRealName(e.target.value) })} onBlur={(e) => { updatePlayer(p.id, { namaLengkap: toProperCase(e.target.value) }); markTouched(`${p.id}-namaLengkap`) }} placeholder="Nama Lengkap" className={`${inputBase} ${isLockedLeader ? 'opacity-60 cursor-not-allowed bg-muted' : ''} ${err(`${p.id}-namaLengkap`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-namaLengkap`)} />
                </div>
                <div>
                  <input disabled={isLockedLeader} type="text" value={p.discord} onChange={(e) => updatePlayer(p.id, { discord: sanitizeDiscord(e.target.value) })} onBlur={() => markTouched(`${p.id}-discord`)} placeholder="Discord Username" className={`${inputBase} ${isLockedLeader ? 'opacity-60 cursor-not-allowed bg-muted' : ''} ${err(`${p.id}-discord`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-discord`)} />
                </div>
                <div>
                  <input type="text" value={p.ign} onChange={(e) => updatePlayer(p.id, { ign: e.target.value })} onBlur={() => markTouched(`${p.id}-ign`)} placeholder="In-Game Name (IGN)" className={`${inputBase} ${err(`${p.id}-ign`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-ign`)} />
                </div>
                <div>
                  <input type="text" inputMode="numeric" value={p.duelId} onChange={(e) => updatePlayer(p.id, { duelId: formatDuelId(e.target.value) })} onBlur={() => markTouched(`${p.id}-duelId`)} placeholder="ID Duel Links" className={`${inputBase} font-mono ${err(`${p.id}-duelId`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-duelId`)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={addPlayer} disabled={players.length >= MAX_PLAYERS} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-primary disabled:opacity-40">
        <PlusIcon className="h-5 w-5" /> Tambah Pemain Baru
      </button>
    </section>
  )
                  }
