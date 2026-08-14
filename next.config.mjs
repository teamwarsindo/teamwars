/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },

  async rewrites() {
    return [
      // ⚡ FORMAT MASKING MATCH REPORT (Folder "report" di Cloudinary)
      {
        source: '/report/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/report/:path*',
      },

      // Format URL Bukti
      {
        source: '/bukti/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/bukti/:path*',
      },

      // ⚡ MASKING DOWNLOAD (Harus di ATAS /logo/:path*)
      {
        source: '/logo/:filename/download',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/fl_attachment/logo/:filename',
      },

      // Format URL Logo Biasa untuk Display Web
      {
        source: '/logo/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/logo/:path*',
      },
    ];
  },

  // 🟢 CEGAH CACHE AGAR GAMBAR HASIL OVERWRITE LANGSUNG TERUPDATE
  async headers() {
    return [
      {
        source: '/report/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },

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