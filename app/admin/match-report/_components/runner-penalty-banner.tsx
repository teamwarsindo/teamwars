'use client';

interface RunnerPenaltyBannerProps {
  pendingPenaltyTeam: 'teamA' | 'teamB' | null;
  penalizedTeamName: string;
  isTargetLocked: boolean;
  lockedPlayerIgn?: string;
}

export function RunnerPenaltyBanner({
  pendingPenaltyTeam,
  penalizedTeamName,
  isTargetLocked,
  lockedPlayerIgn,
}: RunnerPenaltyBannerProps) {
  if (!pendingPenaltyTeam) return null;

  return (
    <div className="p-3.5 rounded-2xl border border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100 text-xs space-y-1.5 shadow-xs">
      <div className="flex items-center gap-2 font-black text-rose-700 dark:text-rose-300">
        <span>🛑</span>
        <span>REALISASI DECKLOSS: {penalizedTeamName}</span>
      </div>
      <p className="text-[11px] leading-relaxed">
        {isTargetLocked ? (
          <>
            Pemain meja <strong>{lockedPlayerIgn}</strong> masih menyisakan nyawa kedua. Sanksi penalti otomatis mengunci pemain dan sisa deck-nya.
          </>
        ) : (
          <>
            Pemain sebelumnya sudah gugur total (Life 0). Silakan <strong>pilih pemain berikutnya</strong> dan <strong>deck yang dikorbankan</strong> untuk menerima Deckloss.
          </>
        )}
      </p>
    </div>
  );
}
