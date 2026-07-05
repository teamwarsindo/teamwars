"use client"

import { useTeamDetails } from "@/components/registration/hooks/use-team-details"
import { useRoster } from "@/components/registration/hooks/use-roster"
import { useRegistrationFlow } from "@/components/registration/hooks/use-registration-flow"

import { TeamIdentity } from "@/components/registration/team-identity"
import { RosterSection } from "@/components/registration/roster-section"
import { ReviewModal } from "@/components/review-modal"
import { SuccessModal } from "@/components/success-modal"
import { AlertIcon } from "@/components/icons" 


export function RegistrationForm() {
  const team = useTeamDetails()
  const roster = useRoster()
  const flow = useRegistrationFlow(team, roster)

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

          {/* ✅ BOX ERROR PRE-FLIGHT YANG CANTIK */}
          {flow.serverError && !flow.modalOpen && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive animate-in fade-in zoom-in-95">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Data Ditolak</p>
                <p className="text-sm">{flow.serverError}</p>
              </div>
            </div>
          )}
          
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
