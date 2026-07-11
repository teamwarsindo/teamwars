import { useState, useEffect, useMemo } from "react"
import { STORAGE_KEY, countRole, findDuplicateFields, type FormState } from "@/lib/registration"
import { 
  isValidEmail, 
  isValidHex, 
  isCompleteDuelId, 
  validateRealName, 
  validateTeamName, 
  validateDiscord,
  validateIGN, // Pastikan ini di-import
  sanitizeTeamName,
  sanitizeDiscord,
  sanitizeIGN,
  toProperCase,
  formatDuelId
} from "@/lib/validators"
import Swal from "sweetalert2"

// =========================================================================
// 1. DEFINISI TYPE (Menghilangkan utang teknis 'any')
// =========================================================================
export interface PlayerState {
  id: string;
  role: string;
  namaLengkap: string;
  discord: string;
  ign: string;
  duelId: string;
}

export interface TeamState {
  email: string;
  namaTim: string;
  hex: string;
  logo: { url?: string } | null;
  bukti: { url?: string } | null;
  setEmail: (val: string) => void;
  setNamaTim: (val: string) => void;
  setHex: (val: string) => void;
}

export interface RosterState {
  players: PlayerState[];
  setPlayers: (players: PlayerState[]) => void;
}

export interface BackendError {
  field: string;
  message: string;
}

// Tambahan parameter `editToken` untuk menggantikan window.location
export function useRegistrationFlow(
  team: TeamState, 
  roster: RosterState, 
  isEditMode: boolean = false, 
  originalTeamName: string = "",
  editToken: string = "" 
) {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [serverError, setServerError] = useState<string | null>(null)
  const [rawBackendErrors, setRawBackendErrors] = useState<BackendError[]>([])
  
  const [isSmartPaste, setIsSmartPaste] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const [success, setSuccess] = useState(false)
  const [isDraftLoaded, setIsDraftLoaded] = useState(false)

  function markTouched(key: string) {
    setTouchedFields((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }

  function markTouchedMultiple(keys: Record<string, boolean>) {
    setTouchedFields((prev) => ({ ...prev, ...keys }))
  }

  function triggerSmartPasteBypass() {
    setIsSmartPaste(true)
  }

  // =========================================================================
  // LOCAL STORAGE DRAFT FUNCTIONS
  // =========================================================================
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
  }, [isEditMode]) // Mengabaikan warning linter untuk setter demi kemudahan, asumsi setter stabil

  useEffect(() => {
    if (!isDraftLoaded || isEditMode) return 
    const draft: FormState = { email: team.email, namaTim: team.namaTim, hex: team.hex, players: roster.players }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) } catch {}
  }, [team.email, team.namaTim, team.hex, roster.players, isDraftLoaded, isEditMode])

  const rosterRuleOk = countRole(roster.players, "Ketua") === 1 && countRole(roster.players, "Wakil Ketua") === 1
  const duplicateFields = useMemo(() => findDuplicateFields(roster.players), [roster.players])

  const mappedBackendErrors = useMemo(() => {
    const mapped: Record<string, string> = {}
    rawBackendErrors.forEach((err) => {
      if (err.field === "namaTim") {
        mapped["namaTim"] = err.message
      } else if (err.field.startsWith("players.")) {
        const parts = err.field.split(".")
        const index = parseInt(parts[1], 10)
        const type = parts[2]
        
        const frontendType = type === "idDuelLinks" ? "duelId" : type
        const player = roster.players[index]
        
        if (player) {
          mapped[`${player.id}-${frontendType}`] = err.message
        }
      }
    })
    return mapped
  }, [rawBackendErrors, roster.players])

  // =========================================================================
  // ⚡ RADAR DEBOUNCE UNIVERSAL (Dengan AbortController untuk Race Condition)
  // =========================================================================
  // Stringify hanya data krusial untuk mencegah infinite loop render
  const playersCheckPayload = JSON.stringify(roster.players.map(p => ({
    ign: p.ign, discord: p.discord, idDuelLinks: p.duelId
  })))

  useEffect(() => {
    if (!team.namaTim.trim()) {
      setRawBackendErrors((prev) => (prev.length === 0 ? prev : []))
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const runPreFlightCheck = async () => {
      setIsChecking(true)
      try {
        // PERBAIKAN: originalTeamName harus ada jika di Edit Mode
        const safeExcludeSlug = isEditMode && originalTeamName
          ? originalTeamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
          : undefined;

        const payload = {
          isPreFlight: true,
          namaTim: team.namaTim.trim(),
          excludeSlug: safeExcludeSlug, 
          players: JSON.parse(playersCheckPayload)
        }
        
        const res = await fetch("/api/pre-flight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal // Menyematkan sinyal pembatalan
        })

        // PERBAIKAN: Cek tipe konten sebelum parse JSON untuk menghindari crash HTML Error Page
        const contentType = res.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("Server tidak mengembalikan format JSON yang valid.")
        }

        const result = await res.json()

        // Pastikan tidak melakukan set state jika request sudah dibatalkan
        if (!signal.aborted) {
          if (!res.ok || !result.success) {
            setRawBackendErrors(result.errors || [])
          } else {
            setRawBackendErrors([])
          }
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Gagal melakukan background check:", error)
        }
      } finally {
        if (!signal.aborted) {
          setIsChecking(false)
        }
      }
    }

    if (isSmartPaste) {
      runPreFlightCheck()
      setIsSmartPaste(false) 
    } else {
      const timer = setTimeout(() => {
        runPreFlightCheck()
      }, 500)

      return () => {
        clearTimeout(timer)
        controller.abort() // Membatalkan API request yang sedang berjalan jika user mengetik lagi
      }
    }
  }, [team.namaTim, playersCheckPayload, isSmartPaste, isEditMode, originalTeamName]) 
  
  
  // =========================================================================
  // 🛡️ COMPREHENSIVE VALIDATION MERGER
  // =========================================================================
  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    
    if (!team.email.trim()) errs.email = "Email wajib diisi."
    else if (!isValidEmail(team.email)) errs.email = "Format email tidak valid."
    
    const teamErr = validateTeamName(team.namaTim)
    if (teamErr) errs.namaTim = teamErr
    else if (!team.namaTim.trim()) errs.namaTim = "Nama Tim wajib diisi."
    
    if (!isValidHex(team.hex)) errs.hex = "Format hex tidak valid (#RRGGBB)."
    
    // PERBAIKAN: Sinkronisasi status upload dengan saat eksekusi submit (.url)
    if (!team.logo?.url) errs.logo = "Logo tim wajib diunggah hingga selesai."
    if (!team.bukti?.url) errs.bukti = "Bukti transfer wajib diunggah hingga selesai."

    roster.players.forEach((p) => {
      const nameErr = validateRealName(p.namaLengkap)
      if (nameErr) errs[`${p.id}-namaLengkap`] = nameErr

      const discordErr = validateDiscord(p.discord)
      if (discordErr) errs[`${p.id}-discord`] = discordErr

      // PERBAIKAN: Menambahkan validateIGN
      const ignErr = validateIGN(p.ign)
      if (ignErr) errs[`${p.id}-ign`] = ignErr
      else if (!p.ign.trim
    
