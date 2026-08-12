"""
FastAPI Backend - Vehicle Classification API
v3.0 — Smart Capture + Vehicle Stability Detection + Two-Stage Plate Detection (eTilang-style)
"""

import asyncio
import io
import os
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional, List, Dict, Deque

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import uvicorn

from plate_ocr import read_plate, read_plate_from_frame  # ← EasyOCR plate reader

# ── Config ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
MODEL_PATH = BASE_DIR / "models" / "best.pt"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

WS_CONF_THRESHOLD = 0.15

# Stabilitas: berapa frame berturut-turut bbox harus tidak berubah (IoU > IOU_STABLE_MIN)
STABILITY_FRAMES  = 5       # frame stabil sebelum trigger analisis penuh
IOU_STABLE_MIN    = 0.85    # minimum IoU bbox antar frame untuk dianggap "tidak bergerak"
FRAME_BUFFER_SIZE = 15      # simpan N frame terakhir untuk memilih yang paling tajam

# Berapa frame kosong sebelum cache plat di-reset
# Diperpanjang agar OCR tidak terpotong saat kendaraan bergeser sedikit
PLATE_RESET_GRACE = 25

CLASS_INFO = {
    0: {"name": "GOL I",   "description": "Sedan / Jip / Pick-up / Bus",  "color": "#22c55e"},
    1: {"name": "GOL II",  "description": "Truk 2 Gandar",                "color": "#3b82f6"},
    2: {"name": "GOL III", "description": "Truk 3 Gandar",                "color": "#f59e0b"},
    3: {"name": "GOL IV",  "description": "Truk 4 Gandar",                "color": "#ef4444"},
    4: {"name": "GOL V",   "description": "Truk 5 Gandar atau lebih",     "color": "#8b5cf6"},
}

# ── Thread pool khusus untuk OCR (CPU-bound, agar tidak blokir event loop) ──
# _ocr_executor: dipakai WebSocket streaming (1 worker, FIFO per koneksi)
_ocr_executor     = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ocr-ws")
# _capture_executor: dipakai endpoint /capture & /predict (terpisah agar tidak antri di belakang WS OCR)
_capture_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ocr-capture")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Vehicle Classification API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model ─────────────────────────────────────────────────────────────────────
model: Optional[YOLO] = None

@app.on_event("startup")
async def load_model():
    global model
    if MODEL_PATH.exists():
        model = YOLO(str(MODEL_PATH))
        print(f"[OK] YOLO model loaded: {MODEL_PATH}")
        print(f"   Classes: {model.names}")
    else:
        print(f"[WARN] Model tidak ditemukan di {MODEL_PATH}")

    loop = asyncio.get_event_loop()

    # Pre-load EasyOCR di background thread
    print("[WAIT] Pre-loading EasyOCR di background thread...")
    import plate_ocr
    await loop.run_in_executor(_ocr_executor, plate_ocr.get_reader)
    print("[OK] EasyOCR siap.")

    # Pre-load plate detection model (Stage 2 / eTilang-style)
    print("[WAIT] Pre-loading plate detection model (Stage 2)...")
    import plate_detector
    await loop.run_in_executor(_ocr_executor, plate_detector.get_plate_model)
    print("[OK] Plate detection model siap.")


@app.get("/health")
async def health_check():
    """Health check endpoint — digunakan oleh Tauri untuk deteksi backend siap."""
    return {"status": "ok", "model_loaded": model is not None}



# ── Preprocessing helper ──────────────────────────────────────────────────────
def preprocess_frame(img: np.ndarray) -> np.ndarray:
    """CLAHE + sharpening untuk meningkatkan deteksi kendaraan."""
    h, w = img.shape[:2]
    if w < 640:
        scale = 640 / w
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    img = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
    kernel = np.array([[0, -0.3, 0], [-0.3, 2.2, -0.3], [0, -0.3, 0]], dtype=np.float32)
    img = np.clip(cv2.filter2D(img, -1, kernel), 0, 255).astype(np.uint8)
    return img


