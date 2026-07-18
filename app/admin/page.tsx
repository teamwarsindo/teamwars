"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ShieldIcon } from "@/components/icons"
import { loginAdmin } from "./action"

export default function AdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")

    const formData = new FormData(e.currentTarget)
    const result = await loginAdmin(formData)

    if (result.success) {
      // Arahkan ke dashboard admin sesungguhnya jika berhasil
      router.push("/admin/dashboard") 
    } else {
      setErrorMsg(result.error as string)
      setIsLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      
      {/* Ambient esports glow */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Admin Access" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
      
        
          
        {/* SECTION KONTEN: Form Login Admin */}
        <section className="flex w-full flex-col items-center text-center mt-2 lg:mt-6">      
          
          <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md sm:p-8 shadow-[0_0_40px_-10px_rgba(220,38,38,0.15)]">
            <h2 className="mb-2 text-xl font-bold tracking-tight sm:text-2xl">
              Admin Login
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Masukkan kredensial untuk mengakses dashboard.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              {/* Pesan Error */}
              {errorMsg && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm font-medium text-red-500 border border-red-500/20 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="••••••••"
                  className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-4 h-11 w-full gap-2 whitespace-nowrap !bg-red-600 !text-white hover:!bg-red-700 shadow-[0_0_30px_-6px_rgba(220,38,38,0.5)] transition-all duration-300",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
              >
                <ShieldIcon className="h-4 w-4" />
                {isLoading ? "Authenticating..." : "Login"}
              </button>
            </form>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  )
}
