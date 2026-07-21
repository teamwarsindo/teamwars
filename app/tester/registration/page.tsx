
import type { Metadata } from 'next'
import PageClient from './page-client' // Mengimpor UI dari file sebelah

// 1. Atur metadata di sini (Server Side)
export const metadata: Metadata = {
  title: 'Team Wars Indonesia',
  description: 'Official Registration - Daftarkan tim Anda sekarang.',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Registration - Daftarkan tim Anda sekarang.',
    url: 'https://teamwars.web.id/registration',
    siteName: 'Team Wars Indonesia',
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

// 2. Render komponen Client Anda
export default function Page() {
  return <PageClient />
}
