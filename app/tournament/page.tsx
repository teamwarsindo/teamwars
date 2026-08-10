import { cookies } from "next/headers";
import { Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import TournamentClientContent from "./tournament-client";

export const metadata = {
  title: "Official Schedule — TWI Season 7",
};

export default async function TournamentLandingPage() {
  // 🟢 1. Cek cookie session admin langsung dari Server Header
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAdmin = Boolean(adminCookie);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 1. TOP BAR */}
      <TopBar title="Official Schedule" />

      {/* 2. HERO HEADER */}
      <div className="px-4">
        <HeroHeader showDetails={false} />
      </div>

      {/* 3. MAIN CONTENT (Membawa status isAdmin otomatis dari cookie session) */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">
              ⏳ Memuat Jadwal &amp; Klasemen TWI...
            </div>
          }
        >
          <TournamentClientContent isAdmin={isAdmin} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
