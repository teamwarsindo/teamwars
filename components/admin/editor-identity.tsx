"use client"

import { TeamData } from "@/types/admin"
import { inputBase } from "@/components/registration/shared"
import { isValidHex, sanitizeTeamName, sanitizeHex } from "@/lib/validators"

export function EditorIdentity({ formData, setFormData }: { formData: TeamData, setFormData: (d: TeamData) => void }) {
  return (
    <section className="glass glow-border rounded-xl border p-5 bg-background/50 space-y-4">
      <h3 className="text-sm font-bold text-primary border-b border-border/50 pb-2">Identitas Dasar</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Nama Tim</label>
          <input type="text" value={formData.namaTim} onChange={(e) => setFormData({...formData, namaTim: sanitizeTeamName(e.target.value)})} className={`${inputBase} border-border`} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Email Kapten</label>
          <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`${inputBase} border-border`} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Warna Hex</label>
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-12 rounded-lg border border-border overflow-hidden" style={{ backgroundColor: isValidHex(formData.hex) ? formData.hex : "#00BFFF" }}>
            <input type="color" value={isValidHex(formData.hex) ? formData.hex : "#00BFFF"} onChange={(e) => setFormData({...formData, hex: e.target.value.toUpperCase()})} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          <input type="text" value={formData.hex} onChange={(e) => setFormData({...formData, hex: sanitizeHex(e.target.value)})} className={`${inputBase} font-mono border-border`} />      
        </div>
      </div>
    </section>
  )
            }
