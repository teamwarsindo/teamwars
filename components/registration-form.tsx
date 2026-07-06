"use client"

import { useState, useEffect } from "react"
import { useTeamDetails } from "@/components/registration/hooks/use-team-details"
import { useRoster } from "@/components/registration/hooks/use-roster"
import { useRegistrationFlow } from "@/components/registration/hooks/use-registration-flow"

import { TeamIdentity } from "@/components/registration/team-identity"
import { RosterSection } from "@/components/registration/roster-section"
import { ReviewModal } from "@/components/review-modal"
import { SuccessModal } from "@/components/success-modal"
import { GlobalModal } from "@/components/global-modal" // ✅ Pastikan path import ini benar

export function RegistrationForm() {
  const team = useTeamDetails()
  const roster = useRoster()
  const flow = useRegistrationFlow(team, roster)

  // State khusus untuk mengontrol Modal Error Pre-Flight
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorList, setErrorList] = useState<string[]>([])

  // Pantau perubahan error dari backend / hook
  useEffect(() => {
    // Tangkap data 'serverMessages' (array) atau fallback ke 'serverError' (string)
    // Abaikan error ts jika flow.serverMessages belum ada di interface lu
    const messages = (flow as any).serverMessages || (flow.serverError ? [flow.serverError] : [])
    
    // Munculkan modal HANYA jika ada error dan bukan di dalam ReviewModal (Pre-Flight Check)
    if (messages.length > 0 && !flow.modalOpen) {
      setErrorList(messages)
      setShowErrorModal(true)
    }
  }, [flow.serverError, (flow as any).serverMessages, flow.modalOpen])

  return (
    <>
      <form id="registration-form" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
        
        <TeamIdentity 
          {...team} 
          err={flow.err} 
          markTouched={flow.markTouched} 
        />

        <RosterSection 
          {...roster} 
          rosterRuleOk={flow.rosterRuleOk}
          handleSmartPaste={() => roster.handleSmartPaste(flow.markTouchedMultiple)}
          err={flow.err} 
          markTouched={flow.markTouched} 
        />

        {/* Tombol Konfirmasi */}
        <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
          {/* BOX ERROR INLINE SUDAH KITA HAPUS DAN DIGANTI KE GLOBAL MODAL */}
          
          <button
            type="button" 
            onClick={flow.handleReviewClick} 
            disabled={!flow.canSubmit} 
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            Konfirmasi Pendaftaran
          </button>
        </section>
      </form>

      {/* --- KUMPULAN MODAL --- */}
      
      <ReviewModal 
        open={flow.modalOpen} 
        onClose={() => flow.setModalOpen(false)} 
        form={{ 
          email: team.email, 
          namaTim: team.namaTim, 
          hex: team.hex, 
          players: roster.players 
        }} 
        logo={team.logo} 
        bukti={team.bukti} 
        submitting={flow.submitting} 
        serverError={flow.serverError} 
        onConfirm={flow.handleSubmit} 
      />
      
      <SuccessModal 
        open={flow.success} 
        onClose={() => window.location.reload()} 
        namaTim={team.namaTim} 
      />

      {/* ✅ GLOBAL MODAL UNTUK ERROR PRE-FLIGHT (Menangkap Semua Error Sekaligus) */}
      <GlobalModal 
        open={showErrorModal}
        title="Pendaftaran Ditolak"
        messages={errorList}
        type="error"
        onClose={() => setShowErrorModal(false)}
      />
    </>
  )
}
