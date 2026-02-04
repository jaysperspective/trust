import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'stsci-opo.org',
        pathname: '/STScI-*',
      },
      {
        protocol: 'https',
        hostname: 'www.nasa.gov',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.nasa.gov',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'webbtelescope.org',
        pathname: '/**',
      },
    ],
  },
  // Improve dev experience
  reactStrictMode: true,
  // Allow experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
