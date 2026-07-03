import { useState, useEffect, useMemo } from "react"
import { STORAGE_KEY, countRole, findDuplicateFields, type FormState } from "@/lib/registration"
import { isValidEmail, isValidHex, isCompleteDuelId, validateRealName, validateTeamName, validateDiscord } from "@/lib/validators"

// Hook ini menerima hasil return dari dua hook sebelumnya
export function useRegistrationFlow(team: any, roster: any) {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDraftLoaded, setIsDraftLoaded] = useState(false)

  function markTouched(key: string) {
    setTouchedFields((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }

  function markTouchedMultiple(keys: Record<string, boolean>) {
    setTouchedFields((prev) => ({ ...prev, ...keys }))
  }

  // --- LOGIKA DRAFT (LOCAL STORAGE) ---
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

  // --- LOGIKA VALIDASI ---
  const rosterRuleOk = countRole(roster.players, "Ketua") === 1 && countRole(roster.players, "Wakil Ketua") === 1
  const duplicateFields = useMemo(() => findDuplicateFields(roster.players), [roster.players])

  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    if (!team.email.trim()) errs.email = "Email wajib diisi."
    else if (!isValidEmail(team.email)) errs.email = "Format email tidak valid."
    
    // ... (Validasi namaTim, hex, logo, bukti sama persis) ...

    roster.players.forEach((p: any) => {
      // ... (Validasi masing-masing pemain sama persis) ...
    })
    return errs
  }, [team, roster.players, duplicateFields])

  const canSubmit = Object.keys(fieldErrors).length === 0 && rosterRuleOk
  
  function err(key: string) {
    const e = fieldErrors[key]
    if (!e) return undefined
    if (duplicateFields.has(key) || submitAttempted || touchedFields[key]) return e
    return undefined
  }

  // --- LOGIKA SUBMIT ---
  function handleReviewClick() {
    setSubmitAttempted(true)
    if (!canSubmit) {
      document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    setModalOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setServerError(null)
    try {
      // ... (Logika Fetch API sama persis seperti sebelumnya) ...
      setSubmitting(false)
      setModalOpen(false)
      setSuccess(true)
      localStorage.removeItem(STORAGE_KEY)
    } catch (error: any) {
      setSubmitting(false)
      setServerError(error.message)
    }
  }

  return {
    modalOpen, setModalOpen, submitting, serverError, success, rosterRuleOk,
    markTouched, markTouchedMultiple, err, handleReviewClick, handleSubmit
  }
}
