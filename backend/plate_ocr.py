"""
plate_ocr.py — Plate Number Recognition Helper v2.0
Menggunakan EasyOCR untuk membaca plat nomor kendaraan Indonesia.
v2.0: Multi-pass preprocessing, scale-up untuk crop kecil, confidence lebih ketat.
"""

import re
import cv2
import numpy as np
from typing import Optional, List, Tuple

# Lazy-load EasyOCR agar startup cepat
_reader = None

def get_reader():
    """Inisialisasi EasyOCR Reader (lazy, hanya saat pertama dibutuhkan)."""
    global _reader
    if _reader is None:
        import easyocr
        print("[OCR] Initializing EasyOCR reader...")
        _reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        print("[OCR] EasyOCR ready.")
    return _reader


# ── Regex untuk plat nomor Indonesia ────────────────────────────────────────
# Format: [1-2 huruf] [1-4 angka] [1-3 huruf]
_PLATE_PATTERN = re.compile(
    r'([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{1,3})',
    re.IGNORECASE
)

def _normalize_plate(text: str) -> Optional[str]:
    """
    Normalisasi & validasi teks OCR sebagai plat nomor Indonesia.
    Koreksi karakter mirip (O↔0, I↔1, S↔5, dll).
    """
    text = text.upper().strip()

    # Koreksi karakter OCR yang sering tertukar
    _OCR_FIXES = {
        'O': '0', 'Q': '0',        # di bagian digit
        'I': '1', 'L': '1',
        'S': '5',
        'B': '8',
        'G': '6', 'D': '0',
    }

    text = re.sub(r'[^A-Z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    # Coba cari pola langsung (tanpa koreksi dulu)
    m = _PLATE_PATTERN.search(text)
    if m:
        prefix, digits, suffix = m.groups()
        return f"{prefix.upper()} {digits} {suffix.upper()}"

    # Coba gabungkan token
    parts = text.split()
    if len(parts) >= 2:
        combined = ''.join(parts)
        m2 = re.search(r'([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})', combined, re.IGNORECASE)
        if m2:
            prefix, digits, suffix = m2.groups()
            return f"{prefix.upper()} {digits} {suffix.upper()}"

    # Coba dengan koreksi karakter di area digit
    # Pisahkan teks menjadi bagian huruf-angka-huruf lalu koreksi
    corrected_parts = []
    for part in parts:
        # Koreksi angka: O→0, I→1, dll
        fixed = ''
        for i, ch in enumerate(part):
            if ch.isdigit():
                fixed += ch
            elif ch in _OCR_FIXES:
                # Coba ganti jika konteks terlihat perlu angka
                # (huruf di posisi tengah string lebih mungkin angka)
                fixed += _OCR_FIXES.get(ch, ch) if i > 0 and i < len(part) - 1 else ch
            else:
                fixed += ch
        corrected_parts.append(fixed)

    combined2 = ''.join(corrected_parts)
    m3 = re.search(r'([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})', combined2, re.IGNORECASE)
    if m3:
        prefix, digits, suffix = m3.groups()
        return f"{prefix.upper()} {digits} {suffix.upper()}"

    return None


# ── Preprocessing multi-pass ─────────────────────────────────────────────────────────────────────────────────
def _preprocess_plate(img: np.ndarray) -> List[np.ndarray]:
    """
    Hasilkan beberapa variasi preprocessing untuk diuji OCR.
    Multi-pass meningkatkan kemungkinan salah satu variasi berhasil dibaca.
    """
    h, w = img.shape[:2]

    # ── Step 1: Scale-up agresif untuk gambar kecil ────────────────────────────────────
    # Target: minimal 200px tinggi, ideal 280px
    target_h = 280
    if h < target_h:
        scale = target_h / h
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        h, w = new_h, new_w

    # Jika terlalu besar, kecilkan sedikit
    max_h = 400
    if h > max_h:
        scale = max_h / h
        img = cv2.resize(img, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── Pass 1: CLAHE + Otsu threshold ─────────────────────────────────────────────────────
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    gray_clahe = clahe.apply(gray)
    _, otsu = cv2.threshold(gray_clahe, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # ── Pass 2: Adaptive threshold (lebih baik untuk pencahayaan tidak merata) ─
    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 13, 6
    )

    return [
        cv2.cvtColor(otsu, cv2.COLOR_GRAY2BGR),
        cv2.cvtColor(adaptive, cv2.COLOR_GRAY2BGR),
    ]


def _run_ocr(img: np.ndarray) -> Optional[str]:
    reader = get_reader()
    passes = _preprocess_plate(img)

    best_plate = None
    best_conf  = 0.0

    for pass_img in passes:
        try:
            results = reader.readtext(
                pass_img,
                detail=1,
                allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
                paragraph=False,
                min_size=8,
                batch_size=1,
            )
            for (_, text, conf) in results:
                plate = _normalize_plate(text)
                if plate and conf > best_conf:
                    best_plate = plate
                    best_conf  = conf

            if best_plate is None and results:
                combined = ' '.join(r[1] for r in results if r[2] > 0.15)
                cand = _normalize_plate(combined)
                if cand:
                    best_plate = cand

        except Exception as e:
            print(f"[OCR] Pass error: {e}")

        # Early exit jika sudah yakin
        if best_plate and best_conf > 0.5:
            break

    return best_plate


def _crop_from_bbox(frame: np.ndarray, bbox: dict) -> Optional[np.ndarray]:
    x1 = max(0, bbox["x1"])
    y1 = max(0, bbox["y1"])
    x2 = min(frame.shape[1], bbox["x2"])
    y2 = min(frame.shape[0], bbox["y2"])
    h_box = y2 - y1
    w_box = x2 - x1
    if h_box < 20 or w_box < 20:
        return None
    plate_y1 = int(y1 + h_box * 0.52)
    plate_y2 = int(y1 + h_box * 0.90)
    plate_x1 = int(x1 + w_box * 0.08)
    plate_x2 = int(x2 - w_box * 0.08)
    crop = frame[plate_y1:plate_y2, plate_x1:plate_x2]
    return crop if crop.size > 0 else None


def _sharpness(img: np.ndarray) -> float:
    """Hitung ketajaman gambar menggunakan varians Laplacian. Semakin tinggi = semakin tajam."""
    if img is None or img.size == 0:
        return 0.0
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _closeup_regions(frame: np.ndarray) -> List[np.ndarray]:
    h, w = frame.shape[:2]
    regions = []
    r1 = frame[int(h * 0.30): int(h * 0.72), int(w * 0.15): int(w * 0.85)]
    if r1.size > 0: regions.append(r1)
    r2 = frame[int(h * 0.50): int(h * 0.85), int(w * 0.10): int(w * 0.90)]
    if r2.size > 0: regions.append(r2)
    regions.sort(key=_sharpness, reverse=True)
    return regions


def read_plate(frame: np.ndarray, bbox: dict) -> Optional[str]:
    try:
        fh, fw = frame.shape[:2]
        bbox_w = bbox["x2"] - bbox["x1"]
        bbox_h = bbox["y2"] - bbox["y1"]
        is_fullframe = (bbox_w >= fw * 0.85 and bbox_h >= fh * 0.85)

        if is_fullframe:
            print("[OCR] Close-up mode...")
            for region in _closeup_regions(frame):
                result = _run_ocr(region)
                if result:
                    return result
            return None
        else:
            crop = _crop_from_bbox(frame, bbox)
            if crop is None:
                return None
            sharp = _sharpness(crop)
            if sharp < 3.0:
                print(f"[OCR] Crop blur ({sharp:.1f}), skip")
                return None
            print(f"[OCR] Running OCR — sharpness: {sharp:.1f}")
            return _run_ocr(crop)

    except Exception as e:
        print(f"⚠️  OCR error: {e}")
        return None


def read_plate_from_frame(frame: np.ndarray) -> Optional[str]:
    """
    Shortcut untuk membaca plat dari full frame (close-up, tanpa bbox YOLO).
    """
    full_bbox = {"x1": 0, "y1": 0, "x2": frame.shape[1], "y2": frame.shape[0]}
    return read_plate(frame, full_bbox)
