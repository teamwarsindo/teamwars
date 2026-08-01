"use client";

export function GroupSelector({ roulette: r }: { roulette: any }) {
  const currentLabel = r.manualGroup === "GROUP_A" ? "Group A" : "Group B";

  return (
    <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
      <div className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-1">
        <button
          disabled={r.isGroupAFull}
          onClick={() => r.setManualGroup("GROUP_A")}
          className={`flex-1 rounded-lg py-2 text-[10px] font-bold transition ${
            r.manualGroup === "GROUP_A" ? "bg-sky-600 text-white" : "text-muted-foreground"
          } ${r.isGroupAFull ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        >
          Group A {r.isGroupAFull ? "(Full)" : ""}
        </button>

        <button
          disabled={r.isGroupBFull}
          onClick={() => r.setManualGroup("GROUP_B")}
          className={`flex-1 rounded-lg py-2 text-[10px] font-bold transition ${
            r.manualGroup === "GROUP_B" ? "bg-amber-600 text-white" : "text-muted-foreground"
          } ${r.isGroupBFull ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        >
          Group B {r.isGroupBFull ? "(Full)" : ""}
        </button>
      </div>

      <button
        onClick={r.handleStartSpin}
        disabled={r.isSpinning || r.remainingTeams.length === 0 || r.isCurrentGroupFull}
        className="w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {r.isSpinning ? "MEMUTAR..." : r.isCurrentGroupFull ? `${currentLabel} FULL` : "🎯 MULAI PENGUNDIAN"}
      </button>

      <button
        onClick={r.handleReset}
        disabled={r.isSpinning}
        className="w-full rounded-xl border border-destructive/30 bg-destructive/10 py-2 text-[10px] font-bold text-destructive hover:bg-destructive/20 cursor-pointer"
      >
        🔄 RESET PENGUNDIAN
      </button>
    </div>
  );
            }
