"use client"

import { useMemo, useEffect, useRef } from 'react';
import { useRoster } from "../hooks/use-roster"
import type { PlayerState } from "../hooks/types"
import { useTeamDetails } from "../hooks/use-team-details"
import { useRegistrationFlow } from "../hooks/use-registration-flow"
import { ReviewModal } from "../components/review-modal"
import { TeamIdentity } from "../components/team-identity"
import { SuccessModal } from "../components/success-modal"
import { RosterSection } from "../components/roster-section"

interface RegistrationFormProps {
  isEditMode?: boolean;
  initialData?: any; 
  editToken?: string;
  isAdminMode?: boolean; // 👈 1. Tambahkan interface untuk Admin Mode
//  isTester?: boolean; // 👈 1. Tambahkan ini
}

export function RegistrationForm({ 
  isEditMode = false, 
  initialData, 
  editToken = "", 
  isAdminMode = false // 👈 2. Beri nilai default false
//  isTester = false // 👈 2. Default false
}: RegistrationFormProps) {
  const team = useTeamDetails()
  const roster = useRoster()
  
  // 👈 3. Teruskan isTester ke hook flow
  const flow = useRegistrationFlow(team, roster, isEditMode, initialData?.namaTim || "", editToken)
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isEditMode && initialData && !hasInitialized.current) {
      team.setEmail(initialData.email || "");
      team.setNamaTim(initialData.namaTim || "");
      team.setHex(initialData.warna || "");
      
      team.setLogo({ url: initialData.logoTim, name: "logo-terkunci.png", size: 0 });
      team.setBukti({ url: initialData.buktiTransfer, name: "bukti-terkunci.jpg", size: 0 });
      
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

    // 👈 3. Tambahkan deteksi perubahan Email untuk Admin
    const emailChanged = team.email.trim() !== (initialData.email || "").trim();
    const nameChanged = team.namaTim.trim() !== (initialData.namaTim || "").trim();
    const colorChanged = team.hex.toLowerCase() !== (initialData.warna || "").toLowerCase();

    const currentRoster = roster.players.map((p) => ({
      ign: p.ign.trim(),
      discord: p.discord.trim(),
      duelId: p.duelId.trim(),
      role: p.role
    }));

    const originalRoster = (initialData.players || []).map((p: any) => ({
      ign: (p.ign || "").trim(),
      discord: (p.discord || "").trim(),
      duelId: (p.idDuelLinks || p.duelId || "").trim(),
      role: p.role
    }));

    const rosterChanged = JSON.stringify(currentRoster) !== JSON.stringify(originalRoster);

    // Jangan lupa masukkan emailChanged ke dalam return
    return nameChanged || colorChanged || rosterChanged || emailChanged;
  }, [team.email, team.namaTim, team.hex, roster.players, isEditMode, initialData]);
  
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
          isAdminMode={isAdminMode} // 👈 4. Lempar sinyal Admin ke komponen form (input)
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
          isAdminMode={isAdminMode} // 👈 5. PERBAIKAN: Lempar sinyal Admin ke RosterSection juga
        />

        <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
          <button
            type="submit" 
            disabled={!flow.canSubmit || (isEditMode && !hasChanges)}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {flow.isChecking 
              ? "Memindai Duplikat Data..." 
              : (isEditMode ? "Simpan Perubahan" : "Konfirmasi Pendaftaran")
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
