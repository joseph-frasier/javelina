import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The wizard's photo upload server action passes multipart bodies up to
    // 10 × 25 MB. Default cap is 1 MB.
    serverActions: {
      bodySizeLimit: "300mb",
    },
  },
  // Security headers including Content Security Policy
  // Note: If you deploy with a separate backend API domain (e.g., api.yourdomain.com),
  // add it to the connect-src directive below
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://js.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "script-src-elem 'self' 'unsafe-inline' https://vercel.live https://js.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "style-src 'self' 'unsafe-inline' https://vercel.live https://fonts.googleapis.com https://*.stripe.com https://hcaptcha.com https://newassets.hcaptcha.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "style-src-elem 'self' 'unsafe-inline' https://vercel.live https://fonts.googleapis.com https://*.stripe.com https://hcaptcha.com https://newassets.hcaptcha.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "frame-src 'self' https://vercel.live https://js.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://*.stripe.com https://checkout.stripe.com https://irongrove.freshdesk.com https://*.freshdesk.com https://euc-widget.freshworks.com",
              "connect-src 'self' http://localhost:3001 https://vercel.live https://*.vercel.app https://*.supabase.co https://api.stripe.com https://*.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com https://events.launchdarkly.com https://hcaptcha.com https://irongrove.freshdesk.com https://*.freshdesk.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/domains/transfer', destination: '/domains?tab=transfer', permanent: true },
      { source: '/domains/my-domains', destination: '/domains?tab=my-domains', permanent: true },
    ];
  },
  // Proxy API calls through same origin to avoid Safari ITP third-party cookie blocking.
  // Login/signup full-page navigations still go directly to Express.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/api/backend-auth/:path*',
        destination: `${backendUrl}/auth/:path*`,
      },
    ];
  },
  // Exclude backend folder from Next.js build
  webpack: (config, { dev }) => {
    const disableFsCache = process.env.NEXT_DISABLE_WEBPACK_FS_CACHE === "1";
    if (dev || disableFsCache) {
      // Work around intermittent webpack filesystem cache snapshot failures
      // ("Unable to snapshot resolve dependencies") seen in this repo.
      config.cache = { type: "memory" };
    }

    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/node_modules/**", "**/backend/**"],
    };
    return config;
  },
};

export default nextConfig;
