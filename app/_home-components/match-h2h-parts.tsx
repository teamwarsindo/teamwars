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
      <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 px-3.5 py-1 text-xs sm:text-sm font-bold shadow-2xs min-w-[76px] sm:min-w-[88px]">
        {text}
      </span>
    );
  }

  if (isDraw) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 px-3.5 py-1 text-xs sm:text-sm font-bold shadow-2xs min-w-[76px] sm:min-w-[88px]">
        {text}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center rounded-full bg-muted/60 border border-border/60 px-3.5 py-1 text-xs sm:text-sm font-semibold text-muted-foreground min-w-[76px] sm:min-w-[88px]">
      {text}
    </span>
  );
}

export function QualificationBadge({ qual }: { qual: QualificationStatus }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-center">
      <span className="font-bold text-xs sm:text-sm text-foreground">{qual.rankLabel}</span>
      <span
        className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-bold border shadow-2xs ${
          qual.isQualified
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400"
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
    <div className="grid grid-cols-4 sm:flex sm:flex-row gap-1 sm:gap-1.5 w-fit mx-auto justify-items-center items-center">
      {slots.map((res, i) =>
        res ? (
          <span
            key={i}
            className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded font-black text-[9px] sm:text-[10px] shadow-2xs ${
              res === "W"
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                : "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40"
            }`}
          >
            {res}
          </span>
        ) : (
          <span
            key={i}
            className="inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded bg-muted/40 border border-border/40 text-[9px] sm:text-[10px] text-muted-foreground/40 font-bold"
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
      <span className="inline-flex items-center justify-center rounded-full bg-muted/40 border border-border/40 px-3 py-1 text-xs text-muted-foreground/40 font-bold min-w-[76px]">
        -
      </span>
    );
  }

  const isWin = item.isWin;
  const badgeColor = isWin
    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
    : "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40";

  const content = (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 max-w-full ${
        isA ? "flex-row text-left" : "flex-row-reverse text-right"
      }`}
    >
      <div className={`flex items-center gap-1 sm:gap-1.5 shrink-0 ${isA ? "flex-row" : "flex-row-reverse"}`}>
        <span
          className={`inline-flex h-5 w-5 sm:h-5.5 sm:w-5.5 items-center justify-center rounded font-black text-[9px] sm:text-[10px] border shadow-2xs ${badgeColor}`}
        >
          {isWin ? "W" : "L"}
        </span>
        <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground">
          {item.myScore}-{item.oppScore}
        </span>
        <img
          src={item.oppLogo || "/logo.webp"}
          alt=""
          className="h-5 w-5 sm:h-6 sm:w-6 object-contain rounded border border-border/60 bg-background/80 p-0.5 shrink-0"
        />
      </div>

      <span
        className={`font-semibold text-xs sm:text-sm text-muted-foreground truncate max-w-[85px] sm:max-w-[110px] md:max-w-[140px] ${
          item.reportLink ? "group-hover:text-primary group-hover:underline" : ""
        }`}
      >
        {item.oppName}
      </span>

      {item.reportLink && (
        <span className="hidden sm:inline-block text-xs text-muted-foreground/70 group-hover:text-primary">
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
    <div className="flex justify-center items-center w-full opacity-85 cursor-default" title={`Lawan: ${item.oppName}`}>
      {content}
    </div>
  );
}