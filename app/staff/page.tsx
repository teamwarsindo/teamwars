import { Suspense } from "react";
import { cookies } from "next/headers";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import StaffClientContent from "./staff-client";

export const metadata = {
  title: "Official Staff — TWI Season 7",
};

export default async function StaffPage() {
  const cookieStore = await cookies();
  const isAdmin = Boolean(cookieStore.get("admin_session")?.value);

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div
        className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        aria-hidden="true"
      />

      {/* TOP BAR */}
      <TopBar title="Official Staff" />

      {/* CONTAINER UTAMA */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-2 sm:px-6 pb-12">
        <HeroHeader showDetails={true} />

        <section className="w-full max-w-7xl 2xl:max-w-[1440px] transition-all duration-300">
          <Suspense
            fallback={
              <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">
                ⏳ Memuat Direktori Staf TWI...
              </div>
            }
          >
            <StaffClientContent isAdmin={isAdmin} />
          </Suspense>
        </section>

        <Footer />
      </div>
    </main>
  );
}