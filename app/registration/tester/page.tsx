"use client";

import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
// 🎯 Import komponen utama dari folder components di atasnya
import { RegistrationForm } from "../components/registration-form"; 
import { STORAGE_KEY } from "../utils/lib-registration";

export default function TesterRegistrationPage() {
  const handleClearStorage = () => {
    if (confirm("Hapus data pendaftaran tester di browser ini?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };
  
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar onClearStorage={handleClearStorage} showTrash={true} title="🧪 TESTER REGISTRATION" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />

        <section className="flex w-full max-w-4xl flex-col items-center">
          <div className="w-full max-w-2xl mb-6 rounded-lg bg-yellow-500/10 border border-yellow-500/40 p-4 text-center shadow-sm">
             <p className="font-bold text-yellow-500 mb-1">⚠️ MODE TESTER AKTIF</p>
             <p className="text-sm text-yellow-600/80">
               Data akan dikirim ke channel Log Discord. Database tidak akan terpengaruh.
             </p>
          </div>

          <div className="w-full max-w-2xl">
            {/* 🎯 KUNCI UTAMA: Form produksi dijalankan dalam mode tester */}
            <RegistrationForm isTester={true} />
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
