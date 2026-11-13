import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server blocks client resources for 127.0.0.1 unless it is listed here.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
