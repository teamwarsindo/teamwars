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
        permanent: true, // HTTP 308 (Bagus untuk SEO)
      },
      {
        source: '/ig',
        destination: 'https://www.instagram.com/teamwarsindonesia',
        permanent: true,
      },
      // --------------------------------------------------
      // MAINTENANCE (Diberhentikan sementara)
      // Hilangkan tanda '//' jika ingin mengaktifkan lagi
      // --------------------------------------------------
      // {
      //   source: '/registration',
      //   destination: '/maintenance',
      //   permanent: false, // Disarankan pakai false saat maintenance agar browser tidak nge-cache permanen
      // },
    ]
  },

  // ----------------------------------------------------
  // 2. REWRITES (Masking Link Cloudinary langsung Proxy)
  // ----------------------------------------------------
  async rewrites() {
    return [
      // Format URL lu: domain.com/bukti/namafilenya.jpg
      {
        source: '/bukti/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/bukti/:path*',
      },
      // Masking Download
      {
        source: '/logo/:path*/download',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/fl_attachment/logo/:path*',
      },
      // Format URL lu: domain.com/logo/namafilenya.png
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
