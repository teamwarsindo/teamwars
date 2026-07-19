"use client"

import { TeamData, Player } from "@/types/admin"

export function RosterModal({ team, onClose, onUpdate }: { team: TeamData, onClose: () => void, onUpdate: (p: Player[]) => void }) {
  
  // Logika validasi individu (6/7 roster)
  const toggleVerify = (index: number) => {
    const newPlayers = [...team.players];
    newPlayers[index].isVerified = !newPlayers[index].isVerified;
    onUpdate(newPlayers);
  }

  // LOGIKA BARU: Cabut pemain dari urutannya, taruh di paling atas (Index 0)
  const makeCaptain = (index: number) => {
    if (index === 0) return; // Kalau sudah ketua, abaikan
    const newPlayers = [...team.players];
    const promotedPlayer = newPlayers.splice(index, 1)[0]; // Cabut pemain
    newPlayers.unshift(promotedPlayer); // Taruh di urutan pertama
    onUpdate(newPlayers);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-background border border-primary/30 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh]">
        
        <div className="flex justify-between items-center p-5 border-b border-border/50 bg-primary/5">
          <h2 className="text-lg font-bold text-primary">Roster: {team.namaTim}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-red-500 hover:text-white transition">✖</button>
        </div>
        
        <div className="flex-1 overflow-auto p-5 custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/50">
              <tr><th className="pb-2">IGN Pemain</th><th className="pb-2">Discord ID</th><th className="pb-2 text-center">Status Validasi</th><th className="pb-2 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {team.players.map((p, idx) => (
                <tr key={idx} className="hover:bg-primary/5 transition-colors">
                  <td className="py-3 font-semibold">
                    {/* Badge Dinamis: Ketua & Wakil otomatis mengikuti urutan 0 dan 1 */}
                    {idx === 0 && <span className="text-primary mr-2 text-[10px] border border-primary px-1.5 py-0.5 rounded">CPT</span>}
                    {idx === 1 && <span className="text-muted-foreground mr-2 text-[10px] border border-border px-1.5 py-0.5 rounded">WAKIL</span>}
                    {p.ign}
                  </td>
                  <td className="py-3 text-xs font-mono">{p.discord}</td>
                  <td className="py-3 text-center">
                    <button onClick={() => toggleVerify(idx)} className={`text-[10px] font-bold px-3 py-1.5 rounded border transition-colors ${p.isVerified ? "bg-green-500/20 text-green-500 border-green-500/50" : "bg-red-500/20 text-red-500 border-red-500/50"}`}>
                      {p.isVerified ? "✔ Lolos Validasi" : "✖ Pending"}
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    {idx !== 0 && (
                      <button onClick={() => makeCaptain(idx)} className="text-[10px] font-bold bg-background border border-primary/50 text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors">
                        ⬆ Jadikan Ketua
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
