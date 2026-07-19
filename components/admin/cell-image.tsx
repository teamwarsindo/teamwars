"use client"

import { useState } from "react"
import { compressAndUpload } from "@/lib/cloudinary"
import Swal from "sweetalert2"

export function CellImage({ url, teamName, type, onSave }: { url: string | null, teamName: string, type: "logo" | "bukti", onSave: (url: string) => void }) {
  const [loading, setLoading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const cloudUrl = await compressAndUpload(file, type, teamName);
      const name = new URL(cloudUrl).pathname.split('/').pop();
      onSave(`https://teamwars.web.id/${type}/${name}?t=${Date.now()}`);
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-12 h-12 flex-shrink-0 rounded-md border border-border overflow-hidden group bg-background/50 flex items-center justify-center">
      {loading && <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center"><span className="animate-spin text-primary text-xs">⏳</span></div>}
      {url ? <img src={url} alt={type} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" /> : <span className="text-[10px] text-muted-foreground">{type}</span>}
      
      <label className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="bg-black/80 text-white text-[9px] px-1 py-0.5 rounded shadow">Ubah</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={loading} />
      </label>
    </div>
  )
      }
