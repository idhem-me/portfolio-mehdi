import type { NextConfig } from "next";
import { hostname, networkInterfaces } from "node:os";
import createNextIntlPlugin from "next-intl/plugin";

/** Aligné avec `SVG_CONTENT_SECURITY_POLICY` dans `src/lib/sanitize-svg.ts`. */
const SVG_CSP =
  "default-src 'none'; script-src 'none'; sandbox; style-src 'unsafe-inline'";

const nextConfig: NextConfig = {
  devIndicators: false,
  // iPhone previews use this Mac's LAN hostname/IP, not localhost. Exact local
  // addresses only: never allow a wildcard origin or relax production headers.
  allowedDevOrigins: [
    hostname(),
    ...Object.values(networkInterfaces()).flatMap((entries) =>
      (entries ?? [])
        .filter((entry) => !entry.internal && entry.family === "IPv4")
        .map((entry) => entry.address),
    ),
  ],
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
      ...[
        "/l/:path*",
        "/listes/:path*",
        "/outils/listes-cadeaux/:path*",
        "/:locale(fr|en|zh|ar|es|it|de)/l/:path*",
        "/:locale(fr|en|zh|ar|es|it|de)/listes/:path*",
        "/:locale(fr|en|zh|ar|es|it|de)/outils/listes-cadeaux/:path*",
      ].map((source) => ({
        source,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'" +
                (process.env.NODE_ENV === "development"
                  ? " 'unsafe-eval'"
                  : ""),
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: http: data:",
              "font-src 'self' data:",
              "connect-src 'self'" +
                (process.env.NODE_ENV === "development" ? " ws: wss:" : ""),
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      })),
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

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
