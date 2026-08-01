import { cookies } from "next/headers";
import { Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RouletteContainer } from "./roulette-container";
import AdminLoginFormInline from "./admin-login-form"; // Form login inline

export const metadata = {
  title: "Official Group Draw Roulette — Team Wars Indonesia",
  description: "Pengundian Group A dan Group B resmi Team Wars Indonesia Season 7",
};

export default async function RoulettePage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  // 1. Await cookies() dan searchParams (Next.js 15/16)
  const cookieStore = await cookies();
  const resolvedSearchParams = await searchParams;

  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAuth = Boolean(adminCookie);
  const wantsAdmin = resolvedSearchParams.admin === "true";

  // 2. TENTUKAN MODE:
  // - Jika ?admin=true tapi BELUM login -> Render Form Login di URL yang sama
  const showLoginForm = wantsAdmin && !isAuth;
  
  // - Mode admin aktif jika ?admin=true DAN sudah login
  const isAdmin = wantsAdmin && isAuth;

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* Ambient Glow */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title={showLoginForm ? "Admin Authentication" : "Official Group Draw"} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6 lg:px-12">
        <HeroHeader showDetails={false} />

        {showLoginForm ? (
          /* 🔐 JIKA INGIN AKSES ADMIN TAPI BELUM LOGIN: Tampilkan Form Login di URL yang sama */
          <div className="my-6 w-full max-w-md">
            <div className="mb-4 text-center">
              <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                🔒 Akses Panel Admin Diperlukan
              </span>
            </div>
            <Suspense fallback={<div className="text-center py-6 text-xs text-muted-foreground">Loading Form...</div>}>
              <AdminLoginFormInline />
            </Suspense>
          </div>
        ) : (
          /* 🎯 JIKA PENONTON / ADMIN SUDAH LOGIN: Tampilkan Roulette Engine */
          <>
            {/* Keterangan Sistem Roulette */}
            <section className="mb-6 max-w-2xl rounded-xl border border-primary/20 bg-muted/40 p-4 text-center backdrop-blur-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                ⚙️ Sistem Pengundian Group (Half-Capacity)
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Roda roulette akan mengundi tim terdaftar satu per satu secara acak. **50% tim pertama** yang terpilih otomatis masuk ke <span className="font-bold text-cyan-400">Group A</span>. Setelah kuota Group A penuh, sisa tim selanjutnya otomatis menempati <span className="font-bold text-amber-400">Group B</span>.
              </p>
            </section>

            {/* Komponen Interaktif Roulette */}
            <Suspense fallback={<div className="text-center py-10 text-xs text-muted-foreground">Loading Draw Engine...</div>}>
              <RouletteContainer isAdmin={isAdmin} />
            </Suspense>
          </>
        )}

        <Footer />
      </div>
    </main>
  );
}
