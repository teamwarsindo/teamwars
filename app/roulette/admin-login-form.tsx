"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, User, AlertCircle } from "lucide-react";

export default function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login gagal");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Username atau password salah");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-md sm:p-8">
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20 text-primary shadow-lg shadow-primary/10">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-wide text-foreground">Login Admin Roulette</h1>
        <p className="mt-1 text-xs text-muted-foreground">Masukkan kredensial panitia untuk mengontrol roulette</p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username admin..."
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password admin..."
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full cursor-pointer rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {isLoading ? "Verifikasi..." : "Masuk & Buka Kontrol Roulette"}
        </button>
      </form>
    </div>
  );
        }
