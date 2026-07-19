"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { FileDropzone } from "@/components/file-dropzone"
import { compressAndUpload } from "@/lib/cloudinary"
import Swal from "sweetalert2"

export function EditorDocument({ formData, setFormData }: { formData: TeamData, setFormData: (d: TeamData) => void }) {
  const [upLogo, setUpLogo] = useState(false)
  const [upBukti, setUpBukti] = useState(false)

  async function handleUpload(file: File | null, type: "logo" | "bukti") {
    if (!file || !formData.namaTim.trim()) return;
    const setLoader = type === "logo" ? setUpLogo : setUpBukti;
    
    setLoader(true);
    try {
      const cloudUrl = await compressAndUpload(file, type, formData.namaTim);
      const name = new URL(cloudUrl).pathname.split('/').pop();
      const maskedUrl = `https://teamwars.web.id/${type}/${name}?t=${Date.now()}`;
      
      setFormData(type === "logo" 
        ? { ...formData, logoTim: maskedUrl } 
        : { ...formData, buktiTransfer: maskedUrl });
    } catch (error: any) {
      Swal.fire("Gagal Upload", error.message, "error");
    } finally {
      setLoader(false);
    }
  }

  return (
    <section className="glass glow-border rounded-xl border p-5 bg-background/50">
      <h3 className="text-sm font-bold text-primary mb-4 border-b border-border/50 pb-2">Dokumen Pendukung (Overwrite)</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative">
          {upLogo && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-xl"><span className="text-xs font-bold text-primary animate-pulse">Uploading...</span></div>}
          <FileDropzone id="logo" label="Update Logo" teamName={formData.namaTim} value={formData.logoTim ? { url: formData.logoTim, name: "logo", size: 0 } : null} onChange={(d) => handleUpload(d?.rawFile || null, "logo")} />
        </div>
        <div className="relative">
          {upBukti && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-xl"><span className="text-xs font-bold text-primary animate-pulse">Uploading...</span></div>}
          <FileDropzone id="bukti" label="Update Bukti" teamName={formData.namaTim} value={formData.buktiTransfer ? { url: formData.buktiTransfer, name: "bukti", size: 0 } : null} onChange={(d) => handleUpload(d?.rawFile || null, "bukti")} />
        </div>
      </div>
    </section>
  )
  }
      
