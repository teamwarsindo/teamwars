import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RouletteContainer } from "./roulette-container";

export const metadata = {
  title: "Official Group Draw Roulette — Team Wars Indonesia",
  description: "Pengundian Group A dan Group B resmi Team Wars Indonesia Season 7",
};

export default function RoulettePage({
  searchParams,
}: {
  searchParams: { admin?: string };
}) {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAuth = Boolean(adminCookie); // Cek apakah sudah login

  const wantsAdmin = searchParams.admin === "true";

  // Jika pengunjung meminta akses admin (?admin=true) tapi belum login, 
  // lempar ke halaman login admin dengan callback kembali ke roulette.
  if (wantsAdmin && !isAuth) {
    redirect("/admin/login?callbackUrl=/roulette?admin=true");
  }

  // Tentukan apakah user berhak menjadi admin di halaman ini
  const isAdmin = wantsAdmin && isAuth;

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* Ambient Glow */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Official Group Draw" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6 lg:px-12">
        <HeroHeader showDetails={false} />

        {/* Keterangan Sistem Roulette */}
        <section className="mb-6 max-w-2xl rounded-xl border border-primary/20 bg-muted/40 p-4 text-center backdrop-blur-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            ⚙️ Sistem Pengundian Group (Half-Capacity)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Roda roulette akan mengundi tim terdaftar satu per satu secara acak. **50% tim pertama** yang terpilih otomatis masuk ke <span className="font-bold text-cyan-400">Group A</span>. Setelah kuota Group A penuh, sisa tim selanjutnya otomatis menempati <span className="font-bold text-amber-400">Group B</span>.
          </p>
        </section>

        {/* Komponen Interaktif Terproteksi */}
        <Suspense fallback={<div className="text-center py-10 text-xs text-muted-foreground">Loading Draw Engine...</div>}>
          <RouletteContainer isAdmin={isAdmin} />
        </Suspense>

        <Footer />
      </div>
    </main>
  );
            }
