import { MatchHistoryCardItem, QualificationStatus } from "@/app/tournament/_library/calculator";

export function StatsPill({
  valA,
  valB,
  isA,
  text,
}: {
  valA: number;
  valB: number;
  isA: boolean;
  text: string | number;
}) {
  const isWin = isA ? valA > valB : valB > valA;
  const isDraw = valA === valB;

  if (isWin && !isDraw) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-xs font-black shadow-xs min-w-[68px]">
        {text}
      </span>
    );
  }

  if (isDraw) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-xs font-extrabold shadow-xs min-w-[68px]">
        {text}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center rounded-full bg-muted/50 border border-border/40 px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-xs font-semibold text-muted-foreground min-w-[68px]">
      {text}
    </span>
  );
}

export function QualificationBadge({ qual }: { qual: QualificationStatus }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 text-center">
      <span className="font-bold text-[10.5px] md:text-xs text-foreground">{qual.rankLabel}</span>
      <span
        className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.2 md:py-0.5 text-[8.5px] md:text-[9.5px] font-bold border shadow-2xs ${
          qual.isQualified
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400"
        }`}
      >
        {qual.stageLabel}
      </span>
    </div>
  );
}

export function FormSlots({ formList }: { formList: ("W" | "L")[] }) {
  const slots = Array.from({ length: 8 }, (_, i) => formList[i] || null);

  return (
    <div className="grid grid-cols-4 md:flex md:flex-row gap-1 w-fit mx-auto justify-items-center items-center">
      {slots.map((res, i) =>
        res ? (
          <span
            key={i}
            className={`inline-flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded font-black text-[7.5px] md:text-[8.5px] shadow-2xs ${
              res === "W"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
            }`}
          >
            {res}
          </span>
        ) : (
          <span
            key={i}
            className="inline-flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded bg-muted/40 border border-border/30 text-[7.5px] md:text-[8px] text-muted-foreground/40 font-bold"
          >
            -
          </span>
        )
      )}
    </div>
  );
}

export function MatchReportRowItem({
  item,
  isA = true,
}: {
  item?: MatchHistoryCardItem;
  isA?: boolean;
}) {
  if (!item) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-muted/40 border border-border/30 px-3 py-0.5 text-[10px] text-muted-foreground/40 font-bold min-w-[68px]">
        -
      </span>
    );
  }

  const isWin = item.isWin;
  const badgeColor = isWin
    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30";

  const content = (
    <div
      className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 max-w-full ${
        isA ? "md:flex-row text-left" : "md:flex-row-reverse text-right"
      }`}
    >
      <div className={`flex items-center gap-1 shrink-0 ${isA ? "flex-row" : "flex-row-reverse"}`}>
        <span
          className={`inline-flex h-4 w-4 md:h-4.5 md:w-4.5 items-center justify-center rounded font-black text-[7.5px] md:text-[8.5px] border shadow-2xs ${badgeColor}`}
        >
          {isWin ? "W" : "L"}
        </span>
        <span className="font-extrabold text-[9.5px] md:text-[11px] tracking-tight text-foreground">
          {item.myScore}-{item.oppScore}
        </span>
        <img
          src={item.oppLogo || "/logo.webp"}
          alt=""
          className="h-4 w-4 md:h-5 md:w-5 object-contain rounded border border-border/50 bg-background/50 p-0.5 shrink-0"
        />
      </div>

      <span
        className={`font-semibold text-[8px] md:text-[9.5px] text-muted-foreground truncate max-w-[75px] sm:max-w-[95px] md:max-w-[120px] ${
          item.reportLink ? "group-hover:text-primary group-hover:underline" : ""
        }`}
      >
        {item.oppName}
      </span>

      {item.reportLink && (
        <span className="hidden md:inline-block text-[9px] text-muted-foreground/70 group-hover:text-primary">
          ↗
        </span>
      )}
    </div>
  );

  if (item.reportLink) {
    return (
      <a
        href={item.reportLink}
        target="_blank"
        rel="noopener noreferrer"
        title={`Lihat bukti report vs ${item.oppName}`}
        className="group flex justify-center items-center w-full transition hover:opacity-85 active:scale-95 cursor-pointer"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex justify-center items-center w-full opacity-80 cursor-default" title={`Lawan: ${item.oppName}`}>
      {content}
    </div>
  );
}
