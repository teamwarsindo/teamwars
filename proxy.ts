import { NextResponse, type NextRequest } from 'next/server'
import { LAUNCH_TARGET } from '@/lib/config'

// --- HELPER 1: Handle Akses Halaman Admin ---
function handleAdminRoutes(req: NextRequest, session: string | undefined) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin' && session) return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  if (pathname.startsWith('/admin/dashboard') && !session) return NextResponse.redirect(new URL('/admin', req.url));
  return null;
}

// --- HELPER 3: Handle Registrasi (Auth & CSRF) ---
function handleRegistration(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/registration')) return null;

  if (Date.now() < LAUNCH_TARGET) {
    const auth = req.headers.get('authorization')?.split(' ')[1];
    const [user, pwd] = auth ? atob(auth).split(':') : [];
    if (user !== 'admin' || pwd !== 'adminonly') {
      return new NextResponse('Akses Ditolak', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Area Master Admin"' } });
    }
  }

  const res = NextResponse.next();
  if (!req.cookies.get('twi_csrf_token')) {
    res.cookies.set('twi_csrf_token', crypto.randomUUID(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7200 });
  }
  return res;
}

// ==========================================
// FUNGSI UTAMA MIDDLEWARE
// ==========================================
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') return NextResponse.next();

  const session = request.cookies.get('admin_session')?.value;

  // Eksekusi Helper secara berurutan
  const adminRedirect = handleAdminRoutes(request, session);
  if (adminRedirect) return adminRedirect;

  const registrationLogic = handleRegistration(request);
  if (registrationLogic) return registrationLogic;

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/dashboard/:path*', '/api/:path*', '/registration', '/registration/:path*'],
}
