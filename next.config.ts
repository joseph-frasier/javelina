import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
