import type { Metadata } from 'next'

const DISCORD_LINK = "https://discord.gg/NtBBdqUrxe"

export const metadata: Metadata = {
  title: 'Team Wars Indonesia',
  description: 'Official Discord - Masuk ke server Discord resmi Team Wars Indonesia untuk mencari tim, bertanya ke panitia, dan mendapatkan info terbaru.',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Discord - Masuk ke server Discord resmi Team Wars Indonesia untuk mencari tim, bertanya ke panitia, dan mendapatkan info terbaru.',
    images: [
      {
        // 1. UBAH KE URL ABSOLUT
        url: 'https://teamwars.web.id/logo-dc.png', 
        width: 1200,
        height: 630,
        alt: 'Team Wars Indonesia Discord',
      },
    ],
  },
}

export default function InvitePage() {
  return (
    // 2. HAPUS TAG HTML DAN BODY
    <main className="flex h-screen items-center justify-center bg-slate-950 text-white">
      {/* Trik Meta Refresh tetap bekerja tanpa harus dibungkus tag <head> */}
      <meta httpEquiv="refresh" content={`0;url=${DISCORD_LINK}`} />
      
      <div className="text-center">
        <h1 className="text-xl font-bold">Mengalihkan ke Discord...</h1>
        <p className="mt-2 text-sm text-slate-400">
          Jika tidak dialihkan secara otomatis,{' '}
          <a href={DISCORD_LINK} className="text-blue-400 underline hover:text-blue-300">
            klik di sini
          </a>.
        </p>
      </div>
    </main>
  )
}
