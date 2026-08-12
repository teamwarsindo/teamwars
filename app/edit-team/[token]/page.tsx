import { kv } from "@vercel/kv";
import { CLOSE_TARGET } from "@/lib/config";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/app/registration/components/registration-form";

// Komponen Reusable untuk Pesan Error
function ErrorScreen({ message, isAdmin }: { message: string; isAdmin?: boolean }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <TopBar title={`Manajemen Tim ${isAdmin ? "(Admin)" : ""}`} showTrash={false} />
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-xl backdrop-blur-md">
          <h3 className="mb-2 text-xl font-bold text-foreground">Akses Ditolak</h3>
          <p className="text-sm font-semibold text-muted-foreground">{message}</p>
        </div>
      </div>
    </main>
  );
}

export default async function EditTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  const resolvedSearchParams = await searchParams;
  const adminKey = resolvedSearchParams.key;

  // ==========================================
  // 1. VALIDASI MODE ADMIN (Menggunakan Environment Variable)
  // ==========================================
  const ADMIN_SECRET = process.env.BASIC_AUTH_PWD;
  const isAdminMode = Boolean(ADMIN_SECRET && adminKey === ADMIN_SECRET);

  // Jika menyertakan parameter ?key= tapi nilainya tidak sesuai dengan ENV
  if (adminKey && !isAdminMode) {
    return <ErrorScreen message="Key Admin tidak valid atau tidak dikenali!" isAdmin={true} />;
  }

  if (!token) {
    return <ErrorScreen message="Parameter token tidak ditemukan di URL." isAdmin={isAdminMode} />;
  }

  // ==========================================
  // 2. PENGAMBILAN DATA DATABASE
  // ==========================================
  const teamSlug = await kv.get<string>(`token:map:${token}`);

  // Hanya tampilkan error token tidak terdaftar JIKA BUKAN ADMIN
  if (!teamSlug && !isAdminMode) {
    return <ErrorScreen message={`Token "${token}" tidak terdaftar di sistem kami.`} isAdmin={isAdminMode} />;
  }

  let cleanTeamData = null;

  if (teamSlug) {
    const teamData: any = await kv.hgetall(`teams:${teamSlug}`);
    
    if (!teamData && !isAdminMode) {
      return <ErrorScreen message={`Data untuk tim tidak ditemukan di database.`} isAdmin={isAdminMode} />;
    }

    if (teamData) {
      let parsedPlayers = [];
      try {
        parsedPlayers = typeof teamData.players === "string" ? JSON.parse(teamData.players) : teamData.players || [];
      } catch (e) {
        parsedPlayers = [];
      }
      cleanTeamData = { ...teamData, players: parsedPlayers };
    }
  }

  // ==========================================
  // 3. LOGIKA WAKTU (ADMIN BYPASS)
  // ==========================================
  const isClosed = Date.now() > CLOSE_TARGET;

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title={`Manajemen Tim ${isAdminMode ? "(Admin Mode)" : ""}`} showTrash={false} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />

        <section className="flex w-full max-w-4xl flex-col items-center">
          {/* Banner Khusus Jika Admin Mode Aktif */}
          {isAdminMode && (
            <div className="mb-6 w-full max-w-2xl rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-center shadow-sm">
              <p className="mb-1 font-bold text-emerald-500">🛡️ MODE ADMIN AKTIF</p>
              <p className="text-sm text-emerald-600/80">
                Anda memiliki akses penuh untuk mengubah seluruh data, dan dapat mengedit form ini meskipun waktu pendaftaran telah ditutup.
              </p>
            </div>
          )}

          {/* Tampilan Terkunci (Jika Waktu Habis DAN Bukan Admin) */}
          {isClosed && !isAdminMode ? (
            <div className="w-full max-w-2xl rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-xl backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-3xl text-destructive">
                🔒
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">Pendaftaran Ditutup</h3>
              <p className="text-sm font-semibold text-muted-foreground">
                Batas waktu pendaftaran dan modifikasi roster untuk TWI Season 7 telah berakhir.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-2xl">
              <RegistrationForm
                isEditMode={true}
                isAdminMode={isAdminMode}
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
