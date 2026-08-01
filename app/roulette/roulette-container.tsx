"use client";

import { RouletteWheel } from "./roulette-wheel";
import { GroupCard } from "./components/group-card";
import { WinnerModal } from "./components/winner-modal";
import { GroupSelector } from "./components/group-selector";
import { useRoulette } from "./hooks/useRoulette";

export function RouletteContainer({ isAdmin }: { isAdmin: boolean }) {
  const r = useRoulette(isAdmin);

  if (r.isLoading) {
    return <div className="p-8 text-center text-xs text-primary animate-pulse">⏳ Memuat Data...</div>;
  }

  const isFull = r.isGroupAFull && r.isGroupBFull;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-8 lg:flex-row items-center lg:items-start">
      
      {/* Modal Winner */}
      {r.celebrationWinner && (
        <WinnerModal
          winner={r.celebrationWinner}
          groupName={r.groupA.some((t) => t.name === r.celebrationWinner?.name) ? "Group A" : "Group B"}
          isAdmin={isAdmin}
          onClose={() => r.closeCelebration(isAdmin)}
        />
      )}

      {/* Box Utama Roda & Control */}
      <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md w-full">
        <span className="mb-4 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
          ALOKASI: {r.manualGroup === "GROUP_A" ? "GROUP A" : "GROUP B"}
        </span>

        {r.remainingTeams.length > 0 && !isFull ? (
          <RouletteWheel
            teams={r.remainingTeams}
            winningIndex={r.winningIndex}
            isSpinning={r.isSpinning}
            targetAngleServer={r.serverTargetAngle}
            startTimeMs={r.spinStartTimeMs}
            onSpinEnd={r.handleSpinEnd}
          />
        ) : (
          <div className="flex h-72 w-72 items-center justify-center rounded-full border border-dashed border-primary/40 text-sm font-bold text-primary">
            🎉 PENGUNDIAN SELESAI!
          </div>
        )}

        {isAdmin && <GroupSelector roulette={r} />}
      </div>

      {/* Group Cards */}
      <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <GroupCard title="GROUP A" colorTheme="sky" teams={r.groupA} quota={r.quotaGroupA} />
        <GroupCard title="GROUP B" colorTheme="amber" teams={r.groupB} quota={r.quotaGroupB} />
      </div>

    </div>
  );
}
