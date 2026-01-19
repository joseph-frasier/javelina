import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "script-src-elem 'self' 'unsafe-inline' https://js.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.stripe.com https://hcaptcha.com https://newassets.hcaptcha.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.stripe.com https://hcaptcha.com https://newassets.hcaptcha.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
              "frame-src 'self' https://js.hcaptcha.com https://newassets.hcaptcha.com https://js.stripe.com https://*.stripe.com https://checkout.stripe.com https://irongrove.freshdesk.com https://*.freshdesk.com https://euc-widget.freshworks.com",
              "connect-src 'self' http://localhost:3001 https://*.supabase.co https://api.stripe.com https://*.stripe.com https://clientstream.launchdarkly.com https://app.launchdarkly.com https://events.launchdarkly.com https://hcaptcha.com https://irongrove.freshdesk.com https://*.freshdesk.com https://s3.amazonaws.com https://euc-widget.freshworks.com",
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
