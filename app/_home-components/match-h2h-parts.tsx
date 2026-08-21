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
      <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 sm:px-3 text-[11px] sm:text-xs font-black shadow-2xs min-w-[55px] sm:min-w-[65px]">
        {text}
      </span>
    );
  }

  if (isDraw) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 px-2.5 py-0.5 sm:px-3 text-[11px] sm:text-xs font-extrabold shadow-2xs min-w-[55px] sm:min-w-[65px]">
        {text}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center rounded-full bg-muted/60 border border-border/60 px-2.5 py-0.5 sm:px-3 text-[11px] sm:text-xs font-semibold text-muted-foreground min-w-[55px] sm:min-w-[65px]">
      {text}
    </span>
  );
}

export function QualificationBadge({ qual }: { qual: QualificationStatus }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 text-center">
      <span className="font-bold text-[11px] sm:text-xs text-foreground">{qual.rankLabel}</span>
      <span
        className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold border shadow-2xs ${
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
    <div className="grid grid-cols-4 gap-0.5 sm:gap-1 w-fit mx-auto justify-items-center items-center">
      {slots.map((res, i) =>
        res ? (
          <span
            key={i}
            className={`inline-flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded text-[8px] font-black shadow-2xs ${
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
            className="inline-flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded bg-muted/40 border border-border/40 text-[8px] text-muted-foreground/30 font-bold"
          >
            -
          </span>
        )
      )}
    </div>
  );
}

export function MatchReportCompactItem({
  item,
  isA = true,
}: {
  item?: MatchHistoryCardItem;
  isA?: boolean;
}) {
  if (!item) {
    return (
      <div className={`flex w-full ${isA ? "justify-end pr-2" : "justify-start pl-2"}`}>
        <span className="text-[10px] text-muted-foreground/30 font-medium">-</span>
      </div>
    );
  }

  const isWin = item.isWin;
  const badgeColor = isWin
    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
    : "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40";

  const content = (
    <div
      className={`flex items-center gap-1 sm:gap-1.5 w-full min-w-0 ${
        isA ? "flex-row justify-end text-right" : "flex-row text-left"
      }`}
    >
      {isA ? (
        <>
          {/* NAMA TIM LAWAN (A) */}
          <span
            className={`font-semibold text-[9.5px] sm:text-[11px] text-muted-foreground truncate max-w-[55px] xs:max-w-[75px] sm:max-w-[100px] md:max-w-[130px] ${
              item.reportLink ? "group-hover:text-primary group-hover:underline" : ""
            }`}
          >
            {item.oppName}
          </span>
          {/* LOGO LAWAN */}
          <img
            src={item.oppLogo || "/logo.webp"}
            alt=""
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 object-contain rounded shrink-0 bg-background/80 border border-border/60 p-0.5"
          />
          {/* SKOR */}
          <span className="font-bold text-[9.5px] sm:text-[11px] tracking-tight text-foreground whitespace-nowrap">
            {item.myScore}-{item.oppScore}
          </span>
          {/* BADGE W/L */}
          <span
            className={`inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded text-[7.5px] sm:text-[8px] font-black border shadow-2xs shrink-0 ${badgeColor}`}
          >
            {isWin ? "W" : "L"}
          </span>
        </>
      ) : (
        <>
          {/* BADGE W/L */}
          <span
            className={`inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded text-[7.5px] sm:text-[8px] font-black border shadow-2xs shrink-0 ${badgeColor}`}
          >
            {isWin ? "W" : "L"}
          </span>
          {/* SKOR */}
          <span className="font-bold text-[9.5px] sm:text-[11px] tracking-tight text-foreground whitespace-nowrap">
            {item.myScore}-{item.oppScore}
          </span>
          {/* LOGO LAWAN */}
          <img
            src={item.oppLogo || "/logo.webp"}
            alt=""
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 object-contain rounded shrink-0 bg-background/80 border border-border/60 p-0.5"
          />
          {/* NAMA TIM LAWAN (B) */}
          <span
            className={`font-semibold text-[9.5px] sm:text-[11px] text-muted-foreground truncate max-w-[55px] xs:max-w-[75px] sm:max-w-[100px] md:max-w-[130px] ${
              item.reportLink ? "group-hover:text-primary group-hover:underline" : ""
            }`}
          >
            {item.oppName}
          </span>
        </>
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
        className="group flex items-center w-full min-w-0 transition hover:opacity-85 active:scale-95 cursor-pointer"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center w-full min-w-0 opacity-90 cursor-default" title={`Lawan: ${item.oppName}`}>
      {content}
    </div>
  );
}