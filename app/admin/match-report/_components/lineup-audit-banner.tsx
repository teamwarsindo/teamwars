'use client';

import { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface LineupAuditBannerProps {
  teamName: string;
  validPlayers: PlayerLineupItem[];
}

export function LineupAuditBanner({ teamName, validPlayers }: LineupAuditBannerProps) {
  const audit = useMemo(() => {
    const missingPlayers = Math.max(0, 5 - validPlayers.length);
    let incompleteDeckCount = 0;
    const incompletePlayerNames: string[] = [];
    const missingSkillPlayers: string[] = [];

    validPlayers.forEach((p) => {
      const hasD1 = Boolean(p.deck1?.archetype?.trim());
      const hasD2 = Boolean(p.deck2?.archetype?.trim());
      const hasS1 = Boolean(p.deck1?.skill?.trim());
      const hasS2 = Boolean(p.deck2?.skill?.trim());

      // Pengecekan Deckloss
      if (!hasD1 && !hasD2) {
        incompleteDeckCount += 2;
        incompletePlayerNames.push(`${p.ign} (0/2 Deck)`);
      } else if (!hasD1 || !hasD2) {
        incompleteDeckCount += 1;
        incompletePlayerNames.push(`${p.ign} (1/2 Deck)`);
      }

      // Pengecekan Wajib Skill
      if (hasD1 && !hasS1) missingSkillPlayers.push(`${p.ign} (Deck 1)`);
      if (hasD2 && !hasS2) missingSkillPlayers.push(`${p.ign} (Deck 2)`);
    });

    const totalDecklossGames = missingPlayers * 2 + incompleteDeckCount;

    return {
      missingPlayers,
      incompleteDeckCount,
      incompletePlayerNames,
      missingSkillPlayers,
      totalDecklossGames,
      hasFatalError: missingSkillPlayers.length > 0,
      isClean: totalDecklossGames === 0 && missingSkillPlayers.length === 0,
    };
  }, [validPlayers]);

  if (audit.isClean) return null;

  return (
    <div className="space-y-2">
      {/* 1. FATAL ERROR: WAJIB SKILL JIKA DECK TERISI */}
      {audit.hasFatalError && (
        <div className="p-3.5 rounded-2xl border border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 font-black text-rose-700 dark:text-rose-300">
            <span>🛑</span>
            <span>TIDAK BISA DISIMPAN: SKILL WAJIB DIISI</span>
          </div>
          <p className="text-[11px] font-medium leading-relaxed">
            Archetype sudah dipilih tapi skill masih kosong pada:{' '}
            <strong className="text-rose-600 dark:text-rose-300">
              {audit.missingSkillPlayers.join(', ')}
            </strong>
          </p>
        </div>
      )}

      {/* 2. NOTIFIKASI INFORMASI DECKLOSS */}
      {audit.totalDecklossGames > 0 && (
        <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs space-y-2 shadow-xs">
          <div className="flex items-center justify-between font-black">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="uppercase">Info Deckloss: {teamName}</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-black border border-amber-500/30">
              Total {audit.totalDecklossGames} Game Deckloss
            </span>
          </div>

          <div className="space-y-1 text-[11px] font-medium leading-relaxed">
            {audit.missingPlayers > 0 && (
              <div>
                • <strong>Kurang {audit.missingPlayers} Pemain:</strong> Masukkan{' '}
                <strong>{audit.missingPlayers * 2} Game Deckloss</strong> di Game Runner ({audit.missingPlayers} duelist = {audit.missingPlayers * 2} nyawa).
              </div>
            )}
            {audit.incompleteDeckCount > 0 && (
              <div>
                • <strong>Deck Kosong:</strong> {audit.incompletePlayerNames.join(', ')}. Masukkan{' '}
                <strong>{audit.incompleteDeckCount} Game Deckloss</strong> untuk deck yang tidak diisi.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
      }
