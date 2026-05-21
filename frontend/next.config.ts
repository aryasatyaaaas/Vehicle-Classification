import type { NextConfig } from "next";

// Static export HANYA aktif saat build Tauri (TAURI_BUILD=1)
// Standalone mode untuk Docker (DOCKER_BUILD=1)
// npm run dev tetap berjalan normal tanpa flag apapun
const isTauriBuild  = process.env.TAURI_BUILD   === "1";
const isDockerBuild = process.env.DOCKER_BUILD  === "1";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  output:        isTauriBuild ? "export" : isDockerBuild ? "standalone" : undefined,
  images:        isTauriBuild ? { unoptimized: true } : {},
  trailingSlash: isTauriBuild ? true : false,
  assetPrefix:   isTauriBuild ? "" : undefined,

  // Proxy /api/* dan /ws/* ke backend saat npm run dev
  // (di production, nginx yang menangani routing ini)
  async rewrites() {
    if (isTauriBuild || isDockerBuild) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${BACKEND_URL}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
