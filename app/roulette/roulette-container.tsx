"use client";

import { RouletteWheel } from "./roulette-wheel";
import { GroupCard } from "./components/group-card";
import { WinnerModal } from "./components/winner-modal";
import { useRoulette } from "./hooks/useRoulette";

export function RouletteContainer({ isAdmin }: { isAdmin: boolean }) {
  const {
    remainingTeams, groupA, groupB, manualGroup, setManualGroup,
    isLoading, isSpinning, winningIndex, serverTargetAngle, spinStartTimeMs,
    celebrationWinner, setCelebrationWinner, quotaGroupA, quotaGroupB,
    isGroupAFull, isGroupBFull, isCurrentGroupFull,
    handleStartSpin, handleSpinEnd, handleReset, saveStateToKV
  } = useRoulette(isAdmin);

  if (isLoading) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-border bg-card/50">
        <p className="animate-pulse text-xs font-semibold text-primary">⏳ Memuat Data Pengundian...</p>
      </div>
    );
  }

  const currentLabel = manualGroup === "GROUP_A" ? "Group A" : "Group B";

  return (
    <div className="relative flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
      {celebrationWinner && (
        <WinnerModal
          winner={celebrationWinner}
          targetGroup={groupA.some((t) => t.name === celebrationWinner.name) ? "Group A" : "Group B"}
          isAdmin={isAdmin}
          onClose={() => {
            setCelebrationWinner(null);
            if (isAdmin) saveStateToKV(remainingTeams, groupA, groupB, null);
          }}
        />
      )}

      {/* Roda Roulette Main Section */}
      <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Alokasi Grup: <span className={currentLabel.includes("A") ? "text-sky-400" : "text-amber-400"}>{currentLabel}</span>
          </span>
        </div>

        {remainingTeams.length > 0 && !(isGroupAFull && isGroupBFull) ? (
          <RouletteWheel
            teams={remainingTeams}
            winningIndex={winningIndex}
            isSpinning={isSpinning}
            targetAngleServer={serverTargetAngle}
            startTimeMs={spinStartTimeMs}
            onSpinEnd={handleSpinEnd}
          />
        ) : (
          <div className="flex h-[360px] w-[360px] items-center justify-center rounded-full border border-dashed border-primary/40 bg-muted/20 text-center p-6">
            <p className="text-sm font-bold text-primary">🎉 PENGUNDIAN GRUP SELESAI!</p>
          </div>
        )}

        {isAdmin && (
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            <div className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-1">
              <button
                disabled={isGroupAFull}
                onClick={() => setManualGroup("GROUP_A")}
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition ${
                  manualGroup === "GROUP_A" ? "bg-sky-600 text-white" : "text-muted-foreground"
                } ${isGroupAFull ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                Group A {isGroupAFull ? "(Full)" : ""}
              </button>
              <button
                disabled={isGroupBFull}
                onClick={() => setManualGroup("GROUP_B")}
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition ${
                  manualGroup === "GROUP_B" ? "bg-amber-600 text-white" : "text-muted-foreground"
                } ${isGroupBFull ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                Group B {isGroupBFull ? "(Full)" : ""}
              </button>
            </div>

            <button
              onClick={handleStartSpin}
              disabled={isSpinning || remainingTeams.length === 0 || isCurrentGroupFull}
              className="w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isSpinning ? "MEMUTAR..." : isCurrentGroupFull ? `${currentLabel.toUpperCase()} FULL` : "🎯 MULAI PENGUNDIAN"}
            </button>

            <button
              onClick={handleReset}
              disabled={isSpinning}
              className="w-full rounded-xl border border-destructive/30 bg-destructive/10 py-2 text-[10px] font-bold text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              🔄 RESET PENGUNDIAN
            </button>
          </div>
        )}
      </div>

      {/* Tampilan Tabel Group A & B */}
      <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <GroupCard title="GROUP A" colorTheme="sky" teams={groupA} quota={quotaGroupA} />
        <GroupCard title="GROUP B" colorTheme="amber" teams={groupB} quota={quotaGroupB} />
      </div>
    </div>
  );
}
