import type { Metadata } from 'next'
import EditPageClient from './edit-page-client'

export const metadata: Metadata = {
  title: 'Edit Roster | Team Wars Indonesia',
  description: 'Manajemen Roster Tim TWI Season 7',
}

export default function EditTeamPage({ params }: { params: { token: string } }) {
  // Melempar parameter token URL ke komponen Client
  return <EditPageClient token={params.token} />
}
