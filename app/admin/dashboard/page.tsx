import { cookies } from "next/headers";
import { Suspense } from "react";
import DashboardClientContent from "./dashboard-client";
import { AdminLoginForm } from "@/components/admin-login-form";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";

export const metadata = {
  title: "Dashboard Admin — TWI Season 7",
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAuthorized = Boolean(adminCookie);

  // 🔒 Jika BELUM Login di Server, tampilkan halaman Login
  if (!isAuthorized) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
        <TopBar title="Admin Portal" />
        
        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
          <HeroHeader showDetails={false} />
          <Suspense fallback={<div className="text-center py-6 text-xs text-muted-foreground">Loading Form...</div>}>
            <AdminLoginForm />
          </Suspense>
          <Footer />
        </div>
      </main>
    );
  }

  // 📊 Jika SUDAH Login di Server, langsung render Client Dashboard
  return (
    <Suspense fallback={<div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-xs">Loading Dashboard...</div>}>
      <DashboardClientContent />
    </Suspense>
  );
}
