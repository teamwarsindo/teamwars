"use client"

import { useMemo, useEffect, useRef } from 'react';
import { useTeamDetails } from "@/components/registration/hooks/use-team-details"
import { useRoster } from "@/components/registration/hooks/use-roster"
import { useRegistrationFlow } from "@/components/registration/hooks/use-registration-flow"

// 🚀 PERBAIKAN: Import tipe data dari file sentral yang baru kita buat
import type { PlayerState } from "@/components/registration/hooks/types"

import { TeamIdentity } from "@/components/registration/team-identity"
import { RosterSection } from "@/components/registration/roster-section"
import { ReviewModal } from "@/components/review-modal"
import { SuccessModal } from "@/components/success-modal"

// Kita biarkan initialData menggunakan any atau tipe khusus DB jika kamu punya
interface RegistrationFormProps {
  isEditMode?: boolean;
  initialData?: any; 
  editToken?: string;
}

export function RegistrationForm({ isEditMode = false, initialData, editToken = "" }: RegistrationFormProps) {
  const team = useTeamDetails()
  const roster = useRoster()
  
  const flow = useRegistrationFlow(team, roster, isEditMode, initialData?.namaTim || "", editToken)
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isEditMode && initialData && !hasInitialized.current) {
      team.setEmail(initialData.email || "");
      team.setNamaTim(initialData.namaTim || "");
      team.setHex(initialData.warna || "");
      
      team.setLogo({ url: initialData.logoTim, name: "logo-terkunci.png", size: 0 });
      team.setBukti({ url: initialData.buktiTransfer, name: "bukti-terkunci.jpg", size: 0 });
      
      // 🚀 PERBAIKAN: Kita beri tahu TypeScript bahwa hasil map ini adalah PlayerState[]
      const mappedPlayers: PlayerState[] = (initialData.players || []).map((p: any, index: number) => ({
        ...p,
        id: p.id || `player-${index}`, 
        namaLengkap: p.namaLengkap || "",
        ign: p.ign || "",
        discord: p.discord || "",
        duelId: p.duelId || p.idDuelLinks || "", 
      }));

      roster.setPlayers(mappedPlayers);
      hasInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialData]); 

  const hasChanges = useMemo(() => {
    if (!isEditMode || !initialData) return true; 

    const nameChanged = team.namaTim.trim() !== (initialData.namaTim || "").trim();
    const colorChanged = team.hex.toLowerCase() !== (initialData.warna || "").toLowerCase();

    // 🚀 PERBAIKAN: Hapus penggunaan (p: any). Karena roster.players sudah punya tipe PlayerState[], 
    // TypeScript sekarang otomatis tahu p itu apa. (Fitur auto-complete (Ctrl+Space) di VSCode mu akan nyala di sini!)
    const currentRoster = roster.players.map((p) => ({
      ign: p.ign.trim(),
      discord: p.discord.trim(),
      duelId: p.duelId.trim(),
      role: p.role
    }));

    // Di sini tetap any karena initialData murni JSON mentah dari Backend
    const originalRoster = (initialData.players || []).map((p: any) => ({
      ign: (p.ign || "").trim(),
      discord: (p.discord || "").trim(),
      duelId: (p.idDuelLinks || p.duelId || "").trim(),
      role: p.role
    }));

    const rosterChanged = JSON.stringify(currentRoster) !== JSON.stringify(originalRoster);

    return nameChanged || colorChanged || rosterChanged;
  }, [team.namaTim, team.hex, roster.players, isEditMode, initialData]);
  
  return (
    <>
      <form 
        id="registration-form" 
        onSubmit={(e) => {
          e.preventDefault();
          flow.handleReviewClick();
        }} 
        className="flex flex-col gap-6"
      >
        <TeamIdentity 
          {...team} 
          err={flow.err} 
          markTouched={flow.markTouched} 
          isEditMode={isEditMode}
        />

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

        <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
          <button
            type="submit" 
            disabled={!flow.canSubmit || (isEditMode && !hasChanges)}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {flow.isChecking 
              ? "Memindai Duplikat Data..." 
              : (isEditMode ? "Simpan Perubahan Roster" : "Konfirmasi Pendaftaran")
            }
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
