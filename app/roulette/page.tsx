import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RouletteContainer } from "./roulette-container";

export const metadata = {
  title: "Official Group Draw Roulette — Team Wars Indonesia",
  description: "Pengundian Group A dan Group B resmi Team Wars Indonesia",
};

export default async function RoulettePage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const cookieStore = await cookies();
  const resolvedSearchParams = await searchParams;

  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAuth = Boolean(adminCookie);
  const wantsAdmin = resolvedSearchParams.admin === "true";

  // 🔒 Jika ingin akses mode admin tapi BELUM login -> Redirect ke central login
  if (wantsAdmin && !isAuth) {
    redirect("/admin/login?callbackUrl=/roulette?admin=true");
  }

  const isAdmin = wantsAdmin && isAuth;

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      {/* Ambient glow yang sinkron */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Official Group Draw" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-12 sm:px-6 lg:px-12">
        <HeroHeader showDetails={true} />

        <section className="mb-6 w-full max-w-4xl rounded-xl border border-primary/20 bg-muted/40 p-3.5 text-center backdrop-blur-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            ⚙️ System Random: Math.random()
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pengundian acak adil berbasis <span className="font-mono text-cyan-400">Uniform Distribution</span>. Tim terpilih otomatis masuk grup &amp; keluar dari roda.
          </p>
        </section>

        <Suspense fallback={<div className="text-center py-10 text-xs text-muted-foreground">Loading Draw Engine...</div>}>
          <RouletteContainer isAdmin={isAdmin} />
        </Suspense>

        <Footer />
      </div>
    </main>
  );
      }
