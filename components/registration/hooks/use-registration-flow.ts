import { useState, useEffect, useMemo } from "react"
import { STORAGE_KEY, countRole, findDuplicateFields, type FormState } from "@/lib/registration"
import { isValidEmail, isValidHex, isCompleteDuelId, validateRealName, validateTeamName, validateDiscord } from "@/lib/validators"
import Swal from "sweetalert2" // Import SweetAlert2 sebagai Gatekeeper resmi

interface BackendError {
  field: string;
  message: string;
}

export function useRegistrationFlow(team: any, roster: any) {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // State error tunggal dipertahankan khusus untuk error pas proses akhir submit di ReviewModal
  const [serverError, setServerError] = useState<string | null>(null)
  
  // ✅ STATE BARU: Menampung object error massal mentah dari database backend
  const [rawBackendErrors, setRawBackendErrors] = useState<BackendError[]>([])
  
  // ✅ STATE BARU: Flag pemicu jalur tol bypass untuk Smart Paste
  const [isSmartPaste, setIsSmartPaste] = useState(false)
  // ✅ STATE BARU: Indikator jika radar backend sedang sibuk memindai
  const [isChecking, setIsChecking] = useState(false)

  const [success, setSuccess] = useState(false)
  const [isDraftLoaded, setIsDraftLoaded] = useState(false)

  function markTouched(key: string) {
    setTouchedFields((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }

  function markTouchedMultiple(keys: Record<string, boolean>) {
    setTouchedFields((prev) => ({ ...prev, ...keys }))
  }

  // Fungsi pembantu untuk memicu jalur cepat (Bypass Debounce) dari komponen luar
  function triggerSmartPasteBypass() {
    setIsSmartPaste(true)
  }

  // --- LOCAL STORAGE DRAFT FUNCTIONS ---
  useEffect(() => {
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
  }, [])

  useEffect(() => {
    if (!isDraftLoaded) return
    const draft: FormState = { email: team.email, namaTim: team.namaTim, hex: team.hex, players: roster.players }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) } catch {}
  }, [team.email, team.namaTim, team.hex, roster.players, isDraftLoaded])

  const rosterRuleOk = countRole(roster.players, "Ketua") === 1 && countRole(roster.players, "Wakil Ketua") === 1
  const duplicateFields = useMemo(() => findDuplicateFields(roster.players), [roster.players])

  // =========================================================================
  // 🧠 THE TRANSLATOR: Menerjemahkan index backend (0,1,2) ke UUID Frontend
  // =========================================================================
  const mappedBackendErrors = useMemo(() => {
    const mapped: Record<string, string> = {}
    
    rawBackendErrors.forEach((err) => {
      if (err.field === "namaTim") {
        mapped["namaTim"] = err.message
      } else if (err.field.startsWith("players.")) {
        // Format backend: players.[index].[jenis_kolom] -> Contoh: players.0.ign
        const parts = err.field.split(".")
        const index = parseInt(parts[1], 10)
        const type = parts[2]
        
        // Sesuaikan nama field 'idDuelLinks' dari backend ke 'duelId' milik frontend
        const frontendType = type === "idDuelLinks" ? "duelId" : type
        const player = roster.players[index]
        
        if (player) {
          // Hasil akhir: "UUID_PLAYER-ign" atau "UUID_PLAYER-discord"
          mapped[`${player.id}-${frontendType}`] = err.message
        }
      }
    })
    
    return mapped
  }, [rawBackendErrors, roster.players])

  // =========================================================================
  // ⚡ RADAR DEBOUNCE UNIVERSAL & BYPASS CONTEXT
  // =========================================================================
  useEffect(() => {
    // Jika nama tim masih kosong, bersihkan semua list error karena tidak ada yang perlu dicek
    if (!team.namaTim.trim()) {
      setRawBackendErrors([])
      return
    }

    const runPreFlightCheck = async () => {
      setIsChecking(true)
      try {
        const preFlightPayload = {
          isPreFlight: true,
          namaTim: team.namaTim.trim(),
          players: roster.players.map((p: any) => ({
            ign: p.ign.trim(),
            discord: p.discord.trim(),
            idDuelLinks: p.duelId,
          }))
        }

        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preFlightPayload),
        })

        const result = await res.json()

        if (!res.ok || !result.success) {
          // Tangkap array objek error massal dari backend baru lu
          setRawBackendErrors(result.errors || [])
        } else {
          // Bersih bebas error duplikat
          setRawBackendErrors([])
        }
      } catch (error) {
        console.error("Gagal melakukan background check:", error)
      } finally {
        setIsChecking(false)
      }
    }

    if (isSmartPaste) {
      // 🏎️ JALUR TOL: Efek samping dari tombol Smart Paste, langsung tembak di milidetik ke-0!
      runPreFlightCheck()
      setIsSmartPaste(false) // Matikan flag bypass
    } else {
      // ⏱️ JALUR DEBOUNCE: Pengetikan manual biasa, pasang timer jeda 500ms
      const timer = setTimeout(() => {
        runPreFlightCheck()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [team.namaTim, roster.players, isSmartPaste])

  // =========================================================================
  // 🛡️ COMPREHENSIVE VALIDATION MERGER (Mengawinkan Error Lokal & Backend)
  // =========================================================================
  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    
    // A. Validasi Aturan Lokal
    if (!team.email.trim()) errs.email = "Email wajib diisi."
    else if (!isValidEmail(team.email)) errs.email = "Format email tidak valid."
    
    const teamErr = validateTeamName(team.namaTim)
    if (teamErr) errs.namaTim = teamErr
    else if (!team.namaTim.trim()) errs.namaTim = "Nama Tim wajib diisi."
    
    if (!isValidHex(team.hex)) errs.hex = "Format hex tidak valid (#RRGGBB)."
    if (!team.logo) errs.logo = "Logo tim wajib diunggah."
    if (!team.bukti) errs.bukti = "Bukti transfer wajib diunggah."

    roster.players.forEach((p: any) => {
      const nameErr = validateRealName(p.namaLengkap)
      if (nameErr) errs[`${p.id}-namaLengkap`] = nameErr

      const discordErr = validateDiscord(p.discord)
      if (discordErr) errs[`${p.id}-discord`] = discordErr

      if (!p.ign.trim()) errs[`${p.id}-ign`] = "IGN wajib diisi."
      if (!p.duelId.trim()) errs[`${p.id}-duelId`] = "ID Duel Links wajib diisi."
      else if (!isCompleteDuelId(p.duelId)) errs[`${p.id}-duelId`] = "ID harus berformat xxx-xxx-xxx."
    })

    duplicateFields.forEach((key) => { errs[key] = "Data ganda dalam tim" })

    // B. SUNTIKKAN ERROR BACKEND KE ERROR LOKAL (Logika Pembuat Kotak Merah Otomatis)
    Object.entries(mappedBackendErrors).forEach(([key, value]) => {
      errs[key] = value
    })

    return errs
  }, [team.email, team.namaTim, team.hex, team.logo, team.bukti, roster.players, duplicateFields, mappedBackendErrors])

  // Tombol Submit hanya aktif jika tidak ada error (lokal & backend) dan radar sedang mati
  const canSubmit = Object.keys(fieldErrors).length === 0 && rosterRuleOk && !isChecking

  function err(key: string) {
    const e = fieldErrors[key]
    if (!e) return undefined
    if (duplicateFields.has(key)) return e
    if (mappedBackendErrors[key]) return e // Error dari DB langsung menyala merah tanpa nunggu disentuh!
    if (submitAttempted || touchedFields[key]) return e
    return undefined
  }

  // =========================================================================
  // 🛑 GATEKEEPER ALERT: Menghalau User Ngeyel dengan SweetAlert2
  // =========================================================================
  async function handleReviewClick() {
    setSubmitAttempted(true)
    
    if (!canSubmit) {
      // Jika masih ada kotak merah/loading, panggil SweetAlert Teguran Keras!
      Swal.fire({
        title: "Pendaftaran Ditahan!",
        text: "Ditemukan data yang duplikat atau belum lengkap. Silakan periksa kembali kolom input yang berwarna merah.",
        icon: "error",
        confirmButtonColor: "#AA1348",
        background: "#121212",
        color: "#ffffff"
      })
      
      document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    // Jika semua bersih 100%, buka modal review instan tanpa fetch lagi
    setServerError(null)
    setModalOpen(true)
  }

  // --- FINAL EKSEKUTOR SUBMIT FORM ---
  async function handleSubmit() {
    setSubmitting(true)
    setServerError(null)

    try {
      if (!team.logo?.url || !team.bukti?.url) {
        setSubmitting(false)
        const errMsg = "Gambar belum selesai diunggah. Silakan tunggu sebentar atau upload ulang."
        setServerError(errMsg)
        return
      }
      
      const payload = {
        email: team.email.trim(),
        namaTim: team.namaTim.trim(),
        warna: team.hex,
        logoTim: team.logo.url,
        buktiTransfer: team.bukti.url,
        players: roster.players.map((p: any) => ({
          role: p.role,
          namaLengkap: p.namaLengkap.trim(),
          discord: p.discord.trim(),
          ign: p.ign.trim(),
          idDuelLinks: p.duelId,
        })),
        createdAt: new Date().toISOString()
      }
    
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    
      const result = await res.json()

      if (!res.ok || result.status === "error") {
        setSubmitting(false)
        const errMsg = result.error || result.message || "Terjadi kesalahan sistem yang tidak diketahui."
        setServerError(errMsg)
        return
      }

      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      setSubmitting(false)
      setModalOpen(false)
      setSuccess(true)
    
    } catch (error: any) {
      setSubmitting(false)
      const errMsg = error.message || "Gagal memproses pendaftaran. Periksa koneksi internet Anda."
      setServerError(errMsg)
    }
  }

  return {
    modalOpen, setModalOpen, submitting, serverError, 
    success, rosterRuleOk,
    canSubmit, isChecking, rawBackendErrors, // Export variabel pendukung UI
    triggerSmartPasteBypass, // Export fungsi tol buat dipasang di tombol Ekstrak
    markTouched, markTouchedMultiple, err, handleReviewClick, handleSubmit
  }
}
