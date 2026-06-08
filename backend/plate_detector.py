"""
plate_detector.py — Deteksi Area Plat Nomor Presisi (Stage 2 / eTilang-style)

Pipeline dua tahap:
  Stage 1: YOLO kendaraan (best.pt)     → bounding box kendaraan
  Stage 2: YOLO plat (HuggingFace)      → bounding box plat presisi
  Stage 3: EasyOCR                       → baca karakter plat

Modul ini menangani Stage 2.
Jika model plat gagal mendeteksi, otomatis fallback ke crop rasio klasik.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Dict

# ── Paths ─────────────────────────────────────────────────────────────────────
_BASE_DIR         = Path(__file__).parent
_MODEL_CACHE_PATH = _BASE_DIR / "models" / "plate_detector.pt"

# Model dari HuggingFace Hub — dilatih pada 26.000+ gambar plat berbagai negara
# Mendukung plat Asia Tenggara, termasuk format Indonesia (B 1234 ABC)
_HF_MODEL_ID = "keremberke/yolov8m-license-plate-detection"

# ── Threshold ────────────────────────────────────────────────────────────────
PLATE_CONF_THRESH = 0.35   # confidence minimum YOLO untuk dianggap plat
PLATE_IOU_THRESH  = 0.45
CROP_MARGIN_PX    = 8      # padding piksel di sekitar crop plat agar karakter tidak terpotong

_plate_model = None


# ── Model Loader ─────────────────────────────────────────────────────────────
def get_plate_model():
    """
    Lazy-load model deteksi plat.
    Coba load dari cache lokal → jika tidak ada, download dari HuggingFace Hub.
    Download hanya terjadi sekali, kemudian di-cache oleh ultralytics/HuggingFace.
    """
    global _plate_model
    if _plate_model is not None:
        return _plate_model

    from ultralytics import YOLO

    # 1) Coba load dari cache lokal terlebih dahulu (offline-friendly)
    if _MODEL_CACHE_PATH.exists():
        print(f"[PLATE-DET] Loading model plat dari cache lokal...")
        try:
            _plate_model = YOLO(str(_MODEL_CACHE_PATH))
            print("[PLATE-DET] ✓ Model plat siap (dari cache lokal).")
            return _plate_model
        except Exception as e:
            print(f"[PLATE-DET] Cache load gagal ({e}), mencoba download ulang...")

    # 2) Download dari HuggingFace Hub
    print(f"[PLATE-DET] Mengunduh model plat dari HuggingFace ({_HF_MODEL_ID})...")
    print("[PLATE-DET] (Proses ini hanya terjadi sekali, model akan di-cache otomatis)")
    try:
        _plate_model = YOLO(_HF_MODEL_ID)
        print("[PLATE-DET] ✓ Model plat berhasil diunduh dan siap digunakan.")
        return _plate_model
    except Exception as e:
        print(f"[PLATE-DET] ⚠️  Gagal load model plat: {e}")
        print("[PLATE-DET] Sistem akan menggunakan fallback metode crop rasio.")
        return None


# ── Stage 2: Deteksi Plat di dalam Crop Kendaraan ────────────────────────────
def detect_plate_in_crop(vehicle_crop: np.ndarray) -> Optional[Dict]:
    """
    Deteksi area plat nomor di dalam gambar crop kendaraan menggunakan YOLO.

    Args:
        vehicle_crop: Gambar area kendaraan yang sudah di-crop (BGR).

    Returns:
        dict {"x1", "y1", "x2", "y2", "conf"} dalam koordinat vehicle_crop,
        atau None jika tidak ditemukan.
    """
    if vehicle_crop is None or vehicle_crop.size == 0:
        return None

    model = get_plate_model()
    if model is None:
        return None

    h, w = vehicle_crop.shape[:2]

    # Scale up jika crop kecil agar YOLO bisa mendeteksi plat dengan baik
    run_img    = vehicle_crop
    scale_back = 1.0
    if w < 320:
        scale      = 320.0 / w
        run_img    = cv2.resize(vehicle_crop, (int(w * scale), int(h * scale)),
                                interpolation=cv2.INTER_LINEAR)
        scale_back = 1.0 / scale

    try:
        results = model.predict(
            run_img,
            conf=PLATE_CONF_THRESH,
            iou=PLATE_IOU_THRESH,
            verbose=False,
            augment=False,
        )[0]

        if len(results.boxes) == 0:
            return None

        # Ambil plat dengan confidence tertinggi
        best = max(results.boxes, key=lambda b: float(b.conf))
        x1, y1, x2, y2 = map(int, best.xyxy[0].tolist())
        conf = float(best.conf)

        # Kembalikan ke koordinat vehicle_crop asli jika di-scale
        if scale_back != 1.0:
            x1 = int(x1 * scale_back)
            y1 = int(y1 * scale_back)
            x2 = int(x2 * scale_back)
            y2 = int(y2 * scale_back)

        # Validasi dimensi — plat nomor selalu lebih lebar dari tinggi
        pw, ph = x2 - x1, y2 - y1
        if pw < 20 or ph < 6:
            return None
        if pw < ph * 1.2:   # aspek rasio plat minimal ~1.2:1
            return None

        return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf}

    except Exception as e:
        print(f"[PLATE-DET] Error saat deteksi: {e}")
        return None


# ── Pipeline Utama ────────────────────────────────────────────────────────────
def extract_plate_image(frame: np.ndarray, vehicle_bbox: Dict) -> Optional[np.ndarray]:
    """
    Pipeline lengkap Stage 2 (eTilang-style):
      frame + bounding box kendaraan
      → crop area kendaraan
      → YOLO plate detection → crop plat presisi
      → siap untuk OCR

    Args:
        frame:        Full frame BGR dari kamera atau gambar upload.
        vehicle_bbox: Bounding box kendaraan dari YOLO Stage 1,
                      format: {"x1": int, "y1": int, "x2": int, "y2": int}.

    Returns:
        Crop plat nomor (BGR, ukuran tight), atau None jika pipeline gagal.
    """
    fh, fw = frame.shape[:2]

    # Clamp bbox agar tidak keluar dari frame
    x1 = max(0, vehicle_bbox["x1"])
    y1 = max(0, vehicle_bbox["y1"])
    x2 = min(fw, vehicle_bbox["x2"])
    y2 = min(fh, vehicle_bbox["y2"])

    vw, vh = x2 - x1, y2 - y1
    if vw < 40 or vh < 40:
        return None

    vehicle_crop = frame[y1:y2, x1:x2].copy()

    # ── Stage 2: YOLO plate detection ────────────────────────────────────────
    plate_bbox = detect_plate_in_crop(vehicle_crop)

    if plate_bbox is not None:
        # Tambahkan margin agar karakter di tepi plat tidak terpotong
        px1 = max(0, plate_bbox["x1"] - CROP_MARGIN_PX)
        py1 = max(0, plate_bbox["y1"] - CROP_MARGIN_PX)
        px2 = min(vehicle_crop.shape[1], plate_bbox["x2"] + CROP_MARGIN_PX)
        py2 = min(vehicle_crop.shape[0], plate_bbox["y2"] + CROP_MARGIN_PX)
        plate_crop = vehicle_crop[py1:py2, px1:px2]

        if plate_crop.size > 0:
            print(
                f"[PLATE-DET] ✓ Plat terdeteksi "
                f"(conf={plate_bbox['conf']:.2f}, "
                f"ukuran={plate_crop.shape[1]}×{plate_crop.shape[0]}px)"
            )
            return plate_crop

    # ── Fallback: crop rasio klasik ──────────────────────────────────────────
    print("[PLATE-DET] Plat tidak terdeteksi YOLO → fallback ke crop rasio")
    return _ratio_crop(vehicle_crop)


def extract_plate_from_fullframe(frame: np.ndarray) -> Optional[np.ndarray]:
    """
    Deteksi plat langsung dari full frame (untuk kendaraan close-up / tanpa bbox YOLO).
    YOLO plate akan mencari plat di seluruh frame.
    """
    full_bbox = {"x1": 0, "y1": 0, "x2": frame.shape[1], "y2": frame.shape[0]}
    return extract_plate_image(frame, full_bbox)


# ── Fallback ──────────────────────────────────────────────────────────────────
def _ratio_crop(vehicle_crop: np.ndarray) -> Optional[np.ndarray]:
    """
    Fallback crop berdasarkan rasio posisi plat yang umum untuk kendaraan Indonesia.
    Plat biasanya berada di ~52%-90% tinggi bawah, dan ~8%-92% lebar tengah.
    """
    h, w = vehicle_crop.shape[:2]
    crop = vehicle_crop[
        int(h * 0.52):int(h * 0.90),
        int(w * 0.08):int(w * 0.92)
    ]
    return crop if crop.size > 0 else None
