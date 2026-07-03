import { useState } from "react"
import { MAX_PLAYERS, MIN_PLAYERS, defaultPlayers, createPlayer, assignRole, type Player, type RosterRole } from "@/lib/registration"
import { formatDuelId, toProperCase } from "@/lib/validators"

export function useRoster() {
  const [players, setPlayers] = useState<Player[]>(defaultPlayers)
  const [bulkText, setBulkText] = useState("")
  const [notification, setNotification] = useState<string | null>(null)

  function updatePlayer(id: string, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function changeRole(id: string, role: RosterRole) {
    setPlayers((prev) => assignRole(prev, id, role))
  }

  function addPlayer() {
    setPlayers((prev) => prev.length >= MAX_PLAYERS ? prev : [...prev, createPlayer("Anggota")])
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.length <= MIN_PLAYERS ? prev : prev.filter((p) => p.id !== id))
  }

  function handleSmartPaste(markTouchedMultiple: (keys: Record<string, boolean>) => void) {
    if (!bulkText.trim()) return

    const lines = bulkText.split('\n')
    const extractedData: Array<{namaLengkap: string, discord: string, ign: string, duelId: string}> = []

    lines.forEach((line) => {
      if (!line.trim()) return
      
      let cleanedLine = line.trim()
      
      const duelIdMatch = cleanedLine.match(/[\d\s-]{8,}$/)
      let duelId = ""
      
      if (duelIdMatch) {
        duelId = duelIdMatch[0].replace(/[\s-]/g, "")
        cleanedLine = cleanedLine.slice(0, duelIdMatch.index).trim()
        cleanedLine = cleanedLine.replace(/[,\t\/|-]+$/, "").trim()
      }

      const parts = cleanedLine
        .split(/\s*\t\s*|\s*\|\s*|\s*,\s*|\s*\/\s*|\s+-\s+|-/)
        .map(item => item.trim())
        .filter(Boolean)

      if (parts.length > 0 || duelId) {
         extractedData.push({
           namaLengkap: parts[0] || "",
           discord: parts[1] || "",
           ign: parts[2] || "",
           duelId: duelId ? formatDuelId(duelId) : formatDuelId(parts[3] || ""),
         })
      }
    })

    if (extractedData.length === 0) return

    const newTouched: Record<string, boolean> = {}
    const newPlayers = [...players]

    extractedData.forEach((data, index) => {
      let playerId = ""

      if (index < newPlayers.length) {
        newPlayers[index] = {
          ...newPlayers[index],
          namaLengkap: data.namaLengkap ? toProperCase(data.namaLengkap) : newPlayers[index].namaLengkap,
          discord: data.discord || newPlayers[index].discord,
          ign: data.ign || newPlayers[index].ign,
          duelId: data.duelId || newPlayers[index].duelId,
        }
        playerId = newPlayers[index].id
      } else if (newPlayers.length < MAX_PLAYERS) {
        const newP = createPlayer("Anggota")
        newP.namaLengkap = toProperCase(data.namaLengkap)
        newP.discord = data.discord
        newP.ign = data.ign
        newP.duelId = data.duelId
        newPlayers.push(newP)
        playerId = newP.id
      }

      if (playerId) {
        newTouched[`${playerId}-namaLengkap`] = true
        newTouched[`${playerId}-discord`] = true
        newTouched[`${playerId}-ign`] = true
        newTouched[`${playerId}-duelId`] = true
      }
    })

    setPlayers(newPlayers)
    markTouchedMultiple(newTouched)
    
    setNotification(`⚡ Berhasil mengekstrak ${Math.min(extractedData.length, MAX_PLAYERS)} data pemain! Perhatikan kotak berwarna merah jika ada data yang tidak sesuai format.`)
    setTimeout(() => setNotification(null), 5000)
    setBulkText("") 
  }

  return {
    players, setPlayers,
    bulkText, setBulkText,
    notification,
    updatePlayer, changeRole, addPlayer, removePlayer, handleSmartPaste
  }
}
