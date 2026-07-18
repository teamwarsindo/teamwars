import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LAUNCH_TARGET } from '@/lib/config'

export function proxy(request: NextRequest) {
  const now = Date.now();
  const { pathname } = request.nextUrl;

  // Buka otomatis jika berjalan di Localhost (agar gampang dites saat ngoding)
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // 1. ATURAN KHUSUS /admin (Halaman Login)
  // ---------------------------------------------------------
  if (pathname === '/admin') {
    const session = request.cookies.get('admin_session');
    if (session) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // ---------------------------------------------------------
  // 2. ATURAN KHUSUS /admin/dashboard (Cegah Bypass Link)
  // ---------------------------------------------------------
  if (pathname.startsWith('/admin/dashboard')) {
    const session = request.cookies.get('admin_session');
    if (!session) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // ---------------------------------------------------------
  // 3. KEAMANAN SELURUH RUTE API
  // ---------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    
    // A. API Publik: Form Submit Registrasi
    if (pathname === '/api/submit') {
      
      // Lapis 1: Cegah akses via URL Browser (Hanya izinkan method POST)
      if (request.method !== 'POST') {
        return new NextResponse('Method Not Allowed: Hanya menerima POST', { status: 405 });
      }

      // Lapis 2: Validasi Origin (Pastikan dikirim dari website kita sendiri)
      const origin = request.headers.get('origin') || request.headers.get('referer') || '';
      const isFromOurSite = origin.includes('teamwars.web.id') || origin.includes('localhost');
      
      if (!isFromOurSite) {
        return new NextResponse('Akses Ditolak: Invalid Origin', { status: 403 });
      }

      // Lapis 3: Validasi CSRF Token (Pastikan user benar-benar membuka halaman form)
      const formTicket = request.cookies.get('twi_csrf_token');
      if (!formTicket) {
        return new NextResponse('Akses Ditolak: Sesi Tidak Valid (Harap isi melalui halaman form resmi)', { status: 403 });
      }

      // Jika lulus semua lapisan, izinkan API tereksekusi
      return NextResponse.next();
    }

    // B. API Internal: (db-dump, scan-endpoints, dll)
    // Semua API selain /api/submit WAJIB memiliki sesi admin
    const session = request.cookies.get('admin_session');
    if (!session) {
      // Jika ditembak langsung, pantulkan ke halaman login
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // ---------------------------------------------------------
  // 4. ATURAN KHUSUS /registration (Beri Ticket & Cek Master Admin)
  // ---------------------------------------------------------
  if (pathname.startsWith('/registration')) {
    let isAllowed = true;

    // A. Cek Kredensial jika belum waktunya Launching
    if (now < LAUNCH_TARGET) {
      const adminUser = 'admin';
      const adminPwd = 'adminonly';
      const basicAuth = request.headers.get('authorization');
      
      if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');
        if (user !== adminUser || pwd !== adminPwd) {
          isAllowed = false;
        }
      } else {
        isAllowed = false;
      }

      if (!isAllowed) {
        return new NextResponse('Akses Ditolak: Registrasi belum dibuka.', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Area Terbatas Master Admin"' },
        });
      }
    }

    // B. Jika diizinkan masuk ke halaman form, berikan "Ticket" Rahasia
    const response = NextResponse.next();
    
    // Set cookie tiket yang hanya berlaku 2 jam, tidak bisa dibaca hacker (HttpOnly)
    if (!request.cookies.get('twi_csrf_token')) {
      response.cookies.set('twi_csrf_token', crypto.randomUUID(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 2 // Expired dalam 2 jam
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin', 
    '/admin/dashboard/:path*',
    '/api/:path*', // Mengawasi seluruh isi folder API
    '/registration', 
    '/registration/:path*'
  ],
}
