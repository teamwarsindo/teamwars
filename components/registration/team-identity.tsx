"use client"

import { FileDropzone } from "@/components/file-dropzone"
import { isValidHex, sanitizeTeamName, sanitizeHex } from "@/lib/validators"
import { inputBase, ErrorText } from "./shared"
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
          <FileDropzone id="logo" label="Logo Tim" teamName={namaTim} value={logo} onChange={(f) => { setLogo(f); markTouched("logo") }} error={err("logo")} />
          <FileDropzone id="bukti" label="Bukti Transfer" teamName={namaTim} value={bukti} onChange={(f) => { setBukti(f); markTouched("bukti") }} error={err("bukti")} />
        </div>
      </div>
    </section>
  )
}
