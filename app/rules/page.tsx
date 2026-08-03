import type { Metadata } from 'next'
import RulebookClient from './page-client' 

export const metadata: Metadata = {
  title: 'Team Wars Indonesia',
  description: 'Official Rulebook & Guideliness — Baca peraturan lengkap sebelum kalian kena sanksi',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Rulebook & Guideliness — Baca peraturan lengkap sebelum kalian kena sanksi',
    url: 'https://teamwars.web.id/rules', // Selalu tambahkan URL spesifik
    images: [
      {
        url: '/opengraph-image.jpg', 
        width: 1200,
        height: 630,
        alt: 'Team Wars Indonesia Logo',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
}

export default function RulesPage() {
  return <RulebookClient />
}