# ── Sharpness measurement ─────────────────────────────────────────────────────
def sharpness_score(img: np.ndarray) -> float:
    """
    Hitung ketajaman gambar menggunakan variasi Laplacian.
    Nilai lebih tinggi = gambar lebih tajam (tidak blur).
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    lap  = cv2.Laplacian(gray, cv2.CV_64F)
    return float(lap.var())


# ── IoU helper ───────────────────────────────────────────────────────────────
def bbox_iou(b1: Dict, b2: Dict) -> float:
    """Hitung IoU antara dua bounding box (format: x1,y1,x2,y2)."""
    ix1 = max(b1["x1"], b2["x1"])
    iy1 = max(b1["y1"], b2["y1"])
    ix2 = min(b1["x2"], b2["x2"])
    iy2 = min(b1["y2"], b2["y2"])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0:
        return 0.0
    a1 = (b1["x2"] - b1["x1"]) * (b1["y2"] - b1["y1"])
    a2 = (b2["x2"] - b2["x1"]) * (b2["y2"] - b2["y1"])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0


# ── Vehicle Tracker (per WebSocket session) ───────────────────────────────────
class VehicleTracker:
    """
    Lacak stabilitas bounding box kendaraan antar frame.
    Jika bbox hampir tidak berubah selama STABILITY_FRAMES frame berturut-turut
    → kendaraan dianggap berhenti → siap untuk analisis OCR penuh.
    """

    def __init__(self):
        self.bbox_history: Deque[Optional[Dict]] = deque(maxlen=STABILITY_FRAMES)
        self.frame_buffer: Deque[np.ndarray]     = deque(maxlen=FRAME_BUFFER_SIZE)
        self.stable_count: int  = 0   # berapa frame berturut-turut yang stabil
        self.already_captured: bool = False  # sudah di-capture dalam sesi ini?
        self.last_plate: Optional[str] = None
        self.empty_streak: int = 0

    def update(self, bbox: Optional[Dict], frame: np.ndarray) -> int:
        """
        Perbarui tracker dengan bbox dan frame terbaru.
        Returns: jumlah frame stabil saat ini (0-STABILITY_FRAMES).
        """
        self.frame_buffer.append(frame.copy())

        if bbox is None:
            self.bbox_history.append(None)
            self.stable_count = 0
            return 0

        self.bbox_history.append(bbox)
        history_list = list(self.bbox_history)

        # Butuh setidaknya 2 frame untuk menghitung stabilitas
        if len(history_list) < 2:
            self.stable_count = 1
            return self.stable_count

        # Cek IoU antar frame terakhir
        prev = next((b for b in reversed(history_list[:-1]) if b is not None), None)
        if prev is None:
            self.stable_count = 1
            return self.stable_count

        iou = bbox_iou(prev, bbox)
        if iou >= IOU_STABLE_MIN:
            self.stable_count = min(self.stable_count + 1, STABILITY_FRAMES)
        else:
            self.stable_count = max(0, self.stable_count - 1)

        return self.stable_count

    @property
    def is_stable(self) -> bool:
        return self.stable_count >= STABILITY_FRAMES

    def select_sharpest_frame(self) -> Optional[np.ndarray]:
        """Pilih frame paling tajam dari buffer untuk analisis OCR."""
        if not self.frame_buffer:
            return None
        scored = [(sharpness_score(f), f) for f in self.frame_buffer]
        scored.sort(key=lambda x: x[0], reverse=True)
        score, frame = scored[0]
        print(f"[STABLE] Frame terpilih — sharpness: {score:.1f}")
        return frame

    def reset_capture(self):
        """Reset status capture agar bisa di-capture lagi (kendaraan baru)."""
        self.already_captured = False
        self.last_plate       = None
        self.stable_count     = 0
        self.empty_streak     = 0
        self.bbox_history.clear()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "model_loaded": model is not None}

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.get("/classes")
async def get_classes():
    return {"classes": CLASS_INFO}


@app.post("/predict")
async def predict(file: UploadFile = File(...), conf: float = 0.15):
    """Analisis gambar statis (upload) — untuk capture manual dari frontend."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model belum tersedia.")
    allowed = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Tipe file tidak didukung: {file.content_type}")
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Gagal membaca gambar.")
    t0 = time.perf_counter()
    results = model.predict(img, conf=conf, verbose=False, augment=True)[0]
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
    detections = []
    loop = asyncio.get_running_loop()
    for box in results.boxes:
        cls_id   = int(box.cls)
        conf_val = float(box.conf)
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        info = CLASS_INFO.get(cls_id, {"name": f"Class {cls_id}", "description": "-", "color": "#888"})
        bbox = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
        plate = await loop.run_in_executor(_ocr_executor, read_plate, img, bbox)
        detections.append({
            "class_id": cls_id, "class_name": info["name"],
            "description": info["description"], "color": info["color"],
            "confidence": round(conf_val, 4),
            "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            "plate_number": plate,
        })
    detections.sort(key=lambda d: d["confidence"], reverse=True)
    return JSONResponse({
        "filename": file.filename,
        "image_size": {"width": img.shape[1], "height": img.shape[0]},
        "inference_ms": elapsed_ms,
        "total_detections": len(detections),
        "detections": detections,
    })


