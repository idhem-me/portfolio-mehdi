import type { NextConfig } from "next";

/** Aligné avec `SVG_CONTENT_SECURITY_POLICY` dans `src/lib/sanitize-svg.ts`. */
const SVG_CSP =
  "default-src 'none'; script-src 'none'; sandbox; style-src 'unsafe-inline'";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    contentSecurityPolicy: SVG_CSP,
    contentDispositionType: "attachment",
  },
  async headers() {
    return [
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Content-Security-Policy",
            value: SVG_CSP,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      // Intercepte les SVG de /public pour les servir sanitises.
      // Destination sans .svg → pas de boucle (le matcher exige le suffixe).
      beforeFiles: [
        {
          source: "/:path*.svg",
          destination: "/api/assets/svg/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
