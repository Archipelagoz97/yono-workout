import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Yono Workout — Next.js configuration
  // All data is local-only (IndexedDB), so we don't need image optimization
  // for external domains.
  
  // Allow the app to work as a PWA by including the manifest
  // and enabling static export optimization
  
  // Suppress hydration warnings from IndexedDB-driven UI
  reactStrictMode: true,
  
  // External packages that should not be bundled (server-side only)
  serverExternalPackages: [],
  
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
