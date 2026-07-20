import { NextResponse, type NextRequest } from 'next/server'
import { LAUNCH_TARGET } from '@/lib/config'

// --- HELPER 1: Handle Akses Halaman Admin ---
function handleAdminRoutes(req: NextRequest, session: string | undefined) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin' && session) return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  if (pathname.startsWith('/admin/dashboard') && !session) return NextResponse.redirect(new URL('/admin', req.url));
  return null;
}

// --- HELPER 2: Handle Keamanan API ---
function handleApiSecurity(req: NextRequest, session: string | undefined) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/')) return null;

  // 1. BYPASS DISCORD: Biarkan semua request ke /api/discord lewat tanpa halangan
  if (pathname.startsWith('/api/discord')) return null; 
  
  // 2. BYPASS PENDAFTARAN & EDIT TIM: Boleh diakses publik, tapi dengan penjagaan ketat
  if (pathname === '/api/submit' || pathname === '/api/update-team') {
    // Pastikan hanya menerima POST request
    if (req.method !== 'POST') return new NextResponse('Method Not Allowed', { status: 405 });
    
    // Validasi Origin (Anti-CORS / Pembajakan)
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    if (!origin.includes('teamwars.web.id') && !origin.includes('localhost')) {
      return new NextResponse('Invalid Origin', { status: 403 });
    }
    
    // Validasi CSRF Token
    if (!req.cookies.get('twi_csrf_token')) {
      return new NextResponse('Sesi Tidak Valid', { status: 403 });
    }
    
    return null; // Lolos! Silakan akses API.
  }

  // 3. API LAINNYA WAJIB LOGIN ADMIN
  if (!session) return NextResponse.redirect(new URL('/admin', req.url));
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
// FUNGSI UTAMA MIDDLEWARE (WAJIB bernama 'middleware')
// ==========================================
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') return NextResponse.next();

  const session = request.cookies.get('admin_session')?.value;

  // Eksekusi Helper secara berurutan
  const adminRedirect = handleAdminRoutes(request, session);
  if (adminRedirect) return adminRedirect;

  const apiSecurity = handleApiSecurity(request, session);
  if (apiSecurity) return apiSecurity;

  const registrationLogic = handleRegistration(request);
  if (registrationLogic) return registrationLogic;

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/dashboard/:path*', '/api/:path*', '/registration', '/registration/:path*'],
}
