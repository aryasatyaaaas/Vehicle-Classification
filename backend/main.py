"""
FastAPI Backend - Vehicle Classification API
Endpoint: POST /predict  → upload gambar, return JSON hasil klasifikasi
"""

import os
import io
import time
import uuid
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from ultralytics import YOLO
import uvicorn

# ── Config ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
MODEL_PATH = BASE_DIR / "models" / "best.pt"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

CLASS_INFO = {
    0: {"name": "GOL I",   "description": "Motor / Sepeda",                   "color": "#22c55e"},
    1: {"name": "GOL II",  "description": "Sedan / Minibus / Pick-up",        "color": "#3b82f6"},
    2: {"name": "GOL III", "description": "Truk 2 Gandar",                    "color": "#f59e0b"},
    3: {"name": "GOL IV",  "description": "Truk 3 Gandar",                    "color": "#ef4444"},
    4: {"name": "GOL V",   "description": "Truk 4 Gandar atau lebih",         "color": "#8b5cf6"},
}

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Vehicle Classification API",
    description="API klasifikasi golongan kendaraan tol menggunakan YOLOv8",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load Model ───────────────────────────────────────────────────────────────
model: Optional[YOLO] = None

@app.on_event("startup")
async def load_model():
    global model
    if MODEL_PATH.exists():
        model = YOLO(str(MODEL_PATH))
        print(f"✅ Model loaded: {MODEL_PATH}")
    else:
        print(f"⚠️  Model tidak ditemukan di {MODEL_PATH}")
        print("   Jalankan ai/train.py terlebih dahulu, lalu ai/export_model.py")


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Vehicle Classification API",
        "model_loaded": model is not None,
        "endpoints": {
            "predict": "POST /predict",
            "health":  "GET  /health",
            "classes": "GET  /classes",
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}


@app.get("/classes")
async def get_classes():
    return {"classes": CLASS_INFO}


@app.post("/predict")
async def predict(file: UploadFile = File(...), conf: float = 0.25):
    """
    Upload gambar kendaraan → return daftar deteksi + bounding box
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model belum tersedia. Latih model terlebih dahulu."
        )

    # Validasi tipe file
    allowed = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Tipe file tidak didukung: {file.content_type}")

    # Baca gambar
    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    img      = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Gagal membaca gambar.")

    t0 = time.perf_counter()

    # Inferensi
    results = model.predict(img, conf=conf, verbose=False)[0]

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    # Parse deteksi
    detections = []
    for box in results.boxes:
        cls_id   = int(box.cls)
        conf_val = float(box.conf)
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        info = CLASS_INFO.get(cls_id, {"name": f"Class {cls_id}", "description": "-", "color": "#888"})
        detections.append({
            "class_id":    cls_id,
            "class_name":  info["name"],
            "description": info["description"],
            "color":       info["color"],
            "confidence":  round(conf_val, 4),
            "bbox":        {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        })

    # Sort by confidence
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    return JSONResponse({
        "filename":    file.filename,
        "image_size":  {"width": img.shape[1], "height": img.shape[0]},
        "inference_ms": elapsed_ms,
        "total_detections": len(detections),
        "detections":  detections,
    })


# ── WebSocket live stream (opsional) ─────────────────────────────────────────
@app.websocket("/ws/predict")
async def ws_predict(websocket: WebSocket):
    """Terima frame base64, kirim balik hasil deteksi."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            if model is None:
                await websocket.send_json({"error": "Model not loaded"})
                continue
            nparr   = np.frombuffer(data, np.uint8)
            img     = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            results = model.predict(img, conf=0.25, verbose=False)[0]
            dets    = []
            for box in results.boxes:
                cls_id   = int(box.cls)
                conf_val = float(box.conf)
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                info = CLASS_INFO.get(cls_id, {})
                dets.append({
                    "class_id":   cls_id,
                    "class_name": info.get("name", f"Class {cls_id}"),
                    "confidence": round(conf_val, 4),
                    "bbox":       {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                })
            await websocket.send_json({"detections": dets})
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
