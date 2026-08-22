import { Calendar } from "lucide-react";

interface PayrollFilterProps {
  activeWeeks: number[];
  selectedWeek: number | "ALL";
  onSelectWeek: (week: number | "ALL") => void;
}

export function PayrollFilter({
  activeWeeks,
  selectedWeek,
  onSelectWeek,
}: PayrollFilterProps) {
  return (
    <div className="flex items-center justify-between gap-3 bg-muted/30 border border-border/70 p-2.5 rounded-2xl">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-foreground">Filter Tinjauan Pekan:</span>
      </div>

      <select
        value={selectedWeek}
        onChange={(e) => {
          const val = e.target.value;
          onSelectWeek(val === "ALL" ? "ALL" : Number(val));
        }}
        aria-label="Filter Tinjauan Pekan"
        className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground focus:outline-primary cursor-pointer shadow-2xs"
      >
        <option value="ALL">Semua Pekan (Akumulasi)</option>
        {activeWeeks.map((w) => (
          <option key={w} value={w}>
            Pekan / Week {w}
          </option>
        ))}
      </select>
    </div>
  );
}
