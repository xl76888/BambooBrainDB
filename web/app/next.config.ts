import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'dist',
  reactStrictMode: false,
  allowedDevOrigins: ['10.10.18.71'],
  output: 'standalone',
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    unoptimized: false,
  },
  async rewrites() {
    const rewritesPath = [];
    if (process.env.NODE_ENV === 'development') {
      rewritesPath.push(
        ...[
          {
            source: '/share/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_URL}/share/:path*`,
            basePath: false as const,
          },
          {
            source: '/static-file/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_URL}/static-file/:path*`,
            basePath: false as const,
          }
        ]
      );
    }
    return rewritesPath;
  },
};

export default nextConfig;
