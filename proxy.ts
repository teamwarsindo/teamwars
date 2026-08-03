import { NextResponse, type NextRequest } from 'next/server';

function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/admin')) return null;

  const sessionToken = req.cookies.get('admin_session')?.value;

  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  if (pathname.startsWith('/admin/dashboard')) return null;

  if (pathname.startsWith('/admin/') && !sessionToken) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return null;
}

function handleRegistration(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Fitur Flag Toggle: saat REGISTRATION_OPEN="true" di set ENV, form akan terbuka
  const isRegistrationOpen = process.env.REGISTRATION_OPEN === 'true';

  if (!isRegistrationOpen && (pathname === '/registration' || pathname === '/registration/')) {
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

export function proxy(request: NextRequest) {
  const adminRedirect = handleAdminRoutes(request);
  if (adminRedirect) return adminRedirect;

  const registrationLogic = handleRegistration(request);
  if (registrationLogic) return registrationLogic;

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/registration/:path*'],
};
