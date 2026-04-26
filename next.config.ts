import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Use static export only when STATIC_EXPORT=true (for GitHub Pages)
  // For Cloudflare Pages / Vercel, omit this to enable API routes
  ...(process.env.STATIC_EXPORT === "true" ? { output: "export" as const } : {}),

  // Pin the workspace root so Turbopack does not infer the parent home folder.
  turbopack: {
    root: projectRoot,
  },

  // Disable image optimization for compatibility
  images: {
    unoptimized: true,
  },

  // Trailing slash for compatibility
  trailingSlash: true,
};

export default nextConfig;
