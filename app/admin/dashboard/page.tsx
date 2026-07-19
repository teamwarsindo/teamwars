import { getTeamsCore } from "./actions"
import { DashboardClient } from "@/components/admin/dashboard-client"
import { TopBar, Footer } from "@/components/layout-shared"

// Halaman ini berjalan di server (Tanpa "use client")
export default async function AdminDashboard() {
  // Ambil data langsung dari server saat halaman dimuat
  const teams = await getTeamsCore()

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Admin Command Center" />

      <div className="relative z-10 flex flex-1 flex-col w-full pb-10">
        {/* Oper data ke Client Component */}
        <DashboardClient initialTeams={teams} />
      </div>

      <Footer />
    </main>
  )
}
