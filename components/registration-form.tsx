"use client"

import { useTeamDetails } from "./hooks/use-team-details"
import { useRoster } from "./hooks/use-roster"
import { useRegistrationFlow } from "./hooks/use-registration-flow"

import { TeamIdentity } from "./team-identity"
import { RosterSection } from "./roster-section"
import { ReviewModal } from "@/components/review-modal"
import { SuccessModal } from "@/components/success-modal"

export function RegistrationForm() {
  // 1. Inisialisasi masing-masing hook
  const team = useTeamDetails()
  const roster = useRoster()
  const flow = useRegistrationFlow(team, roster)

  return (
    <>
      <form id="registration-form" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
        
        {/* Lempar data Team */}
        <TeamIdentity 
          {...team} 
          err={flow.err} 
          markTouched={flow.markTouched} 
        />

        {/* Lempar data Roster */}
        <RosterSection 
          {...roster} 
          rosterRuleOk={flow.rosterRuleOk}
          handleSmartPaste={() => roster.handleSmartPaste(flow.markTouchedMultiple)}
          err={flow.err} 
          markTouched={flow.markTouched} 
        />

        <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
          <button type="button" onClick={flow.handleReviewClick} className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground">
            Konfirmasi Pendaftaran
          </button>
        </section>
      </form>

      {/* Modal Sukses & Review */}
    </>
  )
}
