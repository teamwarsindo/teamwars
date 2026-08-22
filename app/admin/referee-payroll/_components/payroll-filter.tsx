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
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
      <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 flex items-center gap-1 shrink-0">
        <Calendar className="h-3.5 w-3.5 text-primary" /> Filter:
      </span>
      <button
        onClick={() => onSelectWeek("ALL")}
        className={`rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
          selectedWeek === "ALL"
            ? "bg-primary text-primary-foreground shadow-2xs"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
        }`}
      >
        Semua Pekan
      </button>
      {activeWeeks.map((w) => (
        <button
          key={w}
          onClick={() => onSelectWeek(w)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            selectedWeek === w
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          Week {w}
        </button>
      ))}
    </div>
  );
}
