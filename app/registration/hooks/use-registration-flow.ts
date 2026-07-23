import { useState } from "react"
import Swal from "sweetalert2"
import { useDraftStorage } from "./use-draft-storage"
import { usePreFlightCheck } from "./use-pre-flight-check"
import { useFormValidation } from "./use-form-validation"
import type { TeamState, RosterState } from "./types"

export function useRegistrationFlow(
    team: TeamState, 
    roster: RosterState, 
    isEditMode: boolean = false, 
    originalTeamName: string = "", 
    editToken: string = ""
) {
    // State UI & Flow
    const [submitAttempted, setSubmitAttempted] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isSmartPaste, setIsSmartPaste] = useState(false)

    // 1. Storage & Pre-flight Hooks
    useDraftStorage(team, roster, isEditMode)
    const { isChecking, rawBackendErrors } = usePreFlightCheck(
        team.namaTim, roster.players, isEditMode, originalTeamName, isSmartPaste, setIsSmartPaste
    )

    // 2. Validation Hook (Hook baru yang kita buat di atas)
    const { rosterRuleOk, canSubmit, err, markTouched, markTouchedMultiple } = useFormValidation(
        team, roster, rawBackendErrors, isChecking, submitAttempted
    )

    const triggerSmartPasteBypass = () => {
        setIsSmartPaste(true) // pastikan setIsSmartPaste udah ada di state atas lu
    }

    // 3. Aksi ketika tombol "Review" ditekan
    async function handleReviewClick() {
        setSubmitAttempted(true)
        if (!canSubmit) {
            Swal.fire({ title: "Ditahan!", text: "Periksa kolom merah.", icon: "error" })
            document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" })
            return
        }
        
        if (isEditMode) handleSubmit() 
        else {
            setServerError(null)
            setModalOpen(true)
        }
    }

    // 4. Aksi Submit ke Backend
    async function handleSubmit() {
        setSubmitting(true)
        setServerError(null)
        // Logika fetch API POST ke `/api/registration` lu yang panjang itu ditaruh di sini
        // ...
    }

    return { 
        modalOpen, setModalOpen, submitting, serverError, success, 
        rosterRuleOk, canSubmit, isChecking, rawBackendErrors, 
        markTouched, markTouchedMultiple, triggerSmartPasteBypass, // 👈 INI YANG BIKIN ERROR HILANG
        err, handleReviewClick, handleSubmit 
    }
}
