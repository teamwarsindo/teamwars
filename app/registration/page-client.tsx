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

      <TopBar onClearStorage={handleClearStorage} showTrash="{true}" title="Official Registration"/>

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
          <div className="mb-8 w-full max-w-2xl">
            <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
              <div className="mb-5 border-b border-border pb-5 sm:mb-6 sm:pb-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-5 w-1 rounded-full bg-primary"></div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Pembayaran
                  </p>
                </div>
                <p className="text-center text-3xl font-black text-foreground w-full">
                  Rp 250.000
                </p>
              </div>

              <div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bank Tujuan</span>
                    <span className="font-semibold text-foreground">BCA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Atas Nama</span>
                    <span className="font-semibold text-foreground">Victor Widiputra</span>
                  </div>
                </div>

                {/* Pembungkus utama: ubah ke justify-center dan tambahkan relative */}
                <div className="mt-5 relative flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10 p-3 h-14">
                  {/* Span nomor rekening dibiarkan seperti ini */}
                  <span className="font-mono text-lg font-bold tracking-widest text-foreground">
                    {accountNumber}
                  </span>
                  {/* Tombol salin diberi absolute right-3 agar menempel di kanan */}
                  <button
                    onClick={handleCopy}
                    className="absolute right-3 flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95"
                    title="Salin nomor rekening"
                  >
                    {isCopied ? "Tersalin! ✓" : "Salin 📋"}
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
