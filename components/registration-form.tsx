"use client"

import { useEffect, useRef } from "react" // 👈 Tambahkan useRef
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
  editToken?: string;
}

export function RegistrationForm({ isEditMode = false, initialData }: RegistrationFormProps) {
  const team = useTeamDetails()
  const roster = useRoster()
  const flow = useRegistrationFlow(team, roster, isEditMode)

  // ⚡ 1. Buat gembok penanda apakah data sudah diisi atau belum
  const hasInitialized = useRef(false);

  useEffect(() => {
    // ⚡ 2. Cek gembok: Kalau sudah pernah diisi (!hasInitialized.current), jangan jalan lagi!
    if (isEditMode && initialData && !hasInitialized.current) {
      team.setEmail(initialData.email || "");
      team.setNamaTim(initialData.namaTim || "");
      team.setHex(initialData.warna || "");
      
      team.setLogo({ url: initialData.logoTim, name: "logo-terkunci.png", size: 0 });
      team.setBukti({ url: initialData.buktiTransfer, name: "bukti-terkunci.jpg", size: 0 });
      
      roster.setPlayers(initialData.players || []);
      
      // Kunci gemboknya setelah sukses mengisi data
      hasInitialized.current = true;
    }
  }, [isEditMode, initialData]); // Dependencies ini sekarang aman karena dilindungi useRef

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
