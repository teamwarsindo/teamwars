import { kv } from "@vercel/kv";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/components/registration-form";

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <TopBar title="Manajemen Tim (Admin)" showTrash={false} />
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-xl backdrop-blur-md">
           <h3 className="text-xl font-bold mb-2 text-foreground">Akses Ditolak</h3>
           <p className="font-semibold text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
    </main>
  );
}

// ⚡ Parameter sekarang HANYA menerima 'token' karena ID Discord sudah menjadi static route
export default async function AdminEditTeamPage({ params }: { params: Promise<{ token: string }> }) {
  
  const resolvedParams = await params;
  const { token } = resolvedParams;

  if (!token) {
    return <ErrorScreen message="Parameter token tidak ditemukan di URL." />;
  }

  // ==========================================
  // AMBIL DATA TIM PESERTA
  // (Tidak perlu cek ID Admin lagi karena Next.js 404 akan memblokir ID yang salah)
  // ==========================================
  const teamSlug = await kv.get<string>(`token:map:${token}`);
  if (!teamSlug) {
    return <ErrorScreen message={`Token peserta "${token}" tidak terdaftar di sistem kami.`} />;
  }

  const teamData: any = await kv.hgetall(`teams:${teamSlug}`);
  if (!teamData) {
    return <ErrorScreen message={`Data untuk tim ${teamSlug} tidak ditemukan di database.`} />;
  }

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
      <TopBar title="Manajemen Tim (Admin Mode)" showTrash={false} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />
        
        <section className="flex w-full max-w-4xl flex-col items-center">
          <div className="w-full max-w-2xl mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/40 p-4 text-center shadow-sm">
             <p className="font-bold text-emerald-500 mb-1">🛡️ MODE ADMIN AKTIF</p>
             <p className="text-sm text-emerald-600/80">Anda memiliki akses penuh untuk mengubah seluruh data, termasuk Nama Tim dan Email.</p>
          </div>

          <div className="w-full max-w-2xl">
            <RegistrationForm 
              isEditMode={true} 
              isAdminMode={true} 
              initialData={cleanTeamData} 
              editToken={token} 
            />
          </div>
        </section>
        
        <Footer />
      </div>
    </main>
  );
}
