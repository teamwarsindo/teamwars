import { useState, useEffect } from "react"
import { STORAGE_KEY, type FormState } from "./lib-registration"
import type { TeamState, RosterState } from "./types"

export function useDraftStorage(team: TeamState, roster: RosterState, isEditMode: boolean) {
  const [isDraftLoaded, setIsDraftLoaded] = useState(false)
  
  // 🚀 PERBAIKAN: Menyimpan log akurat kolom mana saja yang terisi dari draft
  const [draftTouchedKeys, setDraftTouchedKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isEditMode) {
      setIsDraftLoaded(true)
      return
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as Partial<FormState>
        const touched: Record<string, boolean> = {}

        // Identitas Tim
        if (data.email) { team.setEmail(data.email); touched.email = true; }
        if (data.namaTim) { team.setNamaTim(data.namaTim); touched.namaTim = true; }
        if (data.hex) { team.setHex(data.hex); touched.hex = true; }
        
        // Roster Pemain
        if (data.players) {
          roster.setPlayers(data.players)
          data.players.forEach(p => {
            if (p.namaLengkap) touched[`${p.id}-namaLengkap`] = true
            if (p.discord) touched[`${p.id}-discord`] = true
            if (p.ign) touched[`${p.id}-ign`] = true
            if (p.duelId) touched[`${p.id}-duelId`] = true
          })
        }
        setDraftTouchedKeys(touched) 
      }
    } catch {}
    setIsDraftLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  useEffect(() => {
    if (!isDraftLoaded || isEditMode) return 
    const draft: FormState = { email: team.email, namaTim: team.namaTim, hex: team.hex, players: roster.players }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) } catch {}
  }, [team.email, team.namaTim, team.hex, roster.players, isDraftLoaded, isEditMode])

  return { isDraftLoaded, draftTouchedKeys }
      }
