"use client"

interface RulePointProps {
  rawText: string
  isSub?: boolean
}

export function RulePoint({ rawText, isSub = false }: RulePointProps) {
  // 1. Deteksi list standar (a., 1., i., dll)
  const listMatch = rawText.match(/^([a-zA-Z0-9]{1,3})\.\s+(.*)/)
  if (listMatch) {
    return (
      <div className="flex items-start gap-3">
        <span className={`flex shrink-0 items-center justify-center font-bold uppercase rounded-md mt-0.5 ${
          isSub 
            ? 'h-5 min-w-[24px] bg-secondary/40 text-[10px] text-secondary-foreground' 
            : 'h-6 min-w-[28px] bg-primary/10 text-xs text-primary ring-1 ring-primary/20'
        }`}>
          {listMatch[1]}
        </span>
        <span className="w-full text-sm leading-relaxed text-muted-foreground">{listMatch[2]}</span>
      </div>
    )
  }

  // 2. Deteksi kasus khusus (Kasus 1:, Player A:, dll)
  const caseMatch = rawText.match(/^(Kasus\s\d+|Player\s[A-Z]):\s+(.*)/i)
  if (caseMatch) {
    return (
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive ring-1 ring-destructive/20">
          {caseMatch[1]}
        </span>
        <span className="w-full text-sm leading-relaxed text-muted-foreground">{caseMatch[2]}</span>
      </div>
    )
  }

  // 3. Teks paragraf biasa
  return (
    <div className="flex items-start gap-3">
      {isSub && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />}
      <span className="w-full text-sm leading-relaxed text-muted-foreground">{rawText}</span>
    </div>
  )
}
