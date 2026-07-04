import { useState, useEffect, useMemo } from "react"
import { STORAGE_KEY, countRole, findDuplicateFields, type FormState } from "@/lib/registration"
import { isValidEmail, isValidHex, isCompleteDuelId, validateRealName, validateTeamName, validateDiscord } from "@/lib/validators"

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
    return errs
  }, [team.email, team.namaTim, team.hex, team.logo, team.bukti, roster.players, duplicateFields])

  const canSubmit = Object.keys(fieldErrors).length === 0 && rosterRuleOk
  
  function err(key: string) {
    const e = fieldErrors[key]
    if (!e) return undefined
    if (duplicateFields.has(key)) return e
    if (submitAttempted || touchedFields[key]) return e
    return undefined
  }

  function handleReviewClick() {
    setSubmitAttempted(true)
    if (!canSubmit) {
      document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    setServerError(null)
    setModalOpen(true)
  }

  // Potongan di dalam useRegistrationFlow
  async function handleSubmit() {
    setSubmitting(true);
    setServerError(null);

    try {
      // PENGAMAN: Pastikan URL beneran udah ada sebelum nembak API
      if (!team.logo?.url || !team.bukti?.url) {
        setSubmitting(false);
        setServerError("Gambar belum selesai diunggah. Silakan tunggu sebentar atau upload ulang.");
        return;
      }
      // payload sekarang ringan banget, karena logoTim dan buktiTransfer cuma isi string URL
      const payload = {
        email: team.email.trim(),
        namaTim: team.namaTim.trim(),
        warna: team.hex,
        logoTim: team.logo.url, // Ini isinya "https://res.cloudinary.com/..."
        buktiTransfer: team.bukti.url, // Ini isinya "https://res.cloudinary.com/..."
        players: roster.players.map((p: any) => ({
          role: p.role,
          namaLengkap: p.namaLengkap.trim(),
          discord: p.discord.trim(),
          ign: p.ign.trim(),
          idDuelLinks: p.duelId,
        })),
        createdAt: new Date().toISOString()
      };
    
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    
      const result = await res.json();

      if (!res.ok || result.status === "error") {
        setSubmitting(false);
        setServerError(result.message || "Terjadi kesalahan saat menyimpan ke Database.");
        return;
      }

      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      setSubmitting(false);
      setModalOpen(false);
      setSuccess(true);
    
    } catch (error: any) {
      setSubmitting(false);
      setServerError(error.message || "Gagal memproses pendaftaran. Periksa koneksi internet Anda.");
    }
  }

  return {
    modalOpen, setModalOpen, submitting, serverError, success, rosterRuleOk,
    canSubmit,
    markTouched, markTouchedMultiple, err, handleReviewClick, handleSubmit
  }
}
