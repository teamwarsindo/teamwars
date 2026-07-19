"use client"

import { useState } from "react"
import { inputBase } from "@/components/registration/shared"

interface InlineEditProps {
  label: string
  value: string
  type?: "text" | "email"
  onSave: (val: string) => Promise<void>
}

export function InlineEditField({ label, value, type = "text", onSave }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (tempValue === value) return setIsEditing(false)
    setIsLoading(true)
    await onSave(tempValue)
    setIsLoading(false)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase text-muted-foreground">{label}</label>
      {!isEditing ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-background/50 border border-border/50 text-sm">
          <span className="flex-1 truncate">{value || "-"}</span>
          <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-primary transition-colors text-xs" title="Edit">✏️</button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <input type={type} value={tempValue} onChange={(e) => setTempValue(e.target.value)} className={`${inputBase} h-9 flex-1 px-2 border-primary`} autoFocus />
          <button onClick={handleSave} disabled={isLoading} className="h-9 w-9 flex items-center justify-center bg-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors" title="Simpan">
            {isLoading ? "⏳" : "💾"}
          </button>
          <button onClick={() => { setIsEditing(false); setTempValue(value); }} className="h-9 w-9 flex items-center justify-center bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="Batal">
            ❌
          </button>
        </div>
      )}
    </div>
  )
            }
