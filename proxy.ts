import { NextResponse, type NextRequest } from 'next/server';

// --- HELPER 1: Handle Akses Halaman Admin ---
function handleAdminRoutes(req: NextRequest, session: string | undefined) {
    const { pathname } = req.nextUrl;
    
    if (pathname.startsWith('/admin')) {
        const isLoginRoute = pathname === '/admin/login';

        if (!session && !isLoginRoute) {
            return NextResponse.redirect(new URL('/admin/login', req.url));
        }
        
        if (session && (pathname === '/admin' || isLoginRoute)) {
            return NextResponse.redirect(new URL('/admin/dashboard', req.url));
        }
    }
    
    return null;
}

// --- HELPER 2: Handle Registrasi Ditutup (Redirect ke Home) ---
function handleRegistration(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Jika pengguna mencoba membuka halaman form pendaftaran (/registration)
    if (pathname === '/registration' || pathname === '/registration/') {
        // Alihkan (Redirect) ke Halaman Utama dengan notifikasi pendaftaran ditutup
        const homeUrl = new URL('/', req.url);
        homeUrl.searchParams.set('error', 'registration_closed');
        return NextResponse.redirect(homeUrl);
    }

    // Tetapkan CSRF Token untuk request API/Edit yang sah
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
    
    const session = request.cookies.get('admin_session')?.value;

    const adminRedirect = handleAdminRoutes(request, session);
    if (adminRedirect) return adminRedirect;
    
    const registrationLogic = handleRegistration(request);
    if (registrationLogic) return registrationLogic;

    return NextResponse.next();
}
    