@app.post("/capture")
async def manual_capture(file: UploadFile = File(...)):
    """
    Endpoint untuk capture manual dari tombol operator.
    Jalankan analisis penuh: YOLO + sharpness check + OCR.
    Selalu mengembalikan hasil meski confidence rendah.
    Menggunakan _capture_executor terpisah agar tidak antri di belakang WS OCR.
    """
    try:
        if model is None:
            raise HTTPException(status_code=503, detail="Model belum tersedia.")

        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Gagal membaca gambar.")

        sharp = sharpness_score(img)
        print(f"[CAPTURE] Manual capture — sharpness: {sharp:.1f}")

        img_proc = preprocess_frame(img.copy())
        t0 = time.perf_counter()
        results = model.predict(img_proc, conf=0.10, verbose=False, augment=True)[0]
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

        detections = []
        loop = asyncio.get_running_loop()
        orig_h, orig_w = img.shape[:2]
        proc_h, proc_w = img_proc.shape[:2]
        scale_x = orig_w / proc_w
        scale_y = orig_h / proc_h

        for box in results.boxes:
            cls_id   = int(box.cls)
            conf_val = float(box.conf)
            x1 = int(box.xyxy[0][0] * scale_x)
            y1 = int(box.xyxy[0][1] * scale_y)
            x2 = int(box.xyxy[0][2] * scale_x)
            y2 = int(box.xyxy[0][3] * scale_y)
            info = CLASS_INFO.get(cls_id, {"name": f"Class {cls_id}", "description": "-", "color": "#888"})
            bbox = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
            # Gunakan _capture_executor (terpisah dari WS OCR executor)
            plate = await loop.run_in_executor(_capture_executor, read_plate, img, bbox)
            detections.append({
                "class_id": cls_id, "class_name": info["name"],
                "description": info["description"], "color": info["color"],
                "confidence": round(conf_val, 4),
                "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "plate_number": plate,
                "sharpness": round(sharp, 1),
            })

        detections.sort(key=lambda d: d["confidence"], reverse=True)

        # Jika tidak ada deteksi sama sekali, coba OCR full-frame
        if not detections:
            print("[CAPTURE] Tidak ada deteksi YOLO — coba OCR full-frame...")
            plate = await loop.run_in_executor(_capture_executor, read_plate_from_frame, img)
            detections = [{
                "class_id": -1, "class_name": "Tidak Terdeteksi",
                "description": "YOLO tidak menemukan kendaraan", "color": "#94a3b8",
                "confidence": 0.0,
                "bbox": {"x1": 0, "y1": 0, "x2": img.shape[1], "y2": img.shape[0]},
                "plate_number": plate,
                "sharpness": round(sharp, 1),
            }]

        return JSONResponse({
            "source": "manual_capture",
            "image_size": {"width": img.shape[1], "height": img.shape[0]},
            "inference_ms": elapsed_ms,
            "sharpness": round(sharp, 1),
            "total_detections": len(detections),
            "detections": detections,
        })

    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        print(f"[CAPTURE] ERROR: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Capture error: {str(exc)}")


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/predict")
async def ws_predict(websocket: WebSocket):
    """
    Terima frame JPEG binary → deteksi golongan + stabilitas → kirim JSON.

    Logika baru (v2.0):
    - VehicleTracker melacak stabilitas bbox antar frame
    - Saat kendaraan stabil (STABILITY_FRAMES frame IoU > IOU_STABLE_MIN):
        • Pilih frame paling tajam dari buffer
        • Jalankan OCR penuh pada frame tersebut
        • Kirim flag `stable: true` + `stability_count` ke frontend
    - OCR TIDAK dijalankan saat kendaraan masih bergerak (hemat resource)
    """
    await websocket.accept()
    print("[WS] Client connected")

    loop    = asyncio.get_running_loop()
    tracker = VehicleTracker()

    ocr_future: Optional[asyncio.Future] = None
    frame_counter = 0

    try:
        while True:
            data = await websocket.receive_bytes()
            frame_counter += 1

            if model is None:
                await websocket.send_json({"error": "Model not loaded", "detections": []})
                continue

            # Decode frame
            nparr    = np.frombuffer(data, np.uint8)
            img_orig = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_orig is None:
                await websocket.send_json({"detections": [], "stability_count": 0, "stable": False})
                continue

            # Preprocess untuk deteksi YOLO
            img_proc = preprocess_frame(img_orig.copy())
            orig_h, orig_w = img_orig.shape[:2]
            proc_h, proc_w = img_proc.shape[:2]
            scale_x = orig_w / proc_w
            scale_y = orig_h / proc_h

            # YOLO inference
            results = model.predict(
                img_proc,
                conf=WS_CONF_THRESHOLD,
                iou=0.45,
                verbose=False,
                augment=False,
            )[0]

            yolo_has_vehicle = len(results.boxes) > 0

            # ── Ambil hasil OCR jika future sudah selesai ──────────────────
            if ocr_future is not None and ocr_future.done():
                try:
                    result = ocr_future.result()
                    if result:
                        tracker.last_plate = result
                        print(f"[OCR] Plat terbaca: {tracker.last_plate}")
                        # Push plate segera ke frontend (dets belum dibangun, pakai [])
                        try:
                            await websocket.send_json({
                                "detections":      [],
                                "stability_count": tracker.stable_count,
                                "stable":          tracker.is_stable,
                                "stability_max":   STABILITY_FRAMES,
                                "plate_update":    tracker.last_plate,
                            })
                        except Exception:
                            pass  # WebSocket mungkin sudah disconnect
                    else:
                        print("[OCR] OCR tidak berhasil membaca plat")
                except Exception as e:
                    print(f"[OCR] Error: {e}")
                ocr_future = None

            dets = []
            top_bbox: Optional[Dict] = None

            if yolo_has_vehicle:
                tracker.empty_streak = 0

                # Ambil box dengan confidence tertinggi
                best_box = max(results.boxes, key=lambda b: float(b.conf))
                cls_id   = int(best_box.cls)
                conf_val = float(best_box.conf)
                x1 = int(best_box.xyxy[0][0] * scale_x)
                y1 = int(best_box.xyxy[0][1] * scale_y)
                x2 = int(best_box.xyxy[0][2] * scale_x)
                y2 = int(best_box.xyxy[0][3] * scale_y)
                top_bbox = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}

                # Update tracker dengan bbox terbaru
                stable_count = tracker.update(top_bbox, img_orig)

                # ── Trigger OCR hanya saat kendaraan stabil ──────────────
                if (
                    tracker.is_stable
                    and not tracker.already_captured
                    and ocr_future is None
                ):
                    print(f"[STABLE] Kendaraan stabil setelah {stable_count} frame — memilih frame terbaik...")
                    tracker.already_captured = True
                    sharpest = tracker.select_sharpest_frame()
                    if sharpest is None:
                        sharpest = img_orig
                    bbox_copy = dict(top_bbox)
                    ocr_future = loop.run_in_executor(
                        _ocr_executor, read_plate, sharpest, bbox_copy
                    )

                for box in results.boxes:
                    c_id   = int(box.cls)
                    c_conf = float(box.conf)
                    bx1 = int(box.xyxy[0][0] * scale_x)
                    by1 = int(box.xyxy[0][1] * scale_y)
                    bx2 = int(box.xyxy[0][2] * scale_x)
                    by2 = int(box.xyxy[0][3] * scale_y)
                    info = CLASS_INFO.get(c_id, {"name": f"Class {c_id}", "description": "-", "color": "#888"})
                    dets.append({
                        "class_id":    c_id,
                        "class_name":  info["name"],
                        "description": info["description"],
                        "color":       info["color"],
                        "confidence":  round(c_conf, 4),
                        "bbox":        {"x1": bx1, "y1": by1, "x2": bx2, "y2": by2},
                        "plate_number": tracker.last_plate,
                    })

            else:
                # Tidak ada deteksi YOLO
                tracker.empty_streak += 1
                tracker.update(None, img_orig)

                # Close-up fallback: kendaraan sangat dekat, YOLO gagal
                if (
                    tracker.last_plate is None
                    and ocr_future is None
                    and frame_counter % 10 == 0
                ):
                    frame_copy = img_orig.copy()
                    ocr_future = loop.run_in_executor(
                        _ocr_executor, read_plate_from_frame, frame_copy
                    )

                # Reset tracker jika sudah terlalu lama kosong
                if tracker.empty_streak >= PLATE_RESET_GRACE:
                    if tracker.last_plate is not None:
                        print(f"[WS] Tracker direset setelah {tracker.empty_streak} frame kosong")
                    tracker.reset_capture()
                    ocr_future = None

            dets.sort(key=lambda d: d["confidence"], reverse=True)
            await websocket.send_json({
                "detections":      dets,
                "stability_count": tracker.stable_count,
                "stable":          tracker.is_stable,
                "stability_max":   STABILITY_FRAMES,
            })

    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[ERROR] WebSocket error: {e}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
