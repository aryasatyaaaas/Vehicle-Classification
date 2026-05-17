# backend.spec
# PyInstaller spec untuk bundel backend FastAPI + YOLOv8 + EasyOCR
# Jalankan: pyinstaller backend.spec --clean

import sys
import os
from pathlib import Path

# ── Path Config ────────────────────────────────────────────────────────────────
BACKEND_DIR    = Path(SPECPATH)
EASYOCR_MODELS = Path.home() / ".EasyOCR" / "model"
VENV_DIR       = BACKEND_DIR / "venv"

# Cari site-packages venv
SITE_PACKAGES = VENV_DIR / "Lib" / "site-packages"

print(f"[spec] Backend dir : {BACKEND_DIR}")
print(f"[spec] EasyOCR dir : {EASYOCR_MODELS}")
print(f"[spec] Site packages: {SITE_PACKAGES}")
print(f"[spec] Model best.pt: {BACKEND_DIR / 'models' / 'best.pt'}")

# ── Hidden imports ─────────────────────────────────────────────────────────────
hidden_imports = [
    # Uvicorn internals
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    # FastAPI / Starlette
    "fastapi",
    "starlette",
    "starlette.routing",
    "starlette.middleware",
    "starlette.middleware.cors",
    "multipart",
    "python_multipart",
    # ML
    "ultralytics",
    "easyocr",
    "cv2",
    "PIL",
    "PIL.Image",
    "numpy",
    "torch",
    "torchvision",
    # Utils
    "h11",
    "anyio",
    "sniffio",
    "click",
    "aiofiles",
]

# ── Data files (non-Python files yang ikut dibundel) ──────────────────────────
datas = [
    # Model YOLOv8
    (str(BACKEND_DIR / "models" / "best.pt"), "models"),
    # plate_ocr module
    (str(BACKEND_DIR / "plate_ocr.py"), "."),
    # EasyOCR models (wajib untuk offline)
    (str(EASYOCR_MODELS / "craft_mlt_25k.pth"), ".EasyOCR/model"),
    (str(EASYOCR_MODELS / "english_g2.pth"),    ".EasyOCR/model"),
]

# ── Analysis ───────────────────────────────────────────────────────────────────
a = Analysis(
    [str(BACKEND_DIR / "run_server.py")],   # Entrypoint (bukan main.py)
    pathex=[str(BACKEND_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude hal-hal tidak diperlukan untuk menghemat ukuran
        "matplotlib",
        "tkinter",
        "_tkinter",
        "IPython",
        "notebook",
        "jupyter",
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,      # False = one-file, True = one-folder (lebih stabil)
    name="backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,                  # UPX bisa rusak DLL PyTorch — matikan
    console=True,               # True = tampilkan console (berguna untuk debug)
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="backend",             # Output: dist/backend/backend.exe
)
