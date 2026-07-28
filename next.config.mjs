/** @type {import('next').NextConfig} */
const nextConfig = {
  // ----------------------------------------------------
  // 1. REDIRECTS (Pengalihan URL Sosial Media)
  // ----------------------------------------------------
  async redirects() {
    return [
      {
        source: '/fb',
        destination: 'https://www.facebook.com/teamwars.id',
        permanent: true,
      },
      {
        source: '/ig',
        destination: 'https://www.instagram.com/teamwarsindonesia',
        permanent: true,
      },
    ]
  },

  // ----------------------------------------------------
  // 2. REWRITES (Masking Link Cloudinary langsung Proxy)
  // ----------------------------------------------------
  async rewrites() {
    return [
      // 🌟 NEW: Masking Khusus Logo SVG untuk BIMI / Email
      // Menembak Cloudinary dengan transformasi f_svg (format ke SVG)
      {
        source: '/logo-bimi.svg',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/f_svg/v1785258907/logo/logo-twis7.jpg',
      },

      // Format URL: domain.com/bukti/namafilenya.jpg
      {
        source: '/bukti/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/bukti/:path*',
      },
      // Masking Download
      {
        source: '/logo/:path*/download',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/fl_attachment/logo/:path*',
      },
      // Format URL: domain.com/logo/namafilenya.png
      {
        source: '/logo/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/logo/:path*',
      }
    ]
  },

  // ----------------------------------------------------
  // 3. IMAGE DOMAINS (Biar <Image /> Next.js ga error)
  // ----------------------------------------------------
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
