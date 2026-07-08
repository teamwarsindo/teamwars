"use client"

import { useEffect } from "react"
import { useTeamDetails } from "@/components/registration/hooks/use-team-details"
import { useRoster } from "@/components/registration/hooks/use-roster"
import { useRegistrationFlow } from "@/components/registration/hooks/use-registration-flow"

import { TeamIdentity } from "@/components/registration/team-identity"
import { RosterSection } from "@/components/registration/roster-section"
import { ReviewModal } from "@/components/review-modal"
import { SuccessModal } from "@/components/success-modal"

interface RegistrationFormProps {
  isEditMode?: boolean;
  initialData?: any;
}

export function RegistrationForm({ isEditMode = false, initialData }: RegistrationFormProps) {
  const team = useTeamDetails()
  const roster = useRoster()
  // Lempar isEditMode ke flow agar hook tahu harus bypass local storage & ubah target API
  const flow = useRegistrationFlow(team, roster, isEditMode)

  // Isi data form secara otomatis jika dalam mode edit dan initialData dari DB tersedia
  useEffect(() => {
    if (isEditMode && initialData) {
      team.setEmail(initialData.email || "");
      team.setNamaTim(initialData.namaTim || "");
      team.setHex(initialData.warna || "");
      // Mockup file untuk bypass validasi frontend karena gambar tidak bisa diedit
      team.setLogo({ url: initialData.logoTim, name: "logo-terkunci.png", size: 0 });
      team.setBukti({ url: initialData.buktiTransfer, name: "bukti-terkunci.jpg", size: 0 });
      roster.setPlayers(initialData.players || []);
    }
  }, [isEditMode, initialData]);

  return (
    <>
      <form id="registration-form" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
        
        {/* Input Identitas Tim & Kontak Kapten */}
        <TeamIdentity 
          {...team} 
          err={flow.err} 
          markTouched={flow.markTouched} 
          isEditMode={isEditMode}
        />

        {/* Seksi Susunan Roster Pemain */}
        <RosterSection 
          {...roster} 
          rosterRuleOk={flow.rosterRuleOk}
          handleSmartPaste={() => {
            roster.handleSmartPaste(flow.markTouchedMultiple)
            flow.triggerSmartPasteBypass()
          }}
          err={flow.err} 
          markTouched={flow.markTouched} 
          isEditMode={isEditMode}
        />

        {/* Tombol Eksekusi Akhir */}
        <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
          <button
            type="button" 
            onClick={flow.handleReviewClick} 
            disabled={!flow.canSubmit} 
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {flow.isChecking 
              ? "Memindai Duplikat Data..." 
              : (isEditMode ? "Simpan Perubahan Roster" : "Konfirmasi Pendaftaran")
            }
          </button>
        </section>
      </form>

      {/* --- KUMPULAN MODAL INTERAKTIF --- */}
      
      {/* Review Modal hanya akan dipanggil oleh hook jika BUKAN mode edit */}
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
        isEditMode={isEditMode}
      />
      
      <SuccessModal 
        open={flow.success} 
        onClose={() => window.location.reload()} 
        namaTim={team.namaTim} 
        isEditMode={isEditMode}
      />
    </>
  )
}
