import { TopBar, HeroHeader, Footer } from "@/components/layout-shared"
import { LoginForm } from "@/components/admin/login-form"

export default function AdminPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      
      <TopBar title="Admin Access" showTrash={false} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <HeroHeader showDetails={false} />
        <section className="flex w-full flex-col items-center mt-2 lg:mt-6">      
          <LoginForm />
        </section>
        <Footer />
      </div>
    </main>
  )
}
