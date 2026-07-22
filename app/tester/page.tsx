import type { Metadata } from 'next'
import { Suspense } from 'react'
import TesterClient from './page-client'

export const metadata: Metadata = {
  title: 'Tester Hub - Team Wars Indonesia',
  // 🎯 BEST PRACTICE: Cegah halaman tester muncul di pencarian Google
  robots: { index: false, follow: false }, 
}

export default function TesterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background text-primary font-mono text-sm">
        Memuat Tester Hub...
      </div>
    }>
      <TesterClient />
    </Suspense>
  )
}
