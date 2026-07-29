import { useState, useEffect } from "react"
import { PlayerState, BackendError } from "./types" 

export function usePreFlightCheck(
  namaTim: string, 
  players: PlayerState[], 
  isEditMode: boolean, 
  originalTeamName: string,
  isSmartPaste: boolean,
  setIsSmartPaste: (val: boolean) => void,
  editToken: string = "" // 👈 TAMBAHAN: Parameter editToken
) {
  const [isChecking, setIsChecking] = useState(false)
  const [rawBackendErrors, setRawBackendErrors] = useState<BackendError[]>([])

  const playersCheckPayload = JSON.stringify(players.map(p => ({
    ign: p.ign, discord: p.discord, idDuelLinks: p.duelId
  })))

  useEffect(() => {
    // 1. Cek apakah ada satupun data pemain yang sudah diisi
    const hasPlayerData = players.some(p => p.duelId.trim() || p.discord.trim() || p.ign.trim())

    // 2. Kalau Nama Tim KOSONG dan Pemain juga KOSONG, baru hentikan proses (return)
    if (!namaTim.trim() && !hasPlayerData) {
      setRawBackendErrors(prev => (prev.length === 0 ? prev : []))
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const runPreFlightCheck = async () => {
      setIsChecking(true)
      try {
        const safeExcludeSlug = isEditMode && originalTeamName
          ? originalTeamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
          : undefined;

        const payload = {
          isPreFlight: true,
          namaTim: namaTim.trim(),
          excludeSlug: safeExcludeSlug, 
          token: isEditMode ? editToken : undefined, // 👈 TAMBAHAN: Sisipkan editToken ke payload
          players: JSON.parse(playersCheckPayload)
        }
        
        const res = await fetch("/api/pre-flight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal 
        })

        const contentType = res.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("Server tidak mengembalikan format JSON yang valid.")
        }

        const result = await res.json()

        if (!signal.aborted) {
          if (!res.ok || !result.success) setRawBackendErrors(result.errors || [])
          else setRawBackendErrors([])
        }
      } catch (error: any) {
        if (error.name !== "AbortError") console.error("Background check failed:", error)
      } finally {
        if (!signal.aborted) setIsChecking(false)
      }
    }

    if (isSmartPaste) {
      runPreFlightCheck()
      setIsSmartPaste(false) 
    } else {
      const timer = setTimeout(() => runPreFlightCheck(), 500)
      return () => { clearTimeout(timer); controller.abort() }
    }
  }, [namaTim, playersCheckPayload, isSmartPaste, isEditMode, originalTeamName, editToken, setIsSmartPaste]) 

  return { isChecking, rawBackendErrors }
    }
