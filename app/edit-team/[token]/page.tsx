import { kv } from "@vercel/kv";
import { CLOSE_TARGET } from "@/lib/config";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/components/registration-form";

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <TopBar title="Manajemen Tim" showTrash={false} />
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-xl backdrop-blur-md">
           <h3 className="text-xl font-bold mb-2 text-foreground">Akses Ditolak</h3>
           <p className="font-semibold text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
    </main>
  );
}

// ⚡ 1. Tipe datanya kita ubah jadi Promise
export default async function EditTeamPage({ params }: { params: Promise<{ token: string }> }) {
  
  // ⚡ 2. KUNCI UTAMA: Wajib di-AWAIT sebelum diambil tokennya!
  const resolvedParams = await params;
  const token = resolvedParams.token;

  if (!token) {
    return <ErrorScreen message="Parameter token tidak ditemukan di URL." />;
  }

  // 1. Cari slug tim berdasarkan token di brankas Redis
  const teamSlug = await kv.get<string>(`token:map:${token}`);
  if (!teamSlug) {
    return <ErrorScreen message={`Token "${token}" tidak terdaftar di sistem kami. Pastikan Anda menggunakan link dari email terbaru.`} />;
  }

  // 2. Tarik data lengkap tim
  const teamData: any = await kv.hgetall(`teams:${teamSlug}`);
  if (!teamData) {
    return <ErrorScreen message={`Data untuk tim ${teamSlug} tidak ditemukan di database.`} />;
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
               </p>
             </div>
          ) : (
            <div className="w-full max-w-2xl">
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
  
