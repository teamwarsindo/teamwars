import { useState, useEffect, useMemo } from "react"
import { STORAGE_KEY, countRole, findDuplicateFields, type FormState } from "@/lib/registration"
import { isValidEmail, isValidHex, isCompleteDuelId, validateRealName, validateTeamName, validateDiscord } from "@/lib/validators"
import Swal from "sweetalert2"

interface BackendError {
  field: string;
  message: string;
}

export function useRegistrationFlow(team: any, roster: any, isEditMode: boolean = false) {
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

  // --- LOCAL STORAGE DRAFT FUNCTIONS ---
  useEffect(() => {
    // Matikan fitur Local Storage sepenuhnya jika sedang dalam mode Edit
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
  }, [isEditMode])

  useEffect(() => {
    // Jangan simpan draft otomatis ke Local Storage jika di mode Edit
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
  // ⚡ RADAR DEBOUNCE UNIVERSAL & BYPASS CONTEXT
  // =========================================================================
  useEffect(() => {
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
          // Jika edit mode, beri tahu backend untuk mengabaikan data lama tim ini (Self-Exclusion)
          excludeSlug: isEditMode ? team.namaTim.trim() : undefined,
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
          setRawBackendErrors(result.errors || [])
        } else {
          setRawBackendErrors([])
        }
      } catch (error) {
        console.error("Gagal melakukan background check:", error)
      } finally {
        setIsChecking(false)
      }
    }

    if (isSmartPaste) {
      runPreFlightCheck()
      setIsSmartPaste(false) 
    } else {
      const timer = setTimeout(() => {
        runPreFlightCheck()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [team.namaTim, roster.players, isSmartPaste, isEditMode])

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

    Object.entries(mappedBackendErrors).forEach(([key, value]) => {
      errs[key] = value
    })

    return errs
  }, [team.email, team.namaTim, team.hex, team.logo, team.bukti, roster.players, duplicateFields, mappedBackendErrors])

  const canSubmit = Object.keys(fieldErrors).length === 0 && rosterRuleOk && !isChecking

  function err(key: string) {
    const e = fieldErrors[key]
    if (!e) return undefined
    if (duplicateFields.has(key)) return e
    if (mappedBackendErrors[key]) return e 
    if (submitAttempted || touchedFields[key]) return e
    return undefined
  }

  // =========================================================================
  // 🛑 LOGIKA PENANGANAN TOMBOL SUBMIT
  // =========================================================================
  async function handleReviewClick() {
    setSubmitAttempted(true)
    
    if (!canSubmit) {
      Swal.fire({
        title: isEditMode ? "Perubahan Ditahan!" : "Pendaftaran Ditahan!",
        text: "Ditemukan data yang duplikat atau belum lengkap. Silakan periksa kembali kolom input yang berwarna merah.",
        icon: "error",
        confirmButtonColor: "#AA1348",
        background: "#121212",
        color: "#ffffff"
      })
      
      document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    if (isEditMode) {
      // 🚀 JALUR EDIT: Langsung eksekusi penyimpanan ke database tanpa modal Preview
      handleSubmit();
    } else {
      // 📝 JALUR DAFTAR BARU: Buka modal Preview Review terlebih dahulu
      setServerError(null)
      setModalOpen(true)
    }
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
      
      const payload: any = {
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

      // Penentuan Target Endpoint API berdasarkan Mode
      let targetEndpoint = "/api/submit";
      
      if (isEditMode) {
        targetEndpoint = "/api/update-team";
        // Sisipkan token otorisasi dari URL path browser saat ini (contoh: /edit-team/xyz123)
        payload.token = window.location.pathname.split("/").pop(); 
      }
    
      const res = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    
      const result = await res.json()

      if (!res.ok || result.status === "error") {
        setSubmitting(false)
        const errMsg = result.error || result.message || "Terjadi kesalahan sistem yang tidak diketahui."
        setServerError(errMsg)
        
        // Alert tambahan khusus edit mode jika gagal
        if (isEditMode) Swal.fire("Gagal Disimpan!", errMsg, "error");
        return
      }

      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      setSubmitting(false)
      setModalOpen(false)
      setSuccess(true)
    
    } catch (error: any) {
      setSubmitting(false)
      const errMsg = error.message || "Gagal memproses data. Periksa koneksi internet Anda."
      setServerError(errMsg)
      
      if (isEditMode) Swal.fire("Kesalahan Jaringan", errMsg, "error");
    }
  }

  return {
    modalOpen, setModalOpen, submitting, serverError, 
    success, rosterRuleOk,
    canSubmit, isChecking, rawBackendErrors, 
    triggerSmartPasteBypass, 
    markTouched, markTouchedMultiple, err, handleReviewClick, handleSubmit
  }
}
