import { redirect } from 'next/navigation';

interface StaffTokenPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function StaffTokenPage({ params }: StaffTokenPageProps) {
  const resolvedParams = await params;
  const token = resolvedParams?.token;

  if (!token) {
    redirect('/staff');
  }

  // Redirect secara bersih ke rute /staff dengan query parameter token terenkripsi
  redirect(`/staff?token=${encodeURIComponent(token)}`);
}
