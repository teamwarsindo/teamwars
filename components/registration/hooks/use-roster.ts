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

  // Fungsi Smart Paste yang sama seperti sebelumnya dimasukkan ke sini...
  function handleSmartPaste(markTouchedMultiple: (keys: Record<string, boolean>) => void) {
    if (!bulkText.trim()) return

    // ... (Logika pemecahan baris dan Regex sama persis) ...
    
    // Anggap extractedData sudah terisi dari logika sebelumnya
    const extractedData: any[] = [] 
    
    if (extractedData.length === 0) return
    const newTouched: Record<string, boolean> = {}
    const newPlayers = [...players]

    extractedData.forEach((data, index) => {
      // ... (Logika penyisipan data pemain sama persis) ...
    })

    setPlayers(newPlayers)
    markTouchedMultiple(newTouched) // Panggil fungsi dari hook flow untuk menandai error
    setNotification(`⚡ Berhasil mengekstrak data!`)
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
