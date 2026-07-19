"use client"

import { useState } from "react"
import { inputBase } from "@/components/registration/shared"

export function CellText({ val, onSave, type = "text" }: { val: string, onSave: (v: string) => void, type?: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [temp, setTemp] = useState(val)

  if (!isEditing) {
    return (
      <div 
        onClick={() => setIsEditing(true)} 
        className="cursor-pointer group flex items-center justify-between min-w-[150px] p-2 hover:bg-primary/10 rounded transition-colors"
      >
        <span className="truncate">{val || "-"}</span>
        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-primary">✏️</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 min-w-[200px]">
      <input type={type} value={temp} onChange={(e) => setTemp(e.target.value)} autoFocus className={`${inputBase} h-8 text-xs px-2`} />
      <button onClick={() => { onSave(temp); setIsEditing(false) }} className="h-8 w-8 bg-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-white">💾</button>
      <button onClick={() => { setTemp(val); setIsEditing(false) }} className="h-8 w-8 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white">✖</button>
    </div>
  )
}
