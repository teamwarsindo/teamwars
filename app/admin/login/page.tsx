"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AdminLoginForm } from "./_components/admin-login-form";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const handleLoginSuccess = () => {
    router.push(callbackUrl);
    router.refresh();
  };

  return <AdminLoginForm onSuccess={handleLoginSuccess} />;
}

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Admin Portal" />
      
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <HeroHeader showDetails={false} />
        <Suspense fallback={<div className="text-center py-6 text-xs text-muted-foreground">Loading Form...</div>}>
          <LoginContent />
        </Suspense>
        <Footer />
      </div>
    </main>
  );
}
