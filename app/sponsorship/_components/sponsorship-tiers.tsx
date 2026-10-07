import { SPONSORSHIP_TIERS, formatRupiah } from "../_library/sponsorship-config";

export function SponsorshipTiers() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/50 bg-card p-4 sm:p-6 shadow-2xs">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-rose-500/10 p-1.5 text-xs text-rose-500">💎</span>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Pilihan Kemitraan
          </h2>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-foreground">
          Paket Sponsorship Resmi TWI Season 8
        </h3>
        <p className="mt-1 mb-6 text-xs text-muted-foreground leading-relaxed">
          Hak eksposur, slot ketersediaan, dan nominal kemitraan resmi Team Wars Indonesia:
        </p>

        <div className="space-y-4">
          {SPONSORSHIP_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-3xl p-4 sm:p-5 transition-all ${
                tier.isFeatured
                  ? "border-2 border-primary bg-primary/5 shadow-md"
                  : "border border-border/50 bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${
                    tier.isFeatured
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tier.badge}
                </span>
                <span className="rounded-full border border-border/50 bg-background/50 px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                  {tier.slots}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-3 mb-3">
                <div>
                  <h4 className="text-base sm:text-lg font-black text-foreground">{tier.title}</h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">{tier.subtitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-base sm:text-xl font-black text-foreground">
                    {formatRupiah(tier.price)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="block text-[11px] font-bold text-foreground mb-1">
                  Keuntungan Mitra:
                </span>
                <ul className="space-y-1.5 text-muted-foreground">
                  {tier.benefits.map((benefit, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="https://discord.gg/NtBBdqUrxe"
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 block w-full rounded-xl py-2.5 text-center text-xs font-bold uppercase tracking-wider transition ${
                  tier.isFeatured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                    : "border border-border/60 bg-card text-foreground hover:bg-muted"
                }`}
              >
                Pilih {tier.title}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER KONTAK SPONSORSHIP */}
      <footer className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
              KOLABORASI SPONSORSHIP TWI S8
            </span>
            <h3 className="mt-1 text-lg sm:text-xl font-black text-white">Siap Berkolaborasi?</h3>
            <p className="mt-1 max-w-md text-xs text-blue-100">
              Diskusikan paket khusus, sistem barter produk, atau sponsor parsial bersama panitia resmi kami.
            </p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <a
              href="https://discord.gg/NtBBdqUrxe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none rounded-xl bg-white px-4 py-2.5 text-center text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition"
            >
              Hubungi via Discord
            </a>
          </div>
        </div>

        <div className="mt-5 border-t border-white/20 pt-3 flex flex-col sm:flex-row justify-between text-[10px] text-blue-200/90 gap-1.5">
          <span>© 2026 Team Wars Indonesia. All rights reserved.</span>
          <span>Yu-Gi-Oh! is a trademark of Studio Dice/SHUEISHA, TV TOKYO, KONAMI.</span>
        </div>
      </footer>
    </div>
  );
}
