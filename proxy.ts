import { NextResponse, type NextRequest } from 'next/server';

// --- HELPER 1: Handle Akses Halaman Admin ---
function handleAdminRoutes(req: NextRequest) {
    const { pathname } = req.nextUrl;
    
    // Jika mengakses halaman /admin (baik itu /admin, /admin/login, dll, selain /admin/dashboard itu sendiri)
    if (pathname.startsWith('/admin') && pathname !== '/admin/dashboard') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    
    return null;
}

// --- HELPER 2: Handle Registrasi Ditutup (Redirect ke Home) ---
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
// FUNGSI UTAMA MIDDLEWARE (PROXY)
// ==========================================
export function proxy(request: NextRequest) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next();

    // Tidak perlu cek session di middleware lagi, langsung alihkan ke /admin/dashboard
    const adminRedirect = handleAdminRoutes(request);
    if (adminRedirect) return adminRedirect;
    
    const registrationLogic = handleRegistration(request);
    if (registrationLogic) return registrationLogic;

    return NextResponse.next();
}

