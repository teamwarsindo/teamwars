import { NextResponse, type NextRequest } from 'next/server';
import { verifyMatchToken } from '@/app/admin/match-report/match-token';

async function handleAdminRoutes(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;

  // 1. Biarkan API Admin lewat
  if (pathname.startsWith('/api/admin')) {
    return null;
  }

  // 2. Baca Cookie Session Admin
  const sessionToken = req.cookies.get('admin_session')?.value;

  // 🟢 2.4 VALIDASI TOKEN WASIT (Support rute /t-, /admin/match-report/[token], dan query ?token=)
  if (pathname.startsWith('/t-') || pathname.startsWith('/admin/match-report')) {
    let token = searchParams.get('token');

    // Jika lewat path parameter /admin/match-report/:token atau /t-:token
    if (!token) {
      if (pathname.startsWith('/t-')) {
        token = pathname.replace('/t-', '');
      } else {
        const parts = pathname.split('/');
        // /admin/match-report/[token] -> parts[3]
        if (parts.length >= 4 && parts[3]) {
          token = parts[3];
        }
      }
    }

    if (token) {
      const matchId = await verifyMatchToken(token);
      if (matchId) {
        return null; // Token valid -> Izinkan akses khusus match ini
      }
      // Token tidak valid/rusak -> Tolak akses langsung
      return NextResponse.redirect(new URL('/admin/login?error=invalid_token', req.url));
    }
  }

  // 🟢 2.5 IZINKAN AKSES KHUSUS REFEREE PAYROLL & MATCH LOGS
  if (
    pathname.startsWith('/admin/referee-payroll') ||
    pathname.startsWith('/admin/match-logs')
  ) {
    const tokenParam = searchParams.get('token');
    const validChiefToken = process.env.CHIEF_REFEREE_TOKEN || 'xK9p2Lm5Qo8RstVb3N2wY7zE4Hj1K0Q';

    if ((tokenParam && tokenParam === validChiefToken) || sessionToken) {
      return null;
    }
  }

  // 3. Rute /admin/login
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return null;
  }

  // 4. Proteksi rute admin lainnya jika belum login
  if (pathname.startsWith('/admin') && !sessionToken) {
    const fullTarget = `${pathname}${search}`;
    const loginUrl = new URL('/admin/login', req.url);
    
    if (pathname !== '/admin' && pathname !== '/admin/') {
      loginUrl.searchParams.set('callbackUrl', fullTarget);
    }
    
    return NextResponse.redirect(loginUrl);
  }

  // 5. Root /admin jika sudah login -> dashboard
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return null;
}

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

export default async function proxy(request: NextRequest) {
  const adminRedirect = await handleAdminRoutes(request);
  if (adminRedirect) return adminRedirect;

  const registrationLogic = handleRegistration(request);
  if (registrationLogic) return registrationLogic;

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/t-:path*', // 🟢 Wajib didaftarkan agar URL pendek wasit ikut diproteksi middleware
    '/registration/:path*',
  ],
};
