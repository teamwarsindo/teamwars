import { useState, useMemo, useEffect } from "react"
import Swal from "sweetalert2"
import { STORAGE_KEY, countRole, findDuplicateFields } from "@/lib/registration"
import { isValidEmail, isValidHex, validateDuelId, validateRealName,
        validateTeamName, validateDiscord, validateIGN, sanitizeTeamName,
        sanitizeDiscord, sanitizeIGN, toProperCase, formatDuelId } from "@/lib/validators"
import { useDraftStorage } from "./use-draft-storage"     
import { usePreFlightCheck } from "./use-pre-flight-check" 
import { TeamState, RosterState, PlayerState, BackendError } from "./types"

export function useRegistrationFlow(
  team: TeamState, 
  roster: RosterState, 
  isEditMode: boolean = false, 
  originalTeamName: string = "",
  editToken: string = ""
//  isTester: boolean = false 
) {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSmartPaste, setIsSmartPaste] = useState(false)

  // 1. Panggil fungsionalitas Draft Storage
  const { isDraftLoaded } = useDraftStorage(team, roster, isEditMode)

  // 🚀 PERBAIKAN: AGGRESSIVE VALIDATION UNIVERSAL (Real-time di setiap ketikan)
  // Begitu input memiliki setidaknya 1 huruf, gembok error langsung dibuka.
  useEffect(() => {
    const activeFields: Record<string, boolean> = {}

    if (team.email) activeFields.email = true
    if (team.namaTim) activeFields.namaTim = true
    if (team.hex) activeFields.hex = true

    roster.players.forEach((p) => {
      if (p.namaLengkap) activeFields[`${p.id}-namaLengkap`] = true
      if (p.discord) activeFields[`${p.id}-discord`] = true
      if (p.ign) activeFields[`${p.id}-ign`] = true
      if (p.duelId) activeFields[`${p.id}-duelId`] = true
    })

    if (Object.keys(activeFields).length > 0) {
      setTouchedFields((prev) => ({ ...prev, ...activeFields }))
    }
  }, [team.email, team.namaTim, team.hex, roster.players])

  // 2. Panggil fungsionalitas Pre-Flight (API Check) - 🎯 DITAMBAHKAN editToken DI SINI
  const { isChecking, rawBackendErrors } = usePreFlightCheck(
    team.namaTim, roster.players, isEditMode, originalTeamName, isSmartPaste, setIsSmartPaste, editToken
  )

  const rosterRuleOk = countRole(roster.players, "Ketua") === 1 && countRole(roster.players, "Wakil Ketua") === 1
  const duplicateFields = useMemo(() => findDuplicateFields(roster.players), [roster.players])

  const mappedBackendErrors = useMemo(() => {
    const mapped: Record<string, string> = {}
    rawBackendErrors.forEach((err) => {
      if (err.field === "namaTim") mapped["namaTim"] = err.message
      else if (err.field.startsWith("players.")) {
        const parts = err.field.split(".")
        const player = roster.players[parseInt(parts[1], 10)]
        const type = parts[2] === "idDuelLinks" ? "duelId" : parts[2]
        if (player) mapped[`${player.id}-${type}`] = err.message
      }
    })
    return mapped
  }, [rawBackendErrors, roster.players])

  // 3. Gabungkan Semua Validasi
  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    
    if (!team.email.trim()) errs.email = "Email wajib diisi."
    else if (!isValidEmail(team.email)) errs.email = "Format email tidak valid."
    
    const teamErr = validateTeamName(team.namaTim); 
    if (teamErr) errs.namaTim = teamErr;
    
    if (!isValidHex(team.hex)) errs.hex = "Format hex tidak valid (#RRGGBB)."
    if (!team.logo?.url) errs.logo = "Logo tim wajib diunggah hingga selesai."
    if (!team.bukti?.url) errs.bukti = "Bukti transfer wajib diunggah hingga selesai."

    roster.players.forEach((p) => {
      const nameErr = validateRealName(p.namaLengkap); 
      if (nameErr) errs[`${p.id}-namaLengkap`] = nameErr;

      const discordErr = validateDiscord(p.discord); 
      if (discordErr) errs[`${p.id}-discord`] = discordErr;

      const ignErr = validateIGN(p.ign); 
      if (ignErr) errs[`${p.id}-ign`] = ignErr;

      const duelIdErr = validateDuelId(p.duelId);
      if (duelIdErr) errs[`${p.id}-duelId`] = duelIdErr;
    })

    duplicateFields.forEach((key) => { errs[key] = "Data ganda dalam tim" })
    Object.entries(mappedBackendErrors).forEach(([key, value]) => { errs[key] = value })

    return errs
  }, [team.email, team.namaTim, team.hex, team.logo, team.bukti, roster.players, duplicateFields, mappedBackendErrors])

  const canSubmit = Object.keys(fieldErrors).length === 0 && rosterRuleOk && !isChecking

  // Helpers
  const triggerSmartPasteBypass = () => setIsSmartPaste(true)
  const markTouched = (key: string) => setTouchedFields(prev => ({ ...prev, [key]: true }))
  const markTouchedMultiple = (keys: Record<string, boolean>) => setTouchedFields(prev => ({ ...prev, ...keys }))
  const err = (key: string) => fieldErrors[key] && (duplicateFields.has(key) || mappedBackendErrors[key] || submitAttempted || touchedFields[key]) ? fieldErrors[key] : undefined

  // 4. Tombol Submit & Fetch
  async function handleReviewClick() {
    setSubmitAttempted(true)
    if (!canSubmit) {
      Swal.fire({ title: "Ditahan!", text: "Periksa kolom merah.", icon: "error", background: "#121212", color: "#fff" })
      document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    if (isEditMode) handleSubmit()
    else { setServerError(null); setModalOpen(true) }
  }

  async function handleSubmit() {
    setSubmitting(true); setServerError(null)
    try {
      if (!team.logo?.url || !team.bukti?.url) {
        setSubmitting(false); setServerError("Gambar belum selesai diunggah.")
        return
      }

      // Ambil channel ID dari URL jika ada
      let testChannelId = undefined;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        testChannelId = params.get("channel") || undefined;
      }
      
      const payload: any = {
        email: team.email.trim(), namaTim: sanitizeTeamName(team.namaTim), warna: team.hex.toUpperCase(),
        logoTim: team.logo.url, buktiTransfer: team.bukti.url,
        players: roster.players.map(p => ({ role: p.role, namaLengkap: toProperCase(p.namaLengkap), discord: sanitizeDiscord(p.discord), ign: sanitizeIGN(p.ign), idDuelLinks: formatDuelId(p.duelId) })),
        createdAt: new Date().toISOString(),
        channelId: testChannelId
      }
      if (isEditMode && editToken) payload.token = editToken

      // LOGIKA ROUTING API:
      let apiEndpoint = "/api/registration"; 
      if (isEditMode) {
        apiEndpoint = "/api/edit-team";
      }
            
      const res = await fetch(apiEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
    
      if (!res.headers.get("content-type")?.includes("application/json")) throw new Error(`Server Error (${res.status}).`)

      const result = await res.json()
      if (!res.ok || result.status === "error") {
        setSubmitting(false); setServerError(result.error || result.message || "Kesalahan sistem.")
        if (isEditMode) Swal.fire("Gagal Disimpan!", result.error, "error"); return
      }

      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      setSubmitting(false); setModalOpen(false); setSuccess(true)
    } catch (error: any) {
      setSubmitting(false); setServerError(error.message)
      if (isEditMode) Swal.fire("Kesalahan Sistem", error.message, "error")
    }
  }

  return { modalOpen, setModalOpen, submitting, serverError, success, rosterRuleOk, canSubmit, isChecking, rawBackendErrors, triggerSmartPasteBypass, markTouched, markTouchedMultiple, err, handleReviewClick, handleSubmit }
      }
