import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const baseContentSecurityPolicyDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self' https: blob: data:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const subtitleWorkbenchContentSecurityPolicyDirectives = baseContentSecurityPolicyDirectives.map((directive) =>
  directive === "frame-src 'self'"
    ? "frame-src 'self' https://yptt-subtitle-workbench.hf.space"
    : directive,
);

const contentSecurityPolicy = [
  ...baseContentSecurityPolicyDirectives,
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const sameOriginFrameContentSecurityPolicy = [
  ...baseContentSecurityPolicyDirectives,
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const subtitleWorkbenchContentSecurityPolicy = [
  ...subtitleWorkbenchContentSecurityPolicyDirectives,
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Use static export only when STATIC_EXPORT=true (for GitHub Pages)
  // For Cloudflare Pages / Vercel, omit this to enable API routes
  ...(process.env.STATIC_EXPORT === "true" ? { output: "export" as const } : {}),

  // Pin the workspace root so Turbopack does not infer the parent home folder.
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      "@perspective-dev/viewer/src/ts/extensions.js":
        "./src/app/finance/perspective-bi/perspective-extensions-shim.js",
    },
  },

  // Disable image optimization for compatibility
  images: {
    unoptimized: true,
  },

  // Trailing slash for compatibility
  trailingSlash: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        source: "/tools/margin-analysis/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: sameOriginFrameContentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
      {
        source: "/tools/subtitle-workbench/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: subtitleWorkbenchContentSecurityPolicy,
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/ai",
        destination: "/thinking-lab",
        permanent: true,
      },
      {
        source: "/essays",
        destination: "/thinking-lab",
        permanent: true,
      },
      {
        source: "/article/ai/:slug",
        destination: "/thinking-lab/:slug",
        permanent: true,
      },
      {
        source: "/article/essays/:slug",
        destination: "/thinking-lab/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
