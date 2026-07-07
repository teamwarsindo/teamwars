import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LAUNCH_TARGET} from '@/lib/config'

export function proxy(request: NextRequest) {
  const now = Date.now();
  const { pathname } = request.nextUrl;

  // Buka otomatis jika berjalan di Localhost
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Fungsi pembantu sekarang dimodifikasi untuk mengecek kredensial secara dinamis
  const checkAuth = (allowedUser: string, allowedPwd: string) => {
    const basicAuth = request.headers.get('authorization');
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');
      if (user === allowedUser && pwd === allowedPwd) {
        return true;
      }
    }
    return false;
  };

  // ---------------------------------------------------------
  // 2. ATURAN KHUSUS /registration (Akses Master Admin)
  // ---------------------------------------------------------
  if (
    (pathname.startsWith('/registration') || pathname.startsWith('/api/submit')) 
    && now < LAUNCH_TARGET
  ) {
    // 🔑 KREDENSIAL MASTER ADMIN (Tetap pakai yang lama)
    const adminUser = 'admin';
    const adminPwd = 'adminonly';

    if (checkAuth(adminUser, adminPwd)) return NextResponse.next();
    
    return new NextResponse('Akses Ditolak: Registrasi belum dibuka.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Area Terbatas Master Admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/registration', 
    '/registration/:path*', 
    '/api/submit/:path*',
    '/rules',
    '/rules/:path*'
  ],
}
