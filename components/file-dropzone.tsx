"use client"

import { useRef, useState, type DragEvent } from "react"
import { UploadIcon, CloseIcon } from "@/components/icons"

interface FileDropzoneProps {
  id: string
  label: string
  hint?: string
  value: any | null 
  onChange: (file: any | null) => void
  error?: string
  teamName?: string 
}

export function FileDropzone({ id, label, hint, value, onChange, error, teamName = "twi-team" }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setLocalError(null)

    // Validasi Format Terkunci
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setLocalError("Format ditolak ngab! Cuma terima JPG, PNG, atau WEBP.")
      return
    }

    try {
      setIsReading(true)
      const reader = new FileReader()
      
      reader.onloadend = () => {
        // Output Data Objek Baru
        onChange({ 
          name: file.name, 
          size: file.size, 
          base64: reader.result as string, // Preview lokal
          rawFile: file                    // File mentah untuk Canvas
        })
        setIsReading(false)
      }
      
      reader.onerror = () => {
        setLocalError("Gagal membaca berkas gambar.")
        setIsReading(false)
      }
      
      reader.readAsDataURL(file)
    } catch {
      setLocalError("Gagal memproses gambar.")
      setIsReading(false)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (!isReading) handleFile(e.dataTransfer.files?.[0])
  }

  const shownError = error ?? localError

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>

      {value ? (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-3 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200">
          <img src={value.base64} alt={`Pratinjau ${label}`} className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{value.name}</p>
            <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              ✓ Siap dieksekusi ({(value.size / 1024).toFixed(0)} KB)
            </p>
          </div>
          <button type="button" onClick={() => { onChange(null); setLocalError(null); if (inputRef.current) inputRef.current.value = "" }} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isReading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!isReading) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
            dragging ? "border-primary bg-primary/10 scale-[1.02]" : 
            shownError ? "border-destructive bg-destructive/5" : 
            isReading ? "border-primary/50 bg-primary/5 opacity-80 cursor-wait" : 
            "border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          {isReading ? (
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
             <UploadIcon className="h-6 w-6 text-muted-foreground" />
          )}
          
          <p className="text-sm font-medium text-foreground">
            {isReading ? (
              <span className="text-primary font-bold animate-pulse">Membaca berkas... ⏳</span>
            ) : (
              "Seret & lepas atau klik untuk unggah"
            )}
          </p>
          <p className="text-xs text-muted-foreground">{hint ?? "PNG / JPG / WEBP"}</p>
        </div>
      )}
      <input ref={inputRef} id={id} type="file" accept=".png, .jpg, .jpeg, .webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {shownError && <p className="mt-1 text-xs font-medium text-destructive">{shownError}</p>}
    </div>
  )
}
