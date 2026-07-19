"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ShieldIcon } from "@/components/icons"
import { loginAdmin } from "@/app/admin/action"

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")

    const result = await loginAdmin(new FormData(e.currentTarget))
    if (result.success) {
      router.push("/admin/dashboard") 
    } else {
      setErrorMsg(result.error as string)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md sm:p-8 shadow-[0_0_40px_-10px_rgba(220,38,38,0.15)]">
      <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl text-center">Admin Login</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && <div className="rounded-lg bg-red-500/10 p-3 text-sm font-medium text-red-500 border border-red-500/20 text-center">{errorMsg}</div>}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
          <input name="email" type="email" required placeholder="••••••••" className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Password</label>
          <input name="password" type="password" required placeholder="••••••••" className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary outline-none" />
        </div>
        <button type="submit" disabled={isLoading} className={cn(buttonVariants({ size: "lg" }), "mt-2 w-full gap-2 !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-70")}>
          <ShieldIcon className="h-4 w-4" /> {isLoading ? "Authenticating..." : "Login"}
        </button>
      </form>
    </div>
  )
      }
        
