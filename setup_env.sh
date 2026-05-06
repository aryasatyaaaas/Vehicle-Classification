#!/usr/bin/env bash
# ==========================================================
#  setup_env.sh - Setup environment untuk Vehicle_Classification
#  Jalankan satu kali dari root folder project
#  Usage: bash setup_env.sh
# ==========================================================

set -e

echo ""
echo "====================================================="
echo " Vehicle Classification - Environment Setup (Linux/Mac)"
echo "====================================================="
echo ""

# --- Cek Python ---
if ! command -v python3 &>/dev/null; then
  echo "[ERROR] python3 tidak ditemukan."
  exit 1
fi
echo "[OK] Python3: $(python3 --version)"

# --- Cek Node.js ---
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js tidak ditemukan. Install dari https://nodejs.org"
  exit 1
fi
echo "[OK] Node.js: $(node --version)"

# 1. AI venv
echo ""
echo "[1/3] Setup Python venv untuk /ai ..."
cd ai
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
echo "[OK] /ai environment siap."

# 2. Backend venv
echo ""
echo "[2/3] Setup Python venv untuk /backend ..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
echo "[OK] /backend environment siap."

# 3. Frontend deps
echo ""
echo "[3/3] Setup Node.js dependencies untuk /frontend ..."
cd frontend
npm install
cd ..
echo "[OK] /frontend dependencies siap."

echo ""
echo "====================================================="
echo " Setup selesai!"
echo ""
echo " Langkah selanjutnya:"
echo "  1. cd ai && source venv/bin/activate && python train.py"
echo "  2. python export_model.py"
echo "  3. cd ../backend && source venv/bin/activate && python main.py"
echo "  4. cd ../frontend && npm run dev"
echo "====================================================="
