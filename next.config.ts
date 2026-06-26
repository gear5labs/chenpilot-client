import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:2333';
    return [
      {
        source: '/horizon/:path*',
        destination: `${backendUrl}/proxy/:path*`,
      },
    ];
  },
};

export default nextConfig;
