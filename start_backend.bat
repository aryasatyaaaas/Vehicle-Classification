@echo off
REM ================================================
REM  start_backend.bat - Jalankan FastAPI backend
REM ================================================
cd /d "%~dp0\backend"
call venv\Scripts\activate.bat
echo.
echo  Starting FastAPI Backend...
echo  API Docs : http://localhost:8000/docs
echo  Press Ctrl+C to stop.
echo.
venv\Scripts\python.exe main.py
