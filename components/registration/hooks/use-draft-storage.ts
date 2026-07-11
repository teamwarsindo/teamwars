import { useState, useEffect } from "react"
import { STORAGE_KEY, type FormState } from "@/lib/registration"
import { TeamState, RosterState } from "./use-registration-flow" 

export function useDraftStorage(team: TeamState, roster: RosterState, isEditMode: boolean) {
  const [isDraftLoaded, setIsDraftLoaded] = useState(false)

  // Load Draft
  useEffect(() => {
    if (isEditMode) {
      setIsDraftLoaded(true)
      return
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as Partial<FormState>
        if (data.email) team.setEmail(data.email)
        if (data.namaTim) team.setNamaTim(data.namaTim)
        if (data.hex) team.setHex(data.hex)
        if (data.players) roster.setPlayers(data.players)
      }
    } catch {}
    setIsDraftLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  // Save Draft
  useEffect(() => {
    if (!isDraftLoaded || isEditMode) return 
    const draft: FormState = { email: team.email, namaTim: team.namaTim, hex: team.hex, players: roster.players }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) } catch {}
  }, [team.email, team.namaTim, team.hex, roster.players, isDraftLoaded, isEditMode])

  return { isDraftLoaded }
}
