import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Tambahkan kode ini sebelum function RootLayout
export const metadata: Metadata = {
  // metadataBase WAJIB ADA agar Next.js tahu domain utama Anda
  metadataBase: new URL('https://teamwars.web.id'), 
  title: 'Team Wars Indonesia',
  description: 'Official Website TWI Season 7 — Duel Links',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Website TWI Season 7 — Duel Links',
    url: 'https://teamwars.web.id',
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

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
