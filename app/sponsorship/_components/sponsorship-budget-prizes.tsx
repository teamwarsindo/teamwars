import {
  BUDGET_BREAKDOWN,
  TOTAL_SPONSORSHIP_BUDGET,
  REGISTRATION_TOTAL,
  TOURNAMENT_PARAMS,
  TOTAL_PRIZE_POOL,
  PRIZE_DISTRIBUTION,
  formatRupiah,
} from "../_library/sponsorship-config";

export function SponsorshipBudgetPrizes() {
  return (
    <div className="space-y-6">
      {/* 1. RENCANA ANGGARAN SPONSORSHIP */}
      <section className="rounded-3xl border border-border/50 bg-card p-4 sm:p-6 shadow-2xs">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-emerald-500/10 p-1.5 text-xs text-emerald-500">💰</span>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Rencana Anggaran Resmi
          </h2>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-foreground">
          Kebutuhan Dana Sponsor Proposal
        </h3>
        <p className="mt-1 mb-4 text-xs text-muted-foreground leading-relaxed">
          Kebutuhan honor wasit dan streamer dialokasikan <strong>{formatRupiah(TOURNAMENT_PARAMS.FEE_REFEREE_PER_MATCH)}/match</strong> dengan total kebutuhan sponsorship turnamen sebesar <strong>{formatRupiah(TOTAL_SPONSORSHIP_BUDGET)}</strong>.
        </p>

        {/* LIST ANGGARAN MOBILE-FIRST */}
        <div className="space-y-2.5">
          {BUDGET_BREAKDOWN.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-muted/20 p-3 sm:p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {item.phaseLabel}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">{item.name}</h4>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs sm:text-sm font-black text-foreground">
                    {formatRupiah(item.totalAmount)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[10px] sm:text-[11px] text-muted-foreground">
                <span>Kuantitas: <strong className="text-foreground">{item.quantityLabel}</strong></span>
                <span>Satuan: <strong className="text-foreground">{formatRupiah(item.unitRate)}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* TOTAL BUDGET CARD */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-md">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 block">
              TOTAL KEBUTUHAN SPONSORSHIP
            </span>
            <span className="text-xs text-blue-100">Berdasarkan Dokumen Resmi TWI</span>
          </div>
          <div className="text-right font-mono text-xl sm:text-2xl font-black">
            {formatRupiah(TOTAL_SPONSORSHIP_BUDGET)}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
          💡 <strong>Turnamen 100% Online:</strong> Tidak ada biaya sewa venue dan katering fisik. Seluruh dana sponsor terfokus pada pengawasan wasit, jangkauan siaran streamer, infrastruktur platform, dan apresiasi hadiah juara.
        </div>
      </section>

      {/* 2. STRUKTUR TOTAL PRIZE POOL */}
      <section className="rounded-3xl border border-border/50 bg-card p-4 sm:p-6 shadow-2xs">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-amber-500/10 p-1.5 text-xs text-amber-500">🏆</span>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Struktur Hadiah Turnamen
          </h2>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-foreground">
          Total Hadiah: {formatRupiah(TOTAL_PRIZE_POOL)}
        </h3>
        <p className="mt-1 mb-4 text-xs text-muted-foreground leading-relaxed">
          Penggabungan antara 100% uang pendaftaran tim dengan top-up dana sponsor:
        </p>

        {/* 2 SUMBER DANA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              1. DANA PENDAFTARAN (100% UTUH)
            </span>
            <span className="mt-1 block font-mono text-lg font-black text-foreground">
              {formatRupiah(REGISTRATION_TOTAL)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              32 Tim × {formatRupiah(TOURNAMENT_PARAMS.REGISTRATION_FEE_PER_TEAM)} (tanpa potongan operasional)
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
              2. TOP-UP DARI SPONSOR
            </span>
            <span className="mt-1 block font-mono text-lg font-black text-emerald-500">
              + {formatRupiah(TOURNAMENT_PARAMS.SPONSOR_PRIZE_TOPUP)}
            </span>
            <span className="text-[11px] text-emerald-600/90 dark:text-emerald-400">
              Suntikan dana mitra dari proposal resmi
            </span>
          </div>
        </div>

        {/* TABEL PEMBAGIAN JUARA */}
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-3.5 sm:p-4 space-y-2">
          <span className="block text-xs font-bold text-foreground mb-1">
            Pembagian Hadiah Juara:
          </span>
          {PRIZE_DISTRIBUTION.map((prize, idx) => (
            <div
              key={prize.placement}
              className={`flex justify-between items-center text-xs py-1.5 ${
                idx < PRIZE_DISTRIBUTION.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              <span className={`font-semibold ${prize.isSpecial ? "text-rose-500" : "text-foreground"}`}>
                {prize.placement}
              </span>
              <div className="text-right">
                <span className={`font-mono font-bold ${prize.isSpecial ? "text-rose-500" : "text-foreground"}`}>
                  {formatRupiah(prize.nominal)}
                </span>
                <span className="ml-1 text-[10px] text-muted-foreground">({prize.additionalReward})</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
