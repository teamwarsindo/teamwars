"use client";

import { useState, useEffect } from "react";

export default function TesterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // State Form DB
  const [formData, setFormData] = useState({ namaTim: "", warna: "#4CAF50" });
  const [players, setPlayers] = useState([{ discord: "", ign: "Testing", role: "Ketua" }]);

  // State Table DB
  const [dbTeams, setDbTeams] = useState<any[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  // =====================================
  // BAGIAN 1: FORM SIMPAN KE DB
  // =====================================
  const handleAddPlayer = () => setPlayers([...players, { discord: "", ign: "Testing", role: "Anggota" }]);
  
  const handlePlayerChange = (index: number, field: string, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  const handleSimpanDB = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tester/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, players }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      fetchTeams();
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // BAGIAN 2: AMBIL DATA
  // =====================================
  const fetchTeams = async () => {
    const res = await fetch("/api/tester/teams");
    const data = await res.json();
    if (data.success) {
      setDbTeams(data.teams);
      // Bersihkan pilihan yang mungkin timnya udah kehapus
      setSelectedSlugs([]); 
    }
  };

  const toggleSelect = (slug: string) => {
    setSelectedSlugs(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  // =====================================
  // BAGIAN 3: GENERATE & DELETE
  // =====================================
  const handleGenerateDiscord = async () => {
    if (selectedSlugs.length === 0) return alert("Pilih minimal 1 tim dulu!");
    setLoading(true);
    setMessage("Sedang mengontak Discord...");
    try {
      const res = await fetch("/api/tester/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: selectedSlugs }),
      });
      const data = await res.json();
      setMessage(data.results.join("\n")); 
      fetchTeams(); 
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedSlugs.length === 0) return alert("Pilih minimal 1 tim yang mau dihapus!");
    const confirmDelete = window.confirm("Yakin mau hapus data ini? Kalau sudah generate Discord, channel dan rolenya bakal hilang juga lho!");
    if (!confirmDelete) return;

    setLoading(true);
    setMessage("Sedang menghapus data dan aset Discord...");
    try {
      const res = await fetch("/api/tester/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: selectedSlugs }),
      });
      const data = await res.json();
      setMessage(data.results.join("\n"));
      fetchTeams();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* PANEL KIRI: FORM INPUT */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-blue-400">📝 1. Input Data Tester (Save ke DB)</h2>
        <form onSubmit={handleSimpanDB} className="space-y-4">
          <input type="text" placeholder="Nama Tim (Cth: Tim Alpha)" className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500" required onChange={e => setFormData({...formData, namaTim: e.target.value})} />
          <input type="text" placeholder="Warna Hex (Cth: #FF0000)" className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500" value={formData.warna} required onChange={e => setFormData({...formData, warna: e.target.value})} />
          
          <div className="border-t border-gray-600 pt-4 mt-4">
            <h3 className="font-bold mb-2">Pemain (Minimal 1)</h3>
            {players.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="text" placeholder="Username Discord" className="w-1/2 p-2 bg-gray-700 rounded text-sm focus:outline-none focus:border-blue-500 border border-gray-600" value={p.discord} required onChange={e => handlePlayerChange(i, "discord", e.target.value)} />
                <input type="text" placeholder="IGN" className="w-1/4 p-2 bg-gray-700 rounded text-sm focus:outline-none focus:border-blue-500 border border-gray-600" value={p.ign} onChange={e => handlePlayerChange(i, "ign", e.target.value)} />
                <input type="text" placeholder="Jabatan" className="w-1/4 p-2 bg-gray-700 rounded text-sm focus:outline-none focus:border-blue-500 border border-gray-600" value={p.role} onChange={e => handlePlayerChange(i, "role", e.target.value)} />
              </div>
            ))}
            <button type="button" onClick={handleAddPlayer} className="text-sm text-blue-400 hover:underline">+ Tambah Pemain</button>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-bold transition-colors">Simpan ke Database</button>
        </form>
      </div>

      {/* PANEL KANAN: LIST DATA, GENERATOR, & DELETE */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-green-400">⚙️ 2. Panel Eksekusi</h2>
          <button onClick={fetchTeams} className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">🔄 Refresh</button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto mb-4 border border-gray-700 p-2 rounded">
          {dbTeams.length === 0 && <p className="text-gray-400 text-sm italic">Klik Refresh atau belum ada data di DB.</p>}
          {dbTeams.map(team => (
            <label key={team.slug} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${team.sudahGenerate ? 'bg-indigo-900 bg-opacity-30' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <input type="checkbox" checked={selectedSlugs.includes(team.slug)} onChange={() => toggleSelect(team.slug)} className="w-5 h-5 accent-blue-500" />
              <div className="flex-1">
                <p className="font-bold">{team.namaTim} <span className="text-xs ml-2 px-2 py-0.5 rounded shadow-sm" style={{backgroundColor: team.warna, color: '#fff'}}>{team.warna}</span></p>
                {team.sudahGenerate ? (
                  <p className="text-xs text-blue-300">✅ Aset Discord sudah ada (Siap dihapus/reset)</p>
                ) : (
                  <p className="text-xs text-gray-400">Menunggu antrean Generate</p>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          {/* Tombol Generate */}
          <button onClick={handleGenerateDiscord} disabled={loading || selectedSlugs.length === 0} className="flex-1 bg-green-600 hover:bg-green-700 p-2 rounded font-bold disabled:opacity-50 transition-colors">
            🚀 Generate Aset
          </button>
          
          {/* Tombol Hapus */}
          <button onClick={handleDelete} disabled={loading || selectedSlugs.length === 0} className="flex-1 bg-red-600 hover:bg-red-700 p-2 rounded font-bold disabled:opacity-50 transition-colors">
            🗑️ Hapus Tim
          </button>
        </div>

        {/* Console Log UI */}
        {message && (
          <pre className="mt-4 p-3 bg-black rounded text-xs whitespace-pre-wrap border border-gray-700 max-h-40 overflow-y-auto">
            {message}
          </pre>
        )}
      </div>

    </div>
  );
}
