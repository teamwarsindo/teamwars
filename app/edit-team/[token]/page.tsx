import { kv } from "@vercel/kv";
import { notFound } from "next/navigation";
import { CLOSE_TARGET } from "@/lib/config";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/components/registration-form";

// Hapus "use client", biarkan file ini berjalan murni di Server
export default async function EditTeamPage({ params }: { params: { token: string } }) {
  const token = params.token;

  if (!token) {
    notFound();
  }

  // 1. Cari slug tim berdasarkan token di brankas Redis
  const teamSlug = await kv.get<string>(`token:map:${token}`);
  if (!teamSlug) {
    // Jika token asal/salah, langsung arahkan ke halaman 404
    notFound(); 
  }

  // 2. Tarik data lengkap tim
  const teamData: any = await kv.hgetall(`teams:${teamSlug}`);
  if (!teamData) {
    notFound();
  }

  // 3. Cek batas waktu pendaftaran
  const isClosed = Date.now() > CLOSE_TARGET;

  // 4. Pastikan data 'players' di-parse menjadi array
  let parsedPlayers = [];
  try {
    parsedPlayers = typeof teamData.players === 'string' 
      ? JSON.parse(teamData.players) 
      : (teamData.players || []);
  } catch (e) {
    parsedPlayers = [];
  }

  const cleanTeamData = {
    ...teamData,
    players: parsedPlayers
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Manajemen Tim" showTrash={false} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />
        
        <section className="flex w-full max-w-4xl flex-col items-center">
          {isClosed ? (
             <div className="w-full max-w-2xl rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-xl backdrop-blur-md">
               <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-destructive text-3xl">
                 🔒
               </div>
               <h3 className="text-xl font-bold mb-2 text-foreground">Pendaftaran Ditutup</h3>
               <p className="font-semibold text-muted-foreground text-sm">
                 Batas waktu pendaftaran dan modifikasi roster untuk TWI Season 7 telah berakhir. 
                 Silakan hubungi admin di Discord jika terdapat kendala darurat.
               </p>
             </div>
          ) : (
            <div className="w-full max-w-2xl">
              {/* Form registrasi mode edit langsung di-render! */}
              <RegistrationForm 
                isEditMode={true} 
                initialData={cleanTeamData} 
                editToken={token} 
              />
            </div>
          )}
        </section>
        
        <Footer />
      </div>
    </main>
  );
              }
