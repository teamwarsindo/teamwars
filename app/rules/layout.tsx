import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team Wars Indonesia',
  description: 'Official Rulebook & Guideliness — Baca peraturan lengkap sebelum kalian kena sanksi',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Rulebook & Guideliness — Baca peraturan lengkap sebelum kalian kena sanksi',
    images: [
      {
        // Sesuaikan dengan nama gambar PNG/JPG Anda di folder public/
        url: '/opengraph-image.jpg', 
        width: 1200, // Opsional, tapi disarankan
        height: 630, // Opsional, tapi disarankan
        alt: 'Team Wars Indonesia Logo',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
}
