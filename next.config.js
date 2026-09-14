/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // HTTP headers untuk SEO & security
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://api.midtrans.com https://api.sandbox.midtrans.com",
      "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy',   value: cspDirectives },
          { key: 'Cache-Control',             value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/(.*)',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'https' }],
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/admin/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
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
