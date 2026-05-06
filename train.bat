@echo off
REM ====================================================================
REM  train.bat — Pipeline lengkap: Training → Evaluasi → Export ONNX
REM  Project  : Klasifikasi Golongan Kendaraan Tol
REM  Jalankan dari root folder project
REM ====================================================================

setlocal
cd /d "%~dp0\ai"

echo.
echo ====================================================================
echo   VEHICLE CLASSIFICATION TOL — Pipeline Training
echo ====================================================================
echo.

REM Cek venv
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment tidak ditemukan di ai\venv\
    echo         Jalankan setup_env.bat terlebih dahulu.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

REM ── STEP 1: TRAINING ────────────────────────────────────────────────
echo [STEP 1/3] Memulai training YOLOv8n ...
echo            Dataset : ai\dataset\data.yaml
echo            Output  : ai\runs\vehicle_cls_v1\
echo            Device  : CPU  (batch=4)
echo.
python train.py
if ERRORLEVEL 1 (
    echo.
    echo [ERROR] Training gagal. Cek pesan error di atas.
    call venv\Scripts\deactivate.bat
    pause
    exit /b 1
)

REM ── STEP 2: EVALUASI ────────────────────────────────────────────────
echo.
echo [STEP 2/3] Menjalankan evaluasi model ...
echo            Output  : ai\runs\evaluation\
echo.
python evaluate.py
if ERRORLEVEL 1 (
    echo [WARNING] Evaluasi gagal. Lanjut ke export...
)

REM ── STEP 3: EXPORT ONNX ─────────────────────────────────────────────
echo.
echo [STEP 3/3] Export model ke ONNX ...
echo            Output  : backend\models\best.onnx
echo.
python export.py --format onnx
if ERRORLEVEL 1 (
    echo [WARNING] Export ONNX gagal. Coba jalankan manual: python export.py
)

call venv\Scripts\deactivate.bat

echo.
echo ====================================================================
echo   PIPELINE SELESAI!
echo.
echo   File hasil:
echo     ai\runs\vehicle_cls_v1\weights\best.pt    ^<-- Model terbaik
echo     ai\runs\evaluation\metrics_summary.json   ^<-- Metrik JSON
echo     ai\runs\evaluation\confusion_matrix.png   ^<-- Confusion Matrix
echo     ai\runs\evaluation\prediction_samples.png ^<-- Contoh prediksi
echo     backend\models\best.pt                    ^<-- Untuk FastAPI
echo     backend\models\best.onnx                  ^<-- Versi ONNX
echo.
echo   Langkah selanjutnya:
echo     1. Jalankan start_backend.bat  ^(FastAPI API^)
echo     2. Jalankan start_frontend.bat ^(Next.js UI^)
echo ====================================================================
echo.
pause
