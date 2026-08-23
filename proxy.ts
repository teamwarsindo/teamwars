import { NextResponse, type NextRequest } from 'next/server';

// ==========================================
// 1. HELPER: BACA DAN PROTEKSI AKSES ADMIN
// ==========================================
function handleAdminRoutes(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;

  // 1. Biarkan API Admin lewat tanpa di-redirect oleh middleware
  if (pathname.startsWith('/api/admin')) {
    return null;
  }

  // 2. Baca Cookie Session
  const sessionToken = req.cookies.get('admin_session')?.value;

  // 🟢 2.5 IZINKAN AKSES KHUSUS REFEREE PAYROLL JIKA MEMBAWA TOKEN YANG VALID
  if (pathname.startsWith('/admin/referee-payroll')) {
    const tokenParam = searchParams.get('token');
    const validChiefToken = process.env.CHIEF_REFEREE_TOKEN || 'xK9p2Lm5Qo8RstVb3N2wY7zE4Hj1K0Q';

    // Jika memiliki token yang cocok atau sudah punya session admin, izinkan lewat
    if ((tokenParam && tokenParam === validChiefToken) || sessionToken) {
      return null;
    }
  }

  // 3. Jika membuka /admin/login:
  // - Kalau SUDAH login -> lempar ke /admin/dashboard
  // - Kalau BELUM login -> biarkan lewat
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return null;
  }

  // 4. Jika membuka rute /admin apa pun tanpa session login -> redirect ke /admin/login + callbackUrl
  if (pathname.startsWith('/admin') && !sessionToken) {
    const fullTarget = `${pathname}${search}`;
    const loginUrl = new URL('/admin/login', req.url);
    
    if (pathname !== '/admin' && pathname !== '/admin/') {
      loginUrl.searchParams.set('callbackUrl', fullTarget);
    }
    
    return NextResponse.redirect(loginUrl);
  }

  // 5. Jika membuka root /admin dan SUDAH login -> lempar ke dashboard
  if (pathname === '/admin' || pathname === '/admin/') {
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
      maxAge: 7200,
    });
  }
  return res;
}

// ==========================================
// 3. FUNGSI UTAMA (DEFAULT EXPORT)
// ==========================================
export default function proxy(request: NextRequest) {
  const adminRedirect = handleAdminRoutes(request);
  if (adminRedirect) return adminRedirect;

  const registrationLogic = handleRegistration(request);
  if (registrationLogic) return registrationLogic;

  return NextResponse.next();
}

// ==========================================
// 4. MATCHER CONFIG
// ==========================================
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/registration/:path*',
  ],
};
