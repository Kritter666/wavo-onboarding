import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow production builds to succeed even if ESLint has errors.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
