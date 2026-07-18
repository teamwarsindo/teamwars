"use client";

import { useState, useEffect } from "react";

export default function ResendEmailAdmin() {
  const [teams, setTeams] = useState<{ key: string; namaTim: string }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({ text: "", type: "" });

  // Ambil daftar tim saat halaman dibuka
  useEffect(() => {
    fetch("/api/admin/resend-email")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTeams(data.teams);
      })
      .catch(() => setMessage({ text: "Gagal memuat daftar tim", type: "error" }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !targetEmail) {
      setMessage({ text: "Harap pilih tim dan masukkan email!", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await fetch("/api/admin/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamKey: selectedTeam, targetEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        setTargetEmail(""); // Kosongkan form email setelah sukses
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Terjadi kesalahan sistem.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-xl shadow-2xl p-6 md:p-8">
        
        {/* Header */}
        <div className="text-center mb-8 border-b border-border pb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Team Wars Admin</h1>
          <p className="text-sm text-muted-foreground">Kirim Ulang Email Konfirmasi & Edit Token</p>
        </div>

        {/* Notifikasi Status */}
        {message.text && (
          <div className={`p-4 rounded-md mb-6 text-sm font-medium border ${message.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"}`}>
            {message.type === "success" ? "✅ " : "⚠️ "} {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Tim dari Database</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={teams.length === 0}
              className="w-full bg-background border border-input text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 outline-none"
            >
              <option value="">-- {teams.length > 0 ? "Pilih Tim" : "Memuat Data Tim..."} --</option>
              {teams.map((team) => (
                <option key={team.key} value={team.key}>
                  {team.namaTim}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Tujuan Pengiriman</label>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="contoh@gmail.com"
              className="w-full bg-background border border-input text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 font-medium rounded-lg text-sm px-5 py-3.5 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Mengirim...
              </>
            ) : (
              "Kirim Email Sekarang"
            )}
          </button>
        </form>
        
      </div>
    </div>
  );
  }
