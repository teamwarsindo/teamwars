"use client"

import { useState } from "react"
import { FileDropzone } from "@/components/file-dropzone"
import { isValidHex, sanitizeTeamName, sanitizeHex } from "@/lib/validators"
import { inputBase, ErrorText } from "./shared"
import { compressAndUpload } from "@/lib/cloudinary"
import type { UploadedFile } from "@/lib/registration"

interface TeamIdentityProps {
  email: string
  namaTim: string
  hex: string
  logo: UploadedFile | null
  bukti: UploadedFile | null
  setEmail: (val: string) => void
  setNamaTim: (val: string) => void
  setHex: (val: string) => void
  setLogo: (val: UploadedFile | null) => void
  setBukti: (val: UploadedFile | null) => void
  err: (key: string) => string | undefined
  markTouched: (key: string) => void
}

export function TeamIdentity({ 
  email, 
  namaTim, 
  hex, 
  logo, 
  bukti, 
  setEmail, 
  setNamaTim, 
  setHex, 
  setLogo, 
  setBukti, 
  err, 
  markTouched 
}: TeamIdentityProps) {
  
  // Indikator loading upload
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingBukti, setIsUploadingBukti] = useState(false)

  // Fungsi tunggal penanganan upload yang sudah disinkronkan dengan JSX
  async function handleFileUpload(
    actualFile: File | null, 
    folderName: "logo" | "bukti",
    setFileState: (val: UploadedFile | null) => void,
    setLoadingState: (val: boolean) => void,
    errorKey: string
  ) {
    // Jika file dihapus dari dropzone
    if (!actualFile) {
      setFileState(null);
      return;
    }

    // SYARAT 1: Cek nama tim kosong atau tidak
    if (!namaTim || namaTim.trim() === "") {
      alert("Isi nama tim terlebih dahulu ngab!");
      return;
    }

    setLoadingState(true);
    markTouched(errorKey);

    try {
      // SYARAT 2: Cek ketersediaan nama tim ke database API check-team
      const dbCheckRes = await fetch(`/api/check-team?name=${encodeURIComponent(namaTim)}`);
      const dbCheckData = await dbCheckRes.json();

      if (dbCheckData && dbCheckData.available === false) {
        alert(`Nama tim ${namaTim} sudah terdaftar! Gunakan nama lain.`);
        setLoadingState(false);
        return;
      }

      // SYARAT 3: Lolos validasi, eksekusi kompresi dan upload ke Cloudinary
      const cloudinaryUrl = await compressAndUpload(actualFile, folderName, namaTim);
      
      // Sukses! Update UI menggunakan setter props bawaan
      setFileState({
        url: `${cloudinaryUrl}?t=${Date.now()}`, // Anti-cache browser
        name: actualFile.name,
        size: actualFile.size
      });

    } catch (error: any) {
      alert(`Upload gagal: ${error.message}`);
    } finally {
      setLoadingState(false);
    }
  }

  return (
    <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
        <div><h2 className="text-base font-semibold text-foreground">Identitas Tim</h2></div>
      </div>
      <div className="flex flex-col gap-4">
        
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">Email Aktif Perwakilan</label>
          <input id="email" type="email" placeholder="registration@teamwars.web.id" value={email} onChange={(e) => { setEmail(e.target.value); markTouched("email"); }} onBlur={() => markTouched("email")} className={`${inputBase} ${err("email") ? "border-destructive" : "border-border"}`} />
          <ErrorText msg={err("email")} />
        </div>
        
        <div>
          <label htmlFor="namaTim" className="mb-1.5 block text-sm font-medium text-foreground">Nama Tim</label>
          <input id="namaTim" type="text" placeholder="Team Wars Indonesia" value={namaTim} onChange={(e) => setNamaTim(sanitizeTeamName(e.target.value))} onBlur={() => markTouched("namaTim")} className={`${inputBase} ${err("namaTim") ? "border-destructive" : "border-border"}`} />
          <ErrorText msg={err("namaTim")} />
        </div>
        
        <div>
          <label htmlFor="hexText" className="mb-1.5 block text-sm font-medium text-foreground">Warna Identitas Tim (Hex)</label>
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-12 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm transition-colors focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary" style={{ backgroundColor: isValidHex(hex) ? hex : "#00BFFF" }}>
              <input type="color" value={isValidHex(hex) ? hex : "#00BFFF"} onChange={(e) => setHex(e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </div>
            <input id="hexText" type="text" placeholder="#00BFFF" value={hex || ""} onChange={(e) => setHex(sanitizeHex(e.target.value))} onBlur={() => markTouched("hex")} className={`${inputBase} font-mono ${err("hex") ? "border-destructive" : "border-border"}`} />
          </div>
          <ErrorText msg={err("hex")} />
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">Warna ini akan digunakan untuk Role di Discord dan identitas tim di profil.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            {isUploadingLogo && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-xl backdrop-blur-sm">
                <span className="text-sm font-bold text-primary animate-pulse">Mengompres & Upload...</span>
              </div>
            )}
            <FileDropzone 
              id="logo" 
              label="Logo Tim" 
              teamName={namaTim} 
              value={logo} 
              onChange={(data) => handleFileUpload(data ? data.rawFile : null, "logo", setLogo, setIsUploadingLogo, "logo")} 
              error={err("logo")} 
            />
          </div>
          
          <div className="relative">
            {isUploadingBukti && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-xl backdrop-blur-sm">
                <span className="text-sm font-bold text-primary animate-pulse">Mengompres & Upload...</span>
              </div>
            )}
            <FileDropzone 
              id="bukti" 
              label="Bukti Transfer" 
              teamName={namaTim} 
              value={bukti} 
              onChange={(data) => handleFileUpload(data ? data.rawFile : null, "bukti", setBukti, setIsUploadingBukti, "bukti")} 
              error={err("bukti")} 
            />
          </div>
        </div>

      </div>
    </section>
  )
}
