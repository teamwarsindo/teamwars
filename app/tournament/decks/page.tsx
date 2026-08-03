"use client";

import { useEffect, useState } from "react";
import { TopBar, Footer } from "@/components/layout-shared";

interface PlayerData {
  userId: string;
  username: string;
  deckCount: number;
  avatar: string;
  images: string[];
}

interface TeamDeckData {
  channelId: string;
  teamName: string;
  totalDecks: number;
  totalPlayers: number;
  isComplete: boolean;
  players: PlayerData[];
  updatedAt: string;
}

export default function DeckGalleryPage() {
  const [teams, setTeams] = useState<TeamDeckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchDecks = async () => {
    try {
      const res = await fetch("/api/tournament/decks");
      const json = await res.json();
      if (json.success) {
        setTeams(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat data deck:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
    const interval = setInterval(fetchDecks, 60000); // Auto refresh tiap 1 menit
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar title="Team Deck Submissions" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            🎴 Live Deck Gallery
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Daftar submission 10 deck dari seluruh pemain di setiap tim TWI Season 7.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm font-bold text-primary animate-pulse">
            ⏳ Memuat Galeri Deck...
          </div>
        ) : (
          <div className="space-y-10">
            {teams.map((team) => (
              <div
                key={team.channelId}
                className="rounded-3xl border border-border bg-card p-6 shadow-xl"
              >
                {/* Header Tim */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 mb-6 gap-2">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      🏆 {team.teamName}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Terakhir diperbarui: {new Date(team.updatedAt).toLocaleTimeString("id-ID")} WIB
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                      {team.totalDecks} / 10 Deck
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        team.isComplete
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                      }`}
                    >
                      {team.isComplete ? "COMPLETE ✅" : "INCOMPLETE ⚠️"}
                    </span>
                  </div>
                </div>

                {/* Grid Pemain */}
                {team.players.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl">
                    Belum ada pemain dari tim ini yang mengirim gambar deck di Discord.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {team.players.map((player) => (
                      <div
                        key={player.userId}
                        className="rounded-2xl border border-border/60 bg-background/50 p-4 shadow-sm"
                      >
                        {/* Info Pemain */}
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={player.avatar}
                            alt={player.username}
                            className="h-10 w-10 rounded-full object-cover border border-primary/30"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/logo.webp";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{player.username}</h3>
                            <p className="text-xs text-muted-foreground">
                              Submit: <span className="font-bold text-foreground">{player.deckCount}/2 Deck</span>
                            </p>
                          </div>
                        </div>

                        {/* Thumbnail Deck Images */}
                        <div className="grid grid-cols-2 gap-2">
                          {player.images.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedImage(imgUrl)}
                              className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-muted transition hover:border-primary"
                            >
                              <img
                                src={imgUrl}
                                alt={`Deck ${idx + 1}`}
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] text-white font-bold">
                                🔍 PERBESAR
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox / Modal Preview Gambar Ukuran Penuh */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Deck Preview Full"
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
            />
            <p className="text-center text-xs text-white/70 mt-3 font-medium">
              Klik di mana saja untuk menutup
            </p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
    }
                              
