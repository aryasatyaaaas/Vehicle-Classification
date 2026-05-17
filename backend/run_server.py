"""
Entry point untuk PyInstaller build.
Menjalankan FastAPI backend tanpa --reload (tidak kompatibel dengan PyInstaller).
"""
import sys
import os
import multiprocessing

# WAJIB untuk PyInstaller + multiprocessing di Windows
multiprocessing.freeze_support()

# Set base directory ke lokasi executable (bukan temp dir PyInstaller)
if getattr(sys, 'frozen', False):
    # Berjalan sebagai executable PyInstaller
    BASE_DIR   = os.path.dirname(sys.executable)          # folder backend-dist/
    MEIPASS    = getattr(sys, '_MEIPASS', BASE_DIR)        # folder _internal/
    os.environ['BASE_DIR']             = BASE_DIR
    # EasyOCR models dibundel ke _internal/.EasyOCR/
    os.environ['EASYOCR_MODULE_PATH']  = MEIPASS
    os.environ['HOME']                 = MEIPASS           # fallback untuk ~/.EasyOCR
    os.environ['USERPROFILE']          = MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

import uvicorn
from main import app  # Import langsung — bukan string, agar bisa diload saat frozen

if __name__ == "__main__":
    print(f"[Backend] Starting server dari: {BASE_DIR}")
    print(f"[Backend] Port: 8000")
    uvicorn.run(
        app,                # Langsung object, bukan "main:app" string
        host="127.0.0.1",
        port=8000,
        reload=False,       # WAJIB False untuk PyInstaller
        workers=1,
        log_level="info",
    )
