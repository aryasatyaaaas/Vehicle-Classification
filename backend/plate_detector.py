"""
plate_detector.py — Deteksi Area Plat Nomor Presisi v2.0 (eTilang-style Enhanced)

Pipeline dua tahap:
  Stage 1: YOLO kendaraan (best.pt)     → bounding box kendaraan
  Stage 2: YOLO plat (HuggingFace)      → bounding box plat presisi
  Stage 2b: Contour fallback            → deteksi morfologi jika YOLO gagal
  Stage 3: Perspective correction       → deskew plat sebelum OCR
  Stage 4: EasyOCR                      → baca karakter plat

Peningkatan v2.0:
  - Perspective correction (deskew) setelah crop plat
  - Contour-based fallback detection menggunakan morfologi
  - Multi-scale detection untuk plat kecil
  - Adaptive confidence scoring
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Dict, List, Tuple

# ── Paths ─────────────────────────────────────────────────────────────────────
_BASE_DIR         = Path(__file__).parent
_MODEL_CACHE_PATH = _BASE_DIR / "models" / "plate_detector.pt"

# Model dari HuggingFace Hub — dilatih pada 26.000+ gambar plat berbagai negara
# Mendukung plat Asia Tenggara, termasuk format Indonesia (B 1234 ABC)
_HF_MODEL_ID = "keremberke/yolov8m-license-plate-detection"

# ── Threshold ────────────────────────────────────────────────────────────────
PLATE_CONF_THRESH  = 0.30   # diturunkan sedikit untuk menangkap plat yang sulit
PLATE_IOU_THRESH   = 0.45
CROP_MARGIN_PX     = 10     # padding piksel di sekitar crop plat agar karakter tidak terpotong
MAX_DESKEW_ANGLE   = 15.0   # sudut maksimum koreksi kemiringan (derajat)

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
        print("[PLATE-DET] Sistem akan menggunakan fallback metode contour/rasio.")
        return None


# ── Perspective Correction (Deskew) ──────────────────────────────────────────
def _deskew_plate(plate_img: np.ndarray) -> np.ndarray:
    """
    Koreksi kemiringan plat menggunakan MinAreaRect pada tepi gambar.
    Plat yang miring akan diluruskan sebelum OCR untuk akurasi lebih tinggi.

    Args:
        plate_img: Crop plat (BGR)

    Returns:
        Crop plat yang sudah diluruskan (BGR)
    """
    if plate_img is None or plate_img.size == 0:
        return plate_img

    h, w = plate_img.shape[:2]
    if h < 10 or w < 10:
        return plate_img

    try:
        gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)

        # Enhance contrast dulu sebelum edge detection
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
        gray  = clahe.apply(gray)

        # Edge detection untuk menemukan kontur plat
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges   = cv2.Canny(blurred, 30, 120)

        # Dilate untuk menghubungkan tepi yang terputus
        kernel   = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 1))
        dilated  = cv2.dilate(edges, kernel, iterations=2)

        # Cari kontur
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return plate_img

        # Ambil kontur terbesar (kemungkinan besar adalah body plat)
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < (w * h * 0.05):
            return plate_img  # kontur terlalu kecil, tidak reliable

        # Hitung sudut kemiringan dari MinAreaRect
        rect  = cv2.minAreaRect(largest)
        angle = rect[2]  # sudut dalam derajat [-90, 0)

        # Konversi ke sudut yang benar
        if angle < -45:
            angle += 90
        elif angle > 45:
            angle -= 90

        # Hanya koreksi jika sudut cukup signifikan (> 1°) dan tidak terlalu ekstrem
        if abs(angle) < 1.0 or abs(angle) > MAX_DESKEW_ANGLE:
            return plate_img

        print(f"[PLATE-DET] Deskewing plat: {angle:.1f}°")

        # Rotasi menggunakan affine transform
        center = (w // 2, h // 2)
        M      = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            plate_img, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return rotated

    except Exception as e:
        print(f"[PLATE-DET] Deskew error: {e}")
        return plate_img


# ── Contour-based Plate Detection (Fallback Stage 2b) ────────────────────────
def _detect_plate_by_contour(vehicle_crop: np.ndarray) -> Optional[Dict]:
    """
    Deteksi area plat menggunakan morfologi dan analisis kontur.
    Digunakan sebagai fallback jika YOLO plate gagal mendeteksi.

    Mengeksploitasi karakteristik visual plat Indonesia:
    - Warna latar: Putih (motor) atau Hitam (kendaraan khusus)
    - Teks berwarna hitam/putih kontras tinggi
    - Aspek rasio: ~2.5:1 hingga 6:1 (lebar : tinggi)
    - Posisi: Biasanya di area bawah kendaraan (y > 40%)

    Args:
        vehicle_crop: Crop area kendaraan (BGR)

    Returns:
        dict {x1, y1, x2, y2, conf} atau None
    """
    if vehicle_crop is None or vehicle_crop.size == 0:
        return None

    h, w = vehicle_crop.shape[:2]

    # Scale up jika terlalu kecil
    work_img  = vehicle_crop
    scale_inv = 1.0
    if w < 400:
        scale     = 400.0 / w
        scale_inv = 1.0 / scale
        work_img  = cv2.resize(vehicle_crop, (int(w * scale), int(h * scale)),
                               interpolation=cv2.INTER_LINEAR)

    wh, ww = work_img.shape[:2]

    try:
        gray  = cv2.cvtColor(work_img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(4, 4))
        gray  = clahe.apply(gray)

        # ── Metode 1: Morphological gradient (menonjolkan tepi karakter) ──────
        kernel_morph = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 3))
        morph_grad   = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel_morph)

        # Threshold Otsu pada gradient
        _, thresh1 = cv2.threshold(morph_grad, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # ── Metode 2: Adaptive threshold ─────────────────────────────────────
        thresh2 = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 5
        )

        # Gabungkan dua metode
        combined = cv2.bitwise_or(thresh1, thresh2)

        # Closing untuk menyambung karakter di dalam plat
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 5))
        closed       = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel_close)

        # Erode untuk menghilangkan noise kecil
        kernel_erode = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        cleaned      = cv2.erode(closed, kernel_erode, iterations=1)

        # Cari kontur
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates: List[Tuple[float, Dict]] = []

        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)

            # Filter dimensi minimal
            if cw < 60 or ch < 12:
                continue

            # Filter aspek rasio plat (2:1 hingga 7:1)
            aspect = cw / ch
            if aspect < 1.5 or aspect > 8.0:
                continue

            # Filter posisi — plat biasanya di bawah 30% frame (abaikan area atas)
            if (y + ch / 2) < wh * 0.25:
                continue

            # Filter ukuran maksimal — plat tidak mungkin selebar seluruh frame
            if cw > ww * 0.95:
                continue

            # Hitung skor kandidat berdasarkan aspek rasio ideal dan posisi
            ideal_aspect = 4.0  # plat Indonesia umumnya ~4:1
            aspect_score = 1.0 - min(abs(aspect - ideal_aspect) / ideal_aspect, 1.0)

            # Skor posisi vertikal (plat lebih mungkin di bawah)
            center_y     = (y + ch / 2) / wh
            pos_score    = min(center_y / 0.7, 1.0) if center_y < 0.7 else (1.0 - (center_y - 0.7) / 0.3)

            # Skor luas relatif
            rel_area    = (cw * ch) / (ww * wh)
            area_score  = min(rel_area / 0.05, 1.0) if rel_area < 0.05 else max(0.0, 1.0 - (rel_area - 0.05) / 0.10)

            total_score = aspect_score * 0.5 + pos_score * 0.3 + area_score * 0.2

            # Scale kembali ke koordinat vehicle_crop asli
            rx1 = int(x * scale_inv)
            ry1 = int(y * scale_inv)
            rx2 = int((x + cw) * scale_inv)
            ry2 = int((y + ch) * scale_inv)

            candidates.append((total_score, {"x1": rx1, "y1": ry1, "x2": rx2, "y2": ry2, "conf": total_score * 0.6}))

        if not candidates:
            return None

        # Ambil kandidat dengan skor tertinggi
        candidates.sort(key=lambda c: c[0], reverse=True)
        best_score, best_bbox = candidates[0]

        # Hanya kembalikan jika skor cukup yakin
        if best_score < 0.25:
            return None

        print(f"[PLATE-DET] Contour fallback: kandidat plat ditemukan (skor={best_score:.2f})")
        return best_bbox

    except Exception as e:
        print(f"[PLATE-DET] Contour detection error: {e}")
        return None


# ── Stage 2: Deteksi Plat di dalam Crop Kendaraan ────────────────────────────
def detect_plate_in_crop(vehicle_crop: np.ndarray) -> Optional[Dict]:
    """
    Deteksi area plat nomor di dalam gambar crop kendaraan menggunakan YOLO.
    Fallback ke contour-based detection jika YOLO gagal.

    Args:
        vehicle_crop: Gambar area kendaraan yang sudah di-crop (BGR).

    Returns:
        dict {x1, y1, x2, y2, conf} dalam koordinat vehicle_crop, atau None.
    """
    if vehicle_crop is None or vehicle_crop.size == 0:
        return None

    model = get_plate_model()

    if model is not None:
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

            if len(results.boxes) > 0:
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
                if pw >= 20 and ph >= 6 and pw >= ph * 1.2:
                    print(f"[PLATE-DET] YOLO plate: conf={conf:.2f}, ukuran={pw}×{ph}px")
                    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": conf}

        except Exception as e:
            print(f"[PLATE-DET] YOLO error: {e}")

    # ── Fallback ke contour-based detection ──────────────────────────────────
    print("[PLATE-DET] YOLO plate gagal / tidak tersedia → mencoba contour detection...")
    return _detect_plate_by_contour(vehicle_crop)


# ── Pipeline Utama ────────────────────────────────────────────────────────────
def extract_plate_image(frame: np.ndarray, vehicle_bbox: Dict) -> Optional[np.ndarray]:
    """
    Pipeline lengkap Stage 2 (eTilang-style Enhanced):
      frame + bounding box kendaraan
      → crop area kendaraan
      → YOLO plate detection (+ contour fallback)
      → crop plat presisi
      → perspective correction (deskew)
      → siap untuk OCR

    Args:
        frame:        Full frame BGR dari kamera atau gambar upload.
        vehicle_bbox: Bounding box kendaraan dari YOLO Stage 1,
                      format: {x1, y1, x2, y2}.

    Returns:
        Crop plat nomor yang sudah diluruskan (BGR), atau None jika pipeline gagal.
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

    # ── Stage 2: YOLO plate detection (+ contour fallback) ───────────────────
    plate_bbox = detect_plate_in_crop(vehicle_crop)

    if plate_bbox is not None:
        # Tambahkan margin agar karakter di tepi plat tidak terpotong
        px1 = max(0, plate_bbox["x1"] - CROP_MARGIN_PX)
        py1 = max(0, plate_bbox["y1"] - CROP_MARGIN_PX)
        px2 = min(vehicle_crop.shape[1], plate_bbox["x2"] + CROP_MARGIN_PX)
        py2 = min(vehicle_crop.shape[0], plate_bbox["y2"] + CROP_MARGIN_PX)
        plate_crop = vehicle_crop[py1:py2, px1:px2]

        if plate_crop.size > 0:
            # ── Stage 3: Perspective correction (deskew) ─────────────────────
            plate_crop = _deskew_plate(plate_crop)

            print(
                f"[PLATE-DET] ✓ Plat terdeteksi "
                f"(conf={plate_bbox['conf']:.2f}, "
                f"ukuran={plate_crop.shape[1]}×{plate_crop.shape[0]}px)"
            )
            return plate_crop

    # ── Fallback: crop rasio klasik ──────────────────────────────────────────
    print("[PLATE-DET] Semua deteksi gagal → fallback ke crop rasio")
    fallback = _ratio_crop(vehicle_crop)
    if fallback is not None and fallback.size > 0:
        return _deskew_plate(fallback)  # Deskew juga pada fallback
    return fallback


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
