import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers including Content Security Policy
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com",
              "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://newassets.hcaptcha.com",
              "frame-src 'self' https://js.hcaptcha.com https://newassets.hcaptcha.com https://checkout.stripe.com https://irongrove.freshdesk.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com https://events.launchdarkly.com https://hcaptcha.com https://irongrove.freshdesk.com https://*.freshdesk.com",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
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
        ],
      },
    ];
  },
  // Exclude backend folder from Next.js build
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/node_modules", "**/backend/**"],
    };
    return config;
  },
};

export default nextConfig;
