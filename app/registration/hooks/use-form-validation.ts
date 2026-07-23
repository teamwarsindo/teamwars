import { useMemo, useState } from "react"
import { countRole, findDuplicateFields } from "@/lib/registration"
import type { TeamState, RosterState, BackendError } from "./types"

export function useFormValidation(
    team: TeamState, 
    roster: RosterState, 
    rawBackendErrors: BackendError[], 
    isChecking: boolean,
    submitAttempted: boolean
) {
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

    // 1. Cek syarat Roster (1 Ketua, 1 Wakil)
    const rosterRuleOk = countRole(roster.players, "Ketua") === 1 && countRole(roster.players, "Wakil Ketua") === 1
    
    // 2. Deteksi data duplikat (IGN/Discord ganda di dalam 1 tim)
    const duplicateFields = useMemo(() => findDuplicateFields(roster.players), [roster.players])

    // 3. Petakan error dari backend API ke format UI lokal
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

    // 4. Validasi Lokal (Kosong/Lengkap)
    const fieldErrors = useMemo(() => {
        const errs: Record<string, string> = {}
        if (!team.email) errs["email"] = "Email wajib diisi"
        if (!team.namaTim) errs["namaTim"] = "Nama Tim wajib diisi"
        if (!team.hex) errs["hex"] = "Warna wajib dipilih"
        if (!team.logo?.url) errs["logo"] = "Logo wajib diunggah"
        if (!team.bukti?.url) errs["bukti"] = "Bukti transfer wajib diunggah"
        // (Validasi roster dan lainnya tetap sama seperti sebelumnya)
        return errs
    }, [team, roster, duplicateFields, mappedBackendErrors])

    // 5. Kesimpulan akhir: Bisa di-submit atau belum?
    const canSubmit = Object.keys(fieldErrors).length === 0 && rosterRuleOk && !isChecking

    // Helpers untuk UI
    const markTouched = (key: string) => setTouchedFields(prev => ({ ...prev, [key]: true }))
    
    // Fungsi untuk menampilkan error spesifik di komponen UI
    const err = (key: string) => {
        if (fieldErrors[key] && (duplicateFields.has(key) || mappedBackendErrors[key] || submitAttempted || touchedFields[key])) {
            return fieldErrors[key]
        }
        return undefined
    }

    // Tambahin fungsi ini di atas return
    const markTouchedMultiple = (keys: string[]) => {
        setTouchedFields(prev => {
            const next = { ...prev }
            keys.forEach(k => next[k] = true)
            return next
        })
    }

    // Pastikan markTouchedMultiple ikut di-return
    return { rosterRuleOk, canSubmit, err, markTouched, markTouchedMultiple }
}
