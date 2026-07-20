"use client"

import { useState } from "react"
import { FileDropzone } from "@/components/file-dropzone"
import { isValidHex, sanitizeTeamName, sanitizeHex } from "@/lib/validators"
import { inputBase, ErrorText } from "./shared"
import { compressAndUpload } from "@/lib/cloudinary"
import type { UploadedFile } from "@/lib/registration"
import Swal from "sweetalert2" 

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
  isEditMode?: boolean 
  isAdminMode?: boolean // 👈 1. Tambahkan prop isAdminMode
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
  markTouched,
  isEditMode = false,
  isAdminMode = false // 👈 2. Beri nilai default false
}: TeamIdentityProps) {
  
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingBukti, setIsUploadingBukti] = useState(false)
  const [previewBukti, setPreviewBukti] = useState<string | null>(null)

  async function handleFileUpload(
    actualFile: File | null, 
    folderName: "logo" | "bukti",
    setFileState: (val: UploadedFile | null) => void,
    setLoadingState: (val: boolean) => void,
    errorKey: string
  ) {
    if (!actualFile) {
      setFileState(null);
      return;
    }

    if (!namaTim || namaTim.trim() === "") {
      Swal.fire({
        title: "Tahan Dulu!",
        text: "Isi nama tim terlebih dahulu sebelum mengunggah gambar.",
        icon: "warning",
        confirmButtonColor: "#AA1348",
        background: "#121212",
        color: "#ffffff"
      });
      return;
    }

    setLoadingState(true);
    markTouched(errorKey);

    try {
      try {
        const dbCheckRes = await fetch(`/api/check-team?name=${encodeURIComponent(namaTim)}`);
        if (dbCheckRes.ok) {
          const dbCheckData = await dbCheckRes.json();
          if (dbCheckData && dbCheckData.available === false) {
            Swal.fire({
              title: "Nama Tim Bentrok!",
              text: `Nama tim "${namaTim}" sudah terdaftar! Gunakan nama lain.`,
              icon: "error",
              confirmButtonColor: "#AA1348",
              background: "#121212",
              color: "#ffffff"
            });
            setLoadingState(false);
            return;
          }
        }
      } catch (checkError) {
        console.warn("API check-team bermasalah. Lanjut ke proses upload...", checkError);
      }

      const cloudinaryUrl = await compressAndUpload(actualFile, folderName, namaTim);
      
      let maskedUrl = cloudinaryUrl;
      try {
        const fileName = new URL(cloudinaryUrl).pathname.split('/').pop();
        const baseUrl = "https://teamwars.web.id"; 
        
        if (folderName === "logo") {
          maskedUrl = `${baseUrl}/logo/${fileName}`;
        } else if (folderName === "bukti") {
          maskedUrl = `${baseUrl}/bukti/${fileName}`;
        }
      } catch (error) {
        console.warn("Gagal masking URL, menggunakan fallback Cloudinary asli", error);
      }
      
      setFileState({
        url: `${maskedUrl}?t=${Date.now()}`,
        name: actualFile.name,
        size: actualFile.size
      });

    } catch (error: any) {
      console.error("Detail Error Upload:", error);
      Swal.fire({
        title: "Gagal Mengunggah!",
        text: error.message === "Failed to fetch" 
          ? "Gagal menghubungi server. Pastikan koneksi internet stabil." 
          : `Terjadi kesalahan: ${error.message}`,
        icon: "error",
        confirmButtonColor: "#AA1348",
        background: "#121212",
        color: "#ffffff"
      });
    } finally {
      setLoadingState(false);
    }
  }

  return (
    <>
      <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Identitas Tim</h2>
            {/* 👈 3. Keterangan berubah dinamis sesuai status Admin */}
            {isEditMode && !isAdminMode && <p className="text-xs text-muted-foreground mt-1">Identitas utama tim dikunci dan tidak dapat diubah lagi.</p>}
            {isEditMode && isAdminMode && <p className="text-xs text-emerald-500 mt-1">Mode Admin aktif: Identitas tim dapat diedit secara bebas.</p>}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">Email Aktif Perwakilan</label>
            {/* 👈 4. Hanya dikunci jika bukan admin */}
            <input 
              disabled={isEditMode && !isAdminMode} 
              id="email" 
              type="email" 
              placeholder="registration@teamwars.web.id" 
              value={email} 
              onChange={(e) => { setEmail(e.target.value); markTouched("email"); }} 
              onBlur={() => markTouched("email")} 
              className={`${inputBase} ${isEditMode && !isAdminMode ? 'opacity-60 cursor-not-allowed bg-muted' : ''} ${err("email") ? "border-destructive" : "border-border"}`} 
            />
            <ErrorText msg={err("email")} />
          </div>
          
          <div>
            <label htmlFor="namaTim" className="mb-1.5 block text-sm font-medium text-foreground">Nama Tim</label>
            {/* 👈 5. Hanya dikunci jika bukan admin */}
            <input 
              disabled={isEditMode && !isAdminMode} 
              id="namaTim" 
              type="text" 
              placeholder="Team Wars Indonesia" 
              value={namaTim} 
              onChange={(e) => setNamaTim(sanitizeTeamName(e.target.value))} 
              onBlur={() => markTouched("namaTim")} 
              className={`${inputBase} ${isEditMode && !isAdminMode ? 'opacity-60 cursor-not-allowed bg-muted' : ''} ${err("namaTim") ? "border-destructive" : "border-border"}`} 
            />
            <ErrorText msg={err("namaTim")} />
          </div>
          
          <div>
            <label htmlFor="hexText" className="mb-1.5 block text-sm font-medium text-foreground">Warna Identitas Tim (Hex)</label>
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-12 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm transition-colors focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary" style={{ backgroundColor: isValidHex(hex) ? hex : "#00BFFF" }}>
                <input type="color" value={isValidHex(hex) ? hex : "#00BFFF"} onChange={(e) => setHex(e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full opacity-0 cursor-pointer" />
              </div>
              <input id="hexText" type="text" placeholder="#00BFFF" value={hex || ""} onChange={(e) => setHex(sanitizeHex(e.target.value))} onBlur={() => markTouched("hex")} className={`${inputBase} font-mono ${err("hex") ? "border-destructive" : "border-border"}`} />    
            </div>
            <ErrorText msg={err("hex")} />
          </div>

          {/* 👈 6. Tampilkan gambar terkunci HANYA jika isEditMode dan BUKAN admin. Kalau admin, mereka bisa pakai Dropzone. */}
          {isEditMode && !isAdminMode ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-2">
               <div className="rounded-xl border border-border bg-background/50 p-4 opacity-70 flex flex-col items-center justify-center text-center">
                 <p className="text-xs font-bold text-muted-foreground mb-3">LOGO TIM (TERKUNCI)</p>
                 {logo?.url && <img src={logo.url} alt="Logo" className="h-24 w-24 rounded-lg object-cover border border-border shadow-sm" />}
               </div>
               <div className="rounded-xl border border-border bg-background/50 p-4 flex flex-col items-center justify-center text-center">
                 <p className="text-xs font-bold text-muted-foreground mb-3">BUKTI TRANSFER (TERKUNCI)</p>
                 {bukti?.url && (
                   <img 
                     src={bukti.url} 
                     alt="Bukti" 
                     onClick={() => setPreviewBukti(bukti.url)}
                     className="h-24 w-auto max-w-full rounded-lg object-contain border border-border shadow-sm cursor-pointer hover:scale-105 transition-transform" 
                     title="Klik untuk memperbesar gambar"
                   />
                 )}
               </div>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      {/* MODAL PREVIEW MENGAMBANG */}
      {previewBukti && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewBukti(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewBukti(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-sm bg-black/50 px-3 py-1 rounded-full"
            >
              Tutup
            </button>
            <img 
              src={previewBukti} 
              alt="Preview Bukti Transfer" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  )
}
