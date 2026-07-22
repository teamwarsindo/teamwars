"use client";

import { useSearchParams } from 'next/navigation';
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/app/registration/components/registration-form";
import { STORAGE_KEY } from "@/app/registration/utils/lib-registration";

export default function TesterClient() {
  const searchParams = useSearchParams();
  const testerKey = searchParams.get("key");

  const handleClearStorage = () => {
    if (confirm("Hapus data pendaftaran tester di browser ini?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  // 🎯 DATA DUMMY: Khusus untuk simulasi pengujian Edit Tim
  const dummyEditData = {
    namaTim: "Tim Tester TWI",
    email: "tester@teamwars.web.id",
    warna: "#5865F2",
    logoTim: "https://teamwars.web.id/logo-dc.png",
    buktiTransfer: "https://teamwars.web.id/logo-dc.png",
    players: [
      { id: "1", role: "Ketua", namaLengkap: "Budi Santoso", discord: "budi", ign: "BudiMaster", duelId: "123-456-789" },
      { id: "2", role: "Wakil Ketua", namaLengkap: "Andi Saputra", discord: "andi", ign: "AndiPro", duelId: "987-654-321" },
      { id: "3", role: "Anggota", namaLengkap: "Cici", discord: "cici", ign: "CiciGirl", duelId: "111-222-333" },
      { id: "4", role: "Anggota", namaLengkap: "Dedi", discord: "dedi", ign: "DediBoy", duelId: "444-555-666" },
      { id: "5", role: "Anggota", namaLengkap: "Eka", discord: "eka", ign: "EkaMan", duelId: "777-888-999" },
    ]
  };

  const renderContent = () => {
    if (testerKey === "registration") {
      return <RegistrationForm isTester={true} />;
    }
    if (testerKey === "edit-team") {
      return (
        <RegistrationForm 
          isEditMode={true} 
          isAdminMode={true} // Dibuka paksa gemboknya agar enak di-test
          isTester={true} 
          initialData={dummyEditData} 
          editToken="dummy-token-123" 
        />
      );
    }
    
    // Fallback: Jika diakses tanpa parameter (hanya /tester)
    return (
       <div className="w-full max-w-2xl rounded-xl border border-primary/30 bg-primary/5 p-8 text-center shadow-xl backdrop-blur-md">
         <h3 className="text-xl font-bold mb-6 text-foreground">🎛️ Menu Tester Internal</h3>
         <div className="flex flex-col gap-4 sm:flex-row justify-center">
           <a href="/tester?key=registration" className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all">
             Tes Registrasi Baru
           </a>
           <a href="/tester?key=edit-team" className="rounded-lg border border-primary/50 bg-background px-6 py-3 text-sm font-bold text-primary hover:bg-primary/10 transition-all">
             Tes Edit Tim
           </a>
         </div>
       </div>
    );
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar 
        onClearStorage={testerKey === "registration" ? handleClearStorage : undefined} 
        showTrash={testerKey === "registration"} 
        title="🧪 TESTER HUB" 
      />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />

        <section className="flex w-full max-w-4xl flex-col items-center">
          {testerKey && (
            <div className="w-full max-w-2xl mb-6 rounded-lg bg-yellow-500/10 border border-yellow-500/40 p-4 text-center shadow-sm">
               <p className="font-bold text-yellow-500 mb-1">⚠️ MODE TESTER ({testerKey.toUpperCase()})</p>
               <p className="text-sm text-yellow-600/80">Data tidak akan disimpan ke Database. Hanya dikirim ke Channel Log.</p>
            </div>
          )}

          <div className="w-full max-w-2xl">
            {renderContent()}
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
  
