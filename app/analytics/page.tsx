import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { kv } from "@vercel/kv";
import { MatchReportsView } from "./_components/match-reports-view";
import { OtherMatchesTicker } from "./_components/other-matches-ticker";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams: Promise<{
    tab?: string;
    match?: string;
    week?: string;
    team?: string;
    overlay?: string;
    widget?: string;
  }>;
}

// Fetch master schedules dari Vercel KV
async function getSchedulesData() {
  try {
    const schedules = await kv.get<any[]>("twi:schedules");
    return schedules || [];
  } catch (error) {
    console.error("Gagal mengambil data schedules dari KV:", error);
    return [];
  }
}

export default async function AnalyticsPage(props: AnalyticsPageProps) {
  const searchParams = await props.searchParams;
  const schedules = await getSchedulesData();

  const currentMatch = searchParams.match || "";
  const activeTab = searchParams.tab || "reports";
  const isOtherMatchesWidget = searchParams.widget === "other-matches";
  const isOverlay = searchParams.overlay === "true";

  // 1. OBS WIDGET MODE (KOLOM KIRI) -> ?match=match-48&widget=other-matches
  if (isOtherMatchesWidget) {
    return (
      <main className="min-h-screen bg-transparent p-2 flex justify-start items-start">
        <Suspense fallback={null}>
          <OtherMatchesTicker
            currentMatchId={currentMatch}
            schedules={schedules}
          />
        </Suspense>
      </main>
    );
  }

  // 2. OBS OVERLAY MODE (KOLOM KANAN) -> ?match=match-48&overlay=true
  if (isOverlay) {
    return (
      <main className="min-h-screen bg-transparent p-2">
        <Suspense fallback={<div className="text-white text-xs p-4">Loading report...</div>}>
          <MatchReportsView schedules={schedules} isOverlayMode={true} />
        </Suspense>
      </main>
    );
  }

  // 3. TAMPILAN NORMAL WEB (Pengguna HP & Desktop)
  return (
    <main className="min-h-screen bg-background text-foreground pb-16">
      {/* Container Utama */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Banner Identitas Turnamen */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-lg border border-border bg-card">
            <Image
              src="/logo-twi.png" // Sesuaikan path logo TWI jika ada di public
              alt="Team Wars Indonesia S7"
              fill
              className="object-cover p-1"
              priority
            />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-sans">
              Team Wars Indonesia
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SEASON 7 — DUEL LINKS
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Platform kompetisi beregu Yu-Gi-Oh! Duel Links terbesar di Indonesia. Pantau jadwal pertandingan, klasemen grup, dan hasil match secara real-time.
          </p>
        </div>

        {/* Tab Navigation Pill */}
        <div className="flex justify-center items-center gap-2 pt-2">
          <Link
            href="/analytics?tab=reports"
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-xs ${
              activeTab === "reports"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Match Reports
          </Link>
          <Link
            href="/analytics?tab=standings"
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-xs ${
              activeTab === "standings"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Klasemen
          </Link>
        </div>

        {/* Konten Utama Berdasarkan Tab */}
        <div className="pt-2">
          {activeTab === "standings" ? (
            <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
              Klasemen sementara grup akan segera diperbarui.
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
                  Memuat data pertandingan...
                </div>
              }
            >
              <MatchReportsView schedules={schedules} />
            </Suspense>
          )}
        </div>

      </div>
    </main>
  );
      }
