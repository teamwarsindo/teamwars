"use client";

import { useEffect, useState } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/components/registration-form";

export default function EditTeamPage({ params }: { params: { token: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeamData() {
      try {
        const res = await fetch(`/api/edit-team?token=${params.token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Token kadaluarsa.");
        
        setInitialData(data.team);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTeamData();
  }, [params.token]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Manajemen Tim" showTrash={false} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />
        <section className="flex w-full max-w-4xl flex-col items-center">
          {isLoading ? (
             <div className="py-20 text-center text-primary animate-pulse font-bold">Memuat Data Tim...</div>
          ) : errorMsg ? (
             <div className="w-full max-w-2xl rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
               <p className="font-bold">{errorMsg}</p>
             </div>
          ) : (
            <div className="w-full max-w-2xl">
              {/* Panggil komponen registrasi lama, tapi suntikkan data dan aktifkan mode edit */}
              <RegistrationForm isEditMode={true} initialData={initialData} />
            </div>
          )}
        </section>
        <Footer />
      </div>
    </main>
  );
              }
