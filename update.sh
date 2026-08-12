#!/bin/bash
# update.sh — Deploy ke production dengan satu perintah
# Usage  : ./update.sh              → rebuild semua yang berubah (pakai cache)
# Usage  : ./update.sh --no-cache  → full rebuild (pakai saat ada dependency baru)

set -e

NO_CACHE_FLAG=""
if [[ "$1" == "--no-cache" ]]; then
  NO_CACHE_FLAG="--no-cache"
  echo "⚠  Mode: full rebuild (no-cache)"
fi

echo "========================================"
echo "  Vehicle Classification — Deploy"
echo "========================================"

# 1. Pull perubahan terbaru dari GitHub
echo ""
echo "[1/4] Pulling latest changes from GitHub..."
git pull origin main

# 2. Rebuild hanya image yang source-nya berubah (pakai Docker layer cache)
echo ""
echo "[2/4] Rebuilding Docker images..."
docker compose build $NO_CACHE_FLAG

# 3. Rolling restart — down lalu up (urutan: backend dulu, lalu frontend, lalu nginx)
echo ""
echo "[3/4] Restarting containers..."
docker compose up -d --remove-orphans

# 4. Bersihkan image lama yang tidak terpakai (dangling images)
echo ""
echo "[4/4] Cleaning up dangling images..."
docker image prune -f

echo ""
echo "========================================"
echo "  ✅ Deploy selesai!"
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo "  App      : https://${IP}"
echo "  Backend  : http://${IP}:8000/health"
echo "========================================"
echo ""

# Tampilkan status container
docker compose ps
