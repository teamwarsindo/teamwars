"use client"

import { useTeamDetails } from "@/components/registration/hooks/use-team-details"
import { useRoster } from "@/components/registration/hooks/use-roster"
import { useRegistrationFlow } from "@/components/registration/hooks/use-registration-flow"

import { TeamIdentity } from "@/components/registration/team-identity"
import { RosterSection } from "@/components/registration/roster-section"
import { ReviewModal } from "@/components/review-modal"
import { SuccessModal } from "@/components/success-modal"

export function RegistrationForm() {
  const team = useTeamDetails()
  const roster = useRoster()
  const flow = useRegistrationFlow(team, roster)

  return (
    <>
      <form id="registration-form" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
        
        {/* Input Identitas Tim & Kontak Kapten */}
        <TeamIdentity 
          {...team} 
          err={flow.err} 
          markTouched={flow.markTouched} 
          isChecking={flow.isChecking} // Kirim status loading jika lu butuh nampilin spiner kecil di kolom nama tim
        />

        {/* Seksi Susunan Roster Pemain */}
        <RosterSection 
          {...roster} 
          rosterRuleOk={flow.rosterRuleOk}
          handleSmartPaste={() => {
            // Jalankan ekstraksi teks bawaan regex lu
            roster.handleSmartPaste(flow.markTouchedMultiple)
            // DETIK ITU JUGA: Tendang sinyal bypass jalur tol biar langsung nembak API Pre-Flight!
            flow.triggerSmartPasteBypass()
          }}
          err={flow.err} 
          markTouched={flow.markTouched} 
        />

        {/* Tombol Konfirmasi Pendaftaran Akhir */}
        <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
          <button
            type="button" 
            onClick={flow.handleReviewClick} 
            // Kunci tombol submit secara visual jika radar mendeteksi data kotor
            disabled={!flow.canSubmit} 
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {flow.isChecking ? "Memindai Duplikat Data..." : "Konfirmasi Pendaftaran"}
          </button>
        </section>
      </form>

      {/* --- KUMPULAN MODAL INTERAKTIF --- */}
      
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
    </>
  )
}
