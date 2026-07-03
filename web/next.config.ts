import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: ['192.168.1.5', '192.168.1.5:3000', '192.168.1.5:3001'],
  },
};

export default nextConfig;
