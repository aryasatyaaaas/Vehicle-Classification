@echo off
REM ================================================
REM  start_frontend.bat - Jalankan Next.js frontend
REM ================================================
cd /d "%~dp0\frontend"
echo.
echo  Starting Next.js Frontend...
echo  UI : http://localhost:3000
echo  Press Ctrl+C to stop.
echo.
npm run dev
