import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EEG atlas images may be served from object storage (S3 / Vercel Blob).
  // Whitelist remote hosts explicitly rather than disabling optimization.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
