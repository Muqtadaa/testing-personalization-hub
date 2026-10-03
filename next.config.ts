import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FX content pages are interactive client components; nothing exotic needed here yet.
  // Server capabilities (API routes, etc.) become available for Phase 2 (Intake) and beyond.

  // @resvg/resvg-js is a native (.node) addon used server-side to rasterize lo-fi
  // SVG mockups. Keep it out of the bundler so the native binding loads at runtime.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
