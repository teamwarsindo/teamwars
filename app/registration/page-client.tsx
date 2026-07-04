"use client";

import { useState, useEffect} from "react"; // Kalau lu pakai state untuk modal konfirmasi
import { RegistrationForm } from "@/components/registration-form";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";

export default function Page() {
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirmTrashOpen, setIsConfirmTrashOpen] = useState(false);
  const accountNumber = "0467897733";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin teks", err);
    }
  };

  const handleClearStorage = () => {
    setIsConfirmTrashOpen(true);
  };

  useEffect(() => {
    if (isConfirmTrashOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isConfirmTrashOpen]);
  
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar onClearStorage={handleClearStorage} showTrash={true} title="Official Registration"/>

      {/* MODAL KONFIRMASI */}
      {isConfirmTrashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass glow-border w-full max-w-sm rounded-2xl border bg-popover/90 p-6 shadow-2xl scale-in-95 animate-in">
            <h3 className="text-lg font-bold text-foreground">Hapus Data Pendaftaran?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus semua data pendaftaran yang tersimpan di browser ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setIsConfirmTrashOpen(false)}
                className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-destructive/90 active:scale-[0.98]"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        
        <HeroHeader/>

        {/* SECTION KONTEN */}
        <section className="flex w-full max-w-4xl flex-col items-center">
          
          {/* INFO PEMBAYARAN */}
          <div className="flex w-full items-center justify-between rounded-xl bg-background/50 p-4">
         
            {/* 1. Spacer Kiri (Sembunyi di HP, Muncul di PC buat penyeimbang) */}
            <div className="hidden flex-1 sm:block"></div>
            
            {/* 2. Nomor Rekening (Di HP otomatis ngikut kiri, di PC ditarik ke tengah) */}
            <div className="flex sm:flex-1 sm:justify-center">
              <span className="text-xl font-bold tracking-widest text-foreground">
                0467897733
              </span>
            </div>
            
            {/* 3. Tombol Salin (Selalu didorong ke ujung kanan) */}
            <div className="flex sm:flex-1 justify-end">
              <button className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                Salin 📋
              </button>
            </div>
          </div>
        </section>
      </div>

          {/* AREA FORM */}
          <div className="w-full max-w-2xl">
            <RegistrationForm />
          </div>
        </section>

        <Footer/>
        
      </div>
    </main>
  )
}
