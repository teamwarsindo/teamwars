import {
  TOURNAMENT_PARAMS,
  TOTAL_MATCHES,
  REGISTRATION_TOTAL,
  SPONSORSHIP_TIMELINE,
  formatRupiah,
} from "../_library/sponsorship-config";

export function SponsorshipOverview() {
  return (
    <div className="space-y-6">
      {/* 1. STATS METRIC CARDS */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-4 text-center shadow-2xs">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-primary text-sm sm:text-base">
            👥
          </div>
          <div className="text-base sm:text-2xl font-black text-foreground">
            {TOURNAMENT_PARAMS.TOTAL_TEAMS} Tim
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            4 Grup Round-Robin
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-4 text-center shadow-2xs">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 text-sm sm:text-base">
            ⚔️
          </div>
          <div className="text-base sm:text-2xl font-black text-foreground">
            {TOTAL_MATCHES} Match
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            112 Grup + 15 KO
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-4 text-center shadow-2xs">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 text-sm sm:text-base">
            🎁
          </div>
          <div className="text-base sm:text-2xl font-black text-foreground">
            100% Regis
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            Full Hadiah Juara
          </div>
        </div>
      </section>

      {/* 2. BROADCAST LIVE BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
          </span>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">
              EKSPOSUR SPONSOR TWI LIVE
            </span>
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {TOTAL_MATCHES} Pertandingan Disiarkan dengan Branding Logo & Ad-Libs Caster
            </p>
          </div>
        </div>
        <span className="self-end sm:self-auto rounded-full bg-rose-600 px-3 py-1 text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">
          Multi-Streamer Network
        </span>
      </div>

      {/* 3. FORMAT TURNAMEN RESMI */}
      <section className="rounded-3xl border border-border/50 bg-card p-4 sm:p-6 shadow-2xs">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-1.5 text-xs text-primary">📋</span>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Format Resmi Turnamen
          </h2>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-foreground">
          Struktur Round-Robin & Knockout Stage
        </h3>
        <p className="mt-1 mb-4 text-xs text-muted-foreground leading-relaxed">
          Format resmi TWI menjamin keadilan duel duelist serta kepastian jam tayang dan impresi bagi mitra sponsor.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3.5">
            <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xs">
              01
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                Fase Registrasi ({TOURNAMENT_PARAMS.TOTAL_TEAMS} Tim × {formatRupiah(TOURNAMENT_PARAMS.REGISTRATION_FEE_PER_TEAM)})
              </h4>
              <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                Terkumpul <strong className="text-foreground">{formatRupiah(REGISTRATION_TOTAL)}</strong>. Seluruh uang pendaftaran 100% dialokasikan untuk prize pool tanpa potongan biaya operasional panitia.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3.5">
            <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-xs">
              02
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                Group Stages (Round-Robin 4 Grup = {TOURNAMENT_PARAMS.GROUP_STAGE_MATCHES} Match)
              </h4>
              <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                32 tim dibagi ke 4 grup (A, B, C, D) masing-masing 8 tim. Menggunakan sistem single round-robin: 28 match/grup. Total: <strong className="text-foreground">{TOURNAMENT_PARAMS.GROUP_STAGE_MATCHES} pertandingan</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3.5">
            <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-black text-xs">
              03
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                Knock-Out Stages / Playoffs ({TOURNAMENT_PARAMS.PLAYOFF_MATCHES} Match)
              </h4>
              <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                Top 4 tiap grup (16 tim) melaju ke sistem gugur: 8 match R16 + 4 match Perempat Final + 2 match Semifinal + 1 match Grand Final = <strong className="text-foreground">{TOURNAMENT_PARAMS.PLAYOFF_MATCHES} pertandingan</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 4. AGENDA TIMELINE TURNAMEN */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <span className="mb-3 block text-xs font-bold text-foreground">
            🗓️ Jadwal Agenda Turnamen Lengkap:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SPONSORSHIP_TIMELINE.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-border/40 bg-muted/30 p-3 text-xs"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  FASE {item.step}
                </span>
                <span className="mt-1 font-bold text-foreground text-xs">
                  {item.period}
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
