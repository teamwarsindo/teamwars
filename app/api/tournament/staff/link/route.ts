import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateRefereeToken } from '@/app/tournament/_library/referee-token';

export const dynamic = 'force-dynamic';

interface GenerateLinkBody {
  discordId: string;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get('admin_session')?.value;

    if (!adminCookie) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Sesi admin diperlukan.' },
        { status: 401 }
      );
    }

    const body: GenerateLinkBody = await req.json();
    const { discordId } = body;

    if (!discordId?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Discord ID wasit wajib disertakan.' },
        { status: 400 }
      );
    }

    const token = await generateRefereeToken(discordId.trim());
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const cleanOrigin = origin.replace(/\/+$/, '');

    const directPath = `/staff-${token}`;
    const fullUrl = cleanOrigin ? `${cleanOrigin}${directPath}` : directPath;

    return NextResponse.json({
      success: true,
      token,
      path: directPath,
      url: fullUrl,
    });
  } catch (error: any) {
    console.error('[GENERATE REFEREE LINK ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membuat link wasit.' },
      { status: 500 }
    );
  }
}  
