"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // 👈 Kita pakai hook navigasi bawaan Next.js
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/components/registration-form";

export default function EditTeamPage() {
  const params = useParams();
  // Tarik token dengan aman dari parameter URL
  const token = params?.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 🛑 Jangan nembak API kalau token di URL belum kebaca sama browser
    if (!token) return;

    async function fetchTeamData() {
      try {
        console.log("Mencari data untuk token:", token); // 👈 Buat alat bantu debug di F12
        
        const res = await fetch(`/api/edit-team?token=${token}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Token kadaluarsa atau tidak valid.");
        }
        
        setInitialData(data.team);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTeamData();
  }, [token]); // 👈 Effect akan jalan ulang kalau token udah siap

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Manajemen Tim" showTrash={false} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />
        <section className="flex w-full max-w-4xl flex-col items-center">
          {isLoading ? (
             <div className="py-20 text-center text-primary animate-pulse font-bold">
               Memverifikasi Akses Token...
             </div>
          ) : errorMsg ? (
             <div className="w-full max-w-2xl rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
               <h3 className="text-lg font-bold mb-2">Akses Ditolak</h3>
               <p className="font-semibold">{errorMsg}</p>
             </div>
          ) : (
            <div className="w-full max-w-2xl">
              {/* Form registrasi mode edit */}
              <RegistrationForm isEditMode={true} initialData={initialData} />
            </div>
          )}
        </section>
        <Footer />
      </div>
    </main>
  );
}
