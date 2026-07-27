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
  isAdminMode?: boolean; 
}

export function RegistrationForm({ 
  isEditMode = false, 
  initialData, 
  editToken = "", 
  isAdminMode = false 
}: RegistrationFormProps) {
  const team = useTeamDetails()
  const roster = useRoster()
  
  const flow = useRegistrationFlow(team, roster, isEditMode, initialData?.namaTim || "", editToken)
  const hasInitialized = useRef(false);
  const hasAutoFilled = useRef(false);

  // 1. useEffect bawaan untuk Edit Mode
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

  // 2. TAMBAHAN: Script Auto-Fill untuk Testing via URL
  useEffect(() => {
    if (typeof window !== 'undefined' && !isEditMode && !hasAutoFilled.current) {
      const params = new URLSearchParams(window.location.search);
      
      if (params.get('test') === 'auto') {
        const randomStr = Math.floor(Math.random() * 1000);
        
        team.setEmail(`anisya2402@gmail.com`);
        team.setNamaTim(`TIM TESTER ${randomStr}`);
        team.setHex(`#FF5${randomStr}`); 
        
        team.setLogo({ url: "https://teamwars.web.id/dummy-logo.png", name: "dummy-logo.png", size: 1024 });
        team.setBukti({ url: "https://teamwars.web.id/dummy-bukti.jpg", name: "dummy-bukti.jpg", size: 1024 });
        
        roster.setPlayers([
  { 
    id: "test-1", 
    namaLengkap: "Tester Satu", 
    ign: `Tester1_${randomStr}`, 
    discord: "tsaqif.mtz", 
    duelId: `111-222-${randomStr}`, 
    role: "Ketua" 
  },
  { 
    id: "test-2", 
    namaLengkap: "Tester Dua", 
    ign: `Tester2_${randomStr}`, 
    discord: "achmadns20", 
    duelId: `222-333-${randomStr}`, 
    role: "Wakil Ketua" 
  },
  { 
    id: "test-3", 
    namaLengkap: "Tester Tiga", 
    ign: `Tester3_${randomStr}`, 
    discord: "shinryuki", 
    duelId: `333-444-${randomStr}`, 
    role: "Anggota" 
  },
  { 
    id: "test-4", 
    namaLengkap: "Tester Empat", 
    ign: `Tester4_${randomStr}`, 
    discord: "natsu_24", 
    duelId: `444-555-${randomStr}`, 
    role: "Anggota" 
  },
  { 
    id: "test-5", 
    namaLengkap: "Tester Lima", 
    ign: `Tester5_${randomStr}`, 
    discord: "haraheta1", 
    duelId: `555-666-${randomStr}`, 
    role: "Anggota" 
  },
]);
        hasAutoFilled.current = true; 
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const hasChanges = useMemo(() => {
    if (!isEditMode || !initialData) return true; 

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

    return nameChanged || colorChanged || rosterChanged || emailChanged;
  }, [team.email, team.namaTim, team.hex, roster.players, isEditMode, initialData]);

  const handleSyncDiscord = async () => {
    // Buat format slug tim persis seperti di backend
    const teamSlug = team.namaTim
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    const response = await fetch('/api/admin/sync-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamSlug }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Terjadi kesalahan sistem saat sinkronisasi.");
    }
  };
  
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
          isAdminMode={isAdminMode} 
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
          isAdminMode={isAdminMode} 
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
        onSync={!isEditMode ? handleSyncDiscord : undefined} 
      />
    </>
  )
}
