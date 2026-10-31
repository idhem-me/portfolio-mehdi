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
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Cache Components emits inline bootstrap scripts; no unsafe-eval in production.
              "script-src 'self' 'unsafe-inline' https://*.posthog.com https://www.clarity.ms https://*.clarity.ms https://accounts.google.com" +
                (process.env.NODE_ENV === "development"
                  ? " 'unsafe-eval'"
                  : ""),
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "img-src 'self' https: data: blob:" +
                (process.env.NODE_ENV === "development" ? " http:" : ""),
              "font-src 'self' data:",
              "connect-src 'self' https://*.posthog.com https://*.clarity.ms https://*.bing.com https://api.web3forms.com https://accounts.google.com" +
                (process.env.NODE_ENV === "development" ? " ws: wss:" : ""),
              "frame-src https://accounts.google.com",
              "worker-src 'self' blob:",
              "media-src 'self' blob: data:",
              "script-src-attr 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
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
