import { NextResponse, type NextRequest } from 'next/server';

// ==========================================
// 1. HELPER: BACA DAN PROTEKSI AKSES ADMIN
// ==========================================
function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Biarkan API Admin lewat tanpa di-redirect oleh middleware
  if (pathname.startsWith('/api/admin')) {
    return null;
  }

  // 2. Baca Cookie Session
  const sessionToken = req.cookies.get('admin_session')?.value;

  // 🟢 A. Jika membuka root `/admin` atau `/admin/`, paksa lempar ke `/admin/dashboard`
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  // 🟢 B. Jika membuka `/admin/dashboard` tapi BELUM punya cookie session
  // Biarkan LEWAT (jangan di-redirect) karena halaman /admin/dashboard kamu yang memuat form login-nya
  if (pathname.startsWith('/admin/dashboard')) {
    return null; 
  }

  // 🟢 C. Untuk rute sub-admin lainnya (misal: /admin/settings, /admin/users, dll)
  // Jika BELUM login, paksa lempar ke `/admin/dashboard`
  if (pathname.startsWith('/admin/') && !sessionToken) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return null;
}

// ==========================================
// 2. HELPER: REGISTRASI & CSRF
// ==========================================
function handleRegistration(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/registration' || pathname === '/registration/') {
    const homeUrl = new URL('/', req.url);
    homeUrl.searchParams.set('error', 'registration_closed');
    return NextResponse.redirect(homeUrl);
  }

  const res = NextResponse.next();
  if (!req.cookies.get('twi_csrf_token')) {
    res.cookies.set('twi_csrf_token', crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7200
    });
  }
  return res;
}

// ==========================================
// 3. FUNGSI UTAMA PROXY / MIDDLEWARE
// ==========================================
export function proxy(request: NextRequest) {
  // Hubungkan Logika Admin Session
  const adminRedirect = handleAdminRoutes(request);
  if (adminRedirect) return adminRedirect;

  // Hubungkan Logika Registrasi
  const registrationLogic = handleRegistration(request);
  if (registrationLogic) return registrationLogic;

  return NextResponse.next();
}

// ==========================================
// 4. MATCHER CONFIG (Agar Middleware Bekerja)
// ==========================================
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/registration/:path*',
  ],
};
