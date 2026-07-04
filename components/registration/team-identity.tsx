"use client"

import { useState } from "react"
import { FileDropzone } from "@/components/file-dropzone"
import { isValidHex, sanitizeTeamName, sanitizeHex } from "@/lib/validators"
import { inputBase, ErrorText } from "./shared"
import { compressAndUpload } from "@/lib/cloudinary" // <-- Import fungsi uploader
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

export function TeamIdentity({ email, namaTim, hex, logo, bukti, setEmail, setNamaTim, setHex, setLogo, setBukti, err, markTouched }: TeamIdentityProps) {
  // State untuk indikator loading masing-masing gambar
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingBukti, setIsUploadingBukti] = useState(false)

  // Fungsi dinamis buat nge-handle kompresi & upload pas file dipilih
  const handleFileUpload = async (
    fileData: any, 
    folderName: "logo" | "bukti_transfer", 
    setFileState: (val: any) => void,
    setLoadingState: (val: boolean) => void,
    fieldKey: string
  ) => {
    // Kalau user menghapus file dari dropzone
    if (!fileData) {
      setFileState(null)
      markTouched(fieldKey)
      return
    }

    // Ambil objek File asli (Asumsi FileDropzone me-return File atau objek yang punya properti .file)
    const actualFile = fileData.rawFile || fileData.file || fileData;
    if (!(actualFile instanceof File)) return;

    try {
      setLoadingState(true)
      
      // Eksekusi kompresi dan upload
      const cloudinaryUrl = await compressAndUpload(actualFile, folderName)
      
      // Simpan URL ke state (Sesuaikan formatnya dengan kebutuhan tipe UploadedFile lu)
      setFileState({ 
        url: cloudinaryUrl, // URL ini yang nanti dikirim ke /api/submit
        name: actualFile.name,
        size: actualFile.size
      })
      
    } catch (error) {
      alert(`Gagal mengunggah ${fieldKey}. Pastikan internet stabil dan format gambar didukung.`)
      setFileState(null)
    } finally {
      setLoadingState(false)
      markTouched(fieldKey)
    }
  }

  return (
    <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
        <div><h2 className="text-base font-semibold text-foreground">Identitas Tim</h2></div>
      </div>
      <div className="flex flex-col gap-4">
        
        {/* ... (Bagian Email, Nama Tim, dan Hex biarkan sama seperti aslinya) ... */}
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
          {/* Tambahkan indikator loading di label atau props dropzone (jika FileDropzone dukung prop isLoading) */}
          <div className="relative">
            {isUploadingLogo && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-xl backdrop-blur-sm"><span className="text-sm font-bold text-primary animate-pulse">Mengompres & Upload...</span></div>}
            <FileDropzone 
              id="logo" 
              label="Logo Tim" 
              teamName={namaTim} 
              value={logo} 
              onChange={(f) => handleFileUpload(f, "logo", setLogo, setIsUploadingLogo, "logo")} 
              error={err("logo")} 
            />
          </div>
          
          <div className="relative">
            {isUploadingBukti && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-xl backdrop-blur-sm"><span className="text-sm font-bold text-primary animate-pulse">Mengompres & Upload...</span></div>}
            <FileDropzone 
              id="bukti" 
              label="Bukti Transfer" 
              teamName={namaTim} 
              value={bukti} 
              onChange={(f) => handleFileUpload(f, "bukti_transfer", setBukti, setIsUploadingBukti, "bukti")} 
              error={err("bukti")} 
            />
          </div>
        </div>

      </div>
    </section>
  )
}
