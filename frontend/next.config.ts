import type { NextConfig } from "next";

// Static export HANYA aktif saat build Tauri (TAURI_BUILD=1)
// npm run dev tetap berjalan normal tanpa export
const isTauriBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  output:       isTauriBuild ? "export"  : undefined,
  images:       isTauriBuild ? { unoptimized: true } : {},
  trailingSlash: isTauriBuild ? true : false,
  assetPrefix:  isTauriBuild ? "" : undefined,
};

export default nextConfig;
