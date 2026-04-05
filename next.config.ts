import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use static export only when STATIC_EXPORT=true (for GitHub Pages)
  // For Cloudflare Pages / Vercel, omit this to enable API routes
  ...(process.env.STATIC_EXPORT === "true" ? { output: "export" as const } : {}),

  // Disable image optimization for compatibility
  images: {
    unoptimized: true,
  },

  // Trailing slash for compatibility
  trailingSlash: true,
};

export default nextConfig;
