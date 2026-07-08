import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones/laptops on the home network load the dev server's assets
  // (Next blocks non-localhost origins in dev by default).
  allowedDevOrigins: ["10.0.0.28", "*.local"],
};

export default nextConfig;
