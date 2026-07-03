/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fungsi untuk mengalihkan URL Sosial Media (Redirects)
  async redirects() {
    return [
      {
        source: '/fb',
        destination: 'https://www.facebook.com/teamwars.id',
        permanent: true, // Menggunakan HTTP 308 (Permanent Redirect) agar baik untuk SEO
      },
      {
        source: '/ig',
        destination: 'https://www.instagram.com/teamwarsindonesia',
        permanent: true,
      },
    ]
  },

  // Fungsi untuk menyembunyikan URL asli Cloudinary (Masking/Rewrites)
  async rewrites() {
    return [
      // --- MASKING FILE ASLI (Resolusi Penuh untuk diverifikasi panitia) ---
      {
        source: '/bukti/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/bukti_transfer/:path*',
      },
      {
        source: '/logo/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/logo/:path*',
      },
      
      // --- MASKING FILE KOMPRESI (Resolusi kecil agar Dashboard super cepat) ---
      {
        source: '/thumb-bukti/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/f_auto,q_auto/bukti_transfer/:path*',
      },
      {
        source: '/thumb-logo/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/f_auto,q_auto/logo/:path*',
      }
    ]
  },
};

export default nextConfig;
