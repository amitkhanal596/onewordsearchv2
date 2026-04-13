import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint errors during build (for deployment)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Still check types, but don't fail on warnings
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
