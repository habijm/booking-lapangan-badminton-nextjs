/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // HTTP headers untuk SEO & security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Keamanan dasar
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          // Cache halaman publik: fresh 60 detik, stale ok 5 menit (baik untuk SEO)
          { key: 'Cache-Control',             value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        // Admin: jangan di-cache dan jangan diindex
        source: '/admin/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        // API routes: jangan di-cache
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },

  // Redirect www ke non-www (opsional, sesuaikan domain)
  // async redirects() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       has: [{ type: 'host', value: 'www.your-domain.com' }],
  //       destination: 'https://your-domain.com/:path*',
  //       permanent: true,
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
