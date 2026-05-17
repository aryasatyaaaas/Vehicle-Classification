import type { NextConfig } from "next";

// Static export HANYA aktif saat build Tauri (TAURI_BUILD=1)
// Standalone mode untuk Docker (DOCKER_BUILD=1)
// npm run dev tetap berjalan normal tanpa flag apapun
const isTauriBuild  = process.env.TAURI_BUILD   === "1";
const isDockerBuild = process.env.DOCKER_BUILD  === "1";

const nextConfig: NextConfig = {
  output:        isTauriBuild ? "export" : isDockerBuild ? "standalone" : undefined,
  images:        isTauriBuild ? { unoptimized: true } : {},
  trailingSlash: isTauriBuild ? true : false,
  assetPrefix:   isTauriBuild ? "" : undefined,
};

export default nextConfig;
