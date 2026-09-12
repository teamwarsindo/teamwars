import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { kv } from "@vercel/kv";
import { OtherMatchesTicker } from "../_components/other-matches-ticker";
import { MatchReportsView } from "../_components/match-reports-view";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "TWI S7 Stream Overlay",
};

interface OverlayPageProps {
  searchParams: Promise<{
    match?: string;
    view?: string;
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

  // SISI KIRI OBS (Match Lain): Full width mengikuti ukuran window OBS
  if (viewMode === "other-matches") {
    return (
      <main className="w-full min-h-screen bg-transparent p-2 font-sans">
        <Suspense fallback={null}>
          <div className="w-full">
            <OtherMatchesTicker
              currentMatchId={currentMatch}
              schedules={schedules}
            />
          </div>
        </Suspense>
      </main>
    );
  }

  // SISI KANAN OBS (Report Utama): Full width mengikuti window OBS
  return (
    <main className="w-full min-h-screen bg-transparent p-2 font-sans">
      <Suspense fallback={<div className="text-white/60 text-xs p-3">Memuat data...</div>}>
        <div className="w-full">
          <MatchReportsView schedules={schedules} isOverlayMode={true} />
        </div>
      </Suspense>
    </main>
  );
}
