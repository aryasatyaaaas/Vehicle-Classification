@echo off
REM ==========================================================
REM  setup_env.bat - Setup environment untuk Vehicle_Classification
REM  Jalankan satu kali dari root folder project
REM ==========================================================

echo.
echo =====================================================
echo  Vehicle Classification - Environment Setup
echo =====================================================
echo.

REM --- Cek Python ---
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python tidak ditemukan. Install dari https://python.org
    pause
    exit /b 1
)
echo [OK] Python ditemukan.

REM --- Cek Node.js ---
node --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Node.js tidak ditemukan. Install dari https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js ditemukan.

echo.
echo [1/3] Setup Python venv untuk /ai ...
cd ai
python -m venv venv
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
call venv\Scripts\deactivate.bat
cd ..
echo [OK] /ai environment siap.

echo.
echo [2/3] Setup Python venv untuk /backend ...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
call venv\Scripts\deactivate.bat
cd ..
echo [OK] /backend environment siap.

echo.
echo [3/3] Setup Node.js dependencies untuk /frontend ...
cd frontend
npm install
cd ..
echo [OK] /frontend dependencies siap.

echo.
echo =====================================================
echo  Setup selesai!
echo.
echo  Langkah selanjutnya:
echo  1. Training model  : cd ai  dan  venv\Scripts\activate  lalu  python train.py
echo  2. Export model    : python export_model.py
echo  3. Jalankan API    : cd backend  dan  venv\Scripts\activate  lalu  python main.py
echo  4. Jalankan UI     : cd frontend  dan  npm run dev
echo =====================================================
echo.
pause
