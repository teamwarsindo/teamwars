"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { updateTeamCore } from "@/app/admin/dashboard/actions"
import { EditorIdentity } from "./editor-identity"
import { EditorRoster } from "./editor-roster"
import { EditorDocument } from "./editor-document"
import Swal from "sweetalert2"

export function TeamEditorModal({ team, onClose }: { team: TeamData, onClose: () => void }) {
  const [formData, setFormData] = useState<TeamData>(team)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateTeamCore(team.id, formData);
    setIsSaving(false);
    
    if (res.success) {
      Swal.fire("Tersimpan!", "Perubahan berhasil.", "success");
      onClose();
    } else {
      Swal.fire("Error", res.error, "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-background border border-primary/30 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        
        <div className="flex justify-between items-center p-5 border-b border-border/50 bg-primary/5">
          <h2 className="text-lg font-bold flex items-center gap-2">Manage: {formData.namaTim}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-red-500 hover:text-white">✕</button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <EditorIdentity formData={formData} setFormData={setFormData} />
          <EditorRoster formData={formData} setFormData={setFormData} />
          <EditorDocument formData={formData} setFormData={setFormData} />
        </div>

        <div className="p-5 border-t border-border/50 flex justify-end gap-3 bg-zinc-900/50">
          <button onClick={onClose} className="px-5 py-2 text-sm text-muted-foreground hover:text-white">Batal</button>
          <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 text-sm bg-primary text-white rounded font-bold hover:bg-primary/80 disabled:opacity-50">
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>

      </div>
    </div>
  )
}
