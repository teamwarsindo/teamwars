"use client"

import { useEffect } from "react"
import { CloseIcon, AlertIcon } from "@/components/icons" // Sesuaikan path icon lu

interface GlobalModalProps {
  open: boolean
  onClose: () => void
  title: string
  messages: string[] // Menerima array string agar bisa list bullet
  type?: "error" | "success" | "info"
}

export function GlobalModal({ open, onClose, title, messages, type = "error" }: GlobalModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = "unset"
    return () => { document.body.style.overflow = "unset" }
  }, [open])

  if (!open) return null

  // Setting warna berdasarkan tipe
  const colorMap = {
    error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "text-red-500", btn: "bg-red-600 hover:bg-red-700" },
    success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: "text-green-500", btn: "bg-green-600 hover:bg-green-700" },
    info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "text-blue-500", btn: "bg-blue-600 hover:bg-blue-700" }
  }
  const theme = colorMap[type]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {type === "error" && <span className="text-red-500">⚠️</span>}
            {type === "success" && <span className="text-green-500">✅</span>}
            {title}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:bg-gray-100 transition">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Area Pesan yang bisa di-scroll jika isinya banyak */}
        <div className={`p-4 mx-4 my-4 rounded-xl border ${theme.bg} ${theme.border} max-h-[40vh] overflow-y-auto`}>
          <ul className={`flex flex-col gap-2 ${theme.text} text-sm font-medium`}>
            {messages.map((msg, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className={`w-full py-2.5 rounded-xl text-white font-semibold transition-colors ${theme.btn}`}
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  )
}
