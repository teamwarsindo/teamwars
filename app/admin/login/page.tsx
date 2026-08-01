'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { AdminLoginForm } from "@/components/admin-login-form";

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';

  return (
    <AdminLoginForm
      title="Admin Portal TWI"
      subtitle="Sistem Otentikasi Panitia Season 7"
      buttonText="Masuk ke Dashboard"
      redirectTo={callbackUrl}
    />
  );
}

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <title>Admin Login — TWI Season 7</title>

      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Admin Portal" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <HeroHeader showDetails={false} />

        <Suspense fallback={<div className="text-xs text-muted-foreground py-10">Loading Portal...</div>}>
          <AdminLoginContent />
        </Suspense>

        <Footer />
      </div>
    </main>
  );
}
