import { cookies } from "next/headers";
import { Suspense } from "react";
import AuditClientContent from "./audit-client";
import { AdminLoginForm } from "@/components/admin-login-form";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";

export const metadata = {
  title: "KV Audit & Cleaner — TWI Season 7",
};

export default async function AdminAuditPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAuthorized = Boolean(adminCookie);

  if (!isAuthorized) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <TopBar title="Admin Audit Portal" />
        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
          <HeroHeader showDetails={false} />
          <Suspense fallback={<div className="py-6 text-xs text-muted-foreground">Loading Form...</div>}>
            {/* Langsung panggil tanpa prop, dia bakal auto reload di halaman /admin/audit */}
            <AdminLoginForm />
          </Suspense>
          <Footer />
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar title="Upstash KV Audit & Management" />
      <div className="px-4">
        <HeroHeader showDetails={false} />
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12">
        <Suspense fallback={<div className="p-8 text-center text-xs text-primary animate-pulse">⏳ Memuat Data KV Audit...</div>}>
          <AuditClientContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}