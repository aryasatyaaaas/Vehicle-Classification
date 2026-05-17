#!/bin/bash
# update.sh — Script update aplikasi dengan satu perintah
# Usage: ./update.sh

set -e

echo "======================================"
echo "  Jasa Marga Toll System — Updater"
echo "======================================"

# 1. Pull perubahan terbaru dari GitHub
echo "[1/4] Pulling latest changes from GitHub..."
git pull origin main

# 2. Rebuild dan restart container yang berubah
echo "[2/4] Rebuilding Docker images..."
docker compose build --no-cache

# 3. Restart semua service
echo "[3/4] Restarting services..."
docker compose up -d

# 4. Bersihkan image lama yang tidak terpakai
echo "[4/4] Cleaning up old images..."
docker image prune -f

echo ""
echo "======================================"
echo "  ✅ Update selesai!"
echo "  Frontend : http://$(hostname -I | awk '{print $1}'):80"
echo "  Backend  : http://$(hostname -I | awk '{print $1}'):8000"
echo "======================================"

# Tampilkan status container
docker compose ps
