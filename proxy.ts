import { NextResponse, type NextRequest } from 'next/server';

// ==========================================
// 1. HELPER: BACA DAN PROTEKSI AKSES ADMIN
// ==========================================
function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Jika request menuju API Admin, BIARKAN LEWAT (Jangan di-redirect oleh middleware)
  if (pathname.startsWith('/api/admin')) {
    return null;
  }

  // 2. Baca Cookie Session yang dibuat oleh API Auth kamu tadi ('admin_session')
  const sessionToken = req.cookies.get('admin_session')?.value;
  const isAdminPath = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin';

  // A. Jika mencoba masuk Halaman Admin (dashboard, dll) TANPA Cookie Session -> Lempar ke Login
  if (isAdminPath && !isLoginPage && !sessionToken) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // B. Jika SUDAH punya Cookie Session tapi malah buka Halaman Login -> Lempar ke Dashboard
  if (isLoginPage && sessionToken) {
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
    '/admin/:path*',
    '/registration/:path*',
  ],
};
