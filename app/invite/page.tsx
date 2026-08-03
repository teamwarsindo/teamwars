import type { Metadata } from 'next'

const DISCORD_LINK = "https://discord.gg/NtBBdqUrxe"

export const metadata: Metadata = {
  title: 'Team Wars Indonesia — Official Discord',
  description: 'Masuk ke server Discord resmi Team Wars Indonesia untuk mencari tim, bertanya ke panitia, dan mendapatkan info terbaru.',
  openGraph: {
    title: 'Team Wars Indonesia — Official Discord',
    description: 'Masuk ke server Discord resmi Team Wars Indonesia untuk mencari tim, bertanya ke panitia, dan mendapatkan info terbaru.',
    url: 'https://teamwars.web.id/invite',
    images: [
      {
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
      {/* Meta refresh untuk auto-redirect ke Discord */}
      <meta httpEquiv="refresh" content={`0;url=${DISCORD_LINK}`} />
      
      <div className="max-w-md space-y-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Mengalihkan ke Discord...
        </h1>
        <p className="text-sm text-slate-400">
          Jika kamu tidak dialihkan secara otomatis dalam beberapa detik,{' '}
          <a
            href={DISCORD_LINK}
            className="font-semibold text-blue-400 underline transition hover:text-blue-300"
          >
            klik tautan ini
          </a>.
        </p>
      </div>
    </main>
  )
}
