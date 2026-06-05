import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep dev artifacts isolated from production build output.
  // This avoids intermittent ENOENT on routes-manifest when different Next processes touch .next.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid intermittent ENOENT pack cache corruption on Windows during hot reload.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
