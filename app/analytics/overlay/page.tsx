import { Suspense } from "react";
import { kv } from "@vercel/kv";
import { OtherMatchesTicker } from "../_components/other-matches-ticker";
import { MatchReportsView } from "../_components/match-reports-view";

export const dynamic = "force-dynamic";

interface OverlayPageProps {
  searchParams: Promise<{
    match?: string;
    view?: string; // "other-matches" (kiri) atau kosong/report (kanan)
  }>;
}

async function getSchedulesData() {
  try {
    const schedules = await kv.get<any[]>("twi:schedules");
    return schedules || [];
  } catch (error) {
    console.error("Gagal ambil schedules untuk overlay:", error);
    return [];
  }
}

export default async function OverlayPage(props: OverlayPageProps) {
  const searchParams = await props.searchParams;
  const schedules = await getSchedulesData();
  const currentMatch = searchParams.match || "";
  const viewMode = searchParams.view || "";

  // ── SISI KIRI OBS: SKOR MATCH LAIN (EXCLUDE MATCH UTAMA) ──
  if (viewMode === "other-matches") {
    return (
      <main className="min-h-screen bg-transparent p-2 flex justify-start items-start font-sans">
        <Suspense fallback={null}>
          <OtherMatchesTicker
            currentMatchId={currentMatch}
            schedules={schedules}
          />
        </Suspense>
      </main>
    );
  }

  // ── SISI KANAN OBS: REPORT MATCH UTAMA ──
  return (
    <main className="min-h-screen bg-transparent p-2 font-sans">
      <Suspense fallback={<div className="text-white/60 text-xs p-3">Memuat data...</div>}>
        <MatchReportsView schedules={schedules} isOverlayMode={true} />
      </Suspense>
    </main>
  );
}
