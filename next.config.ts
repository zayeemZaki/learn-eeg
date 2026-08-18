import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EEG images live in Vercel Blob. Pinned to that host: a wildcard hostname
  // turns the built-in image optimizer into an open proxy — anyone could fetch
  // arbitrary remote URLs through our deployment, on our bandwidth and CPU.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
