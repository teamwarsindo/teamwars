import { getTeamsCore } from "./actions"
import { DashboardLayout } from "@/components/admin/dashboard-layout"
import { TopBar, Footer } from "@/components/layout-shared"

export default async function AdminDashboard() {
  const teams = await getTeamsCore()

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      
      <TopBar title="Admin Command Center" showTrash={false} />

      <div className="relative z-10 flex flex-1 flex-col w-full pb-10">
        {/* Memanggil layout yang memiliki fitur Tab, Logout, dan Grid Table */}
        <DashboardLayout teams={teams} />
      </div>

      <Footer />
    </main>
  )
}
