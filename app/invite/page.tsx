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
