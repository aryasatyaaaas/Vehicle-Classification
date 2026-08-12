"""
plate_ocr.py — Plate Number Recognition Helper v4.0
Menggunakan EasyOCR untuk membaca plat nomor kendaraan Indonesia.

v4.0 Peningkatan vs v3.0:
  - Koreksi karakter KONTEKS-AWARE per segmen (prefix/digit/suffix)
    → 'B' di prefix TIDAK diubah ke '8' (B = kode wilayah Jakarta)
  - Preprocessing lebih kuat:
    → Deskew sudah dilakukan di plate_detector.py
    → Bilateral filter untuk edge preservation sebelum threshold
    → Noise removal: median blur + morphological cleaning
    → Color inversion pass (plat gelap pada latar terang)
    → Sharpening adaptif
  - Multi-line plate: gabungkan baris atas & bawah untuk plat 2 baris
  - Integrasi plate_postprocess untuk validasi & koreksi kode wilayah
  - Voting ensemble: agregat semua pass OCR dengan weighted confidence
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


# ── Import plate_postprocess untuk normalisasi cerdas ────────────────────────
try:
    from plate_postprocess import normalize_plate, get_area_name
    _POSTPROCESS_AVAILABLE = True
except ImportError:
    _POSTPROCESS_AVAILABLE = False
    print("[OCR] Warning: plate_postprocess tidak tersedia, pakai fallback regex")


# ── Regex Fallback (jika plate_postprocess tidak tersedia) ───────────────────
_PLATE_PATTERN = re.compile(
    r'([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{1,3})',
    re.IGNORECASE
)


def _normalize_plate_fallback(text: str) -> Optional[str]:
    """Normalisasi sederhana (fallback jika plate_postprocess tidak tersedia)."""
    text = text.upper().strip()
    text = re.sub(r'[^A-Z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    m = _PLATE_PATTERN.search(text)
    if m:
        prefix, digits, suffix = m.groups()
        return f"{prefix.upper()} {digits} {suffix.upper()}"

    parts = text.split()
    if len(parts) >= 2:
        combined = ''.join(parts)
        m2 = re.search(r'([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})', combined, re.IGNORECASE)
        if m2:
            p, d, s = m2.groups()
            return f"{p.upper()} {d} {s.upper()}"

    return None


def _normalize_plate(text: str) -> Optional[str]:
    """
    Normalisasi & validasi teks OCR sebagai plat nomor Indonesia.
    Gunakan plate_postprocess jika tersedia (konteks-aware), fallback ke regex.
    """
    if _POSTPROCESS_AVAILABLE:
        return normalize_plate(text)
    return _normalize_plate_fallback(text)


# ── Preprocessing Multi-Pass ──────────────────────────────────────────────────
def _sharpen(img: np.ndarray) -> np.ndarray:
    """Sharpening ringan untuk memperjelas tepi karakter."""
    kernel = np.array([[0, -0.5, 0], [-0.5, 3.0, -0.5], [0, -0.5, 0]], dtype=np.float32)
    return np.clip(cv2.filter2D(img, -1, kernel), 0, 255).astype(np.uint8)


def _remove_noise(gray: np.ndarray) -> np.ndarray:
    """Hapus noise kecil menggunakan median blur + morphological opening."""
    median   = cv2.medianBlur(gray, 3)
    kernel   = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    opened   = cv2.morphologyEx(median, cv2.MORPH_OPEN, kernel)
    return opened


def _preprocess_plate(img: np.ndarray) -> List[np.ndarray]:
    """
    Hasilkan beberapa variasi preprocessing untuk multi-pass OCR.
    Input idealnya sudah berupa crop plat yang presisi (dari plate_detector)
    dan sudah di-deskew.

    Passes yang dihasilkan:
      1. CLAHE + Otsu threshold (standar)
      2. Bilateral filter + adaptive threshold (pencahayaan tidak merata)
      3. Grayscale + sharpening (EasyOCR langsung pada grayscale)
      4. Color inverted + Otsu (plat hitam dengan teks putih)
      5. Morphological cleaned + threshold (untuk plat kotor/buram)
    """
    h, w = img.shape[:2]

    # ── Scale-up agresif untuk plat kecil ────────────────────────────────────
    target_h = 300
    if h < target_h:
        scale  = target_h / h
        new_w  = max(1, int(w * scale))
        new_h  = max(1, int(h * scale))
        img    = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        h, w   = new_h, new_w

    # Batasi ukuran maksimum
    max_h = 480
    if h > max_h:
        scale = max_h / h
        img   = cv2.resize(img, (max(1, int(w * scale)), max(1, int(h * scale))),
                           interpolation=cv2.INTER_AREA)
        h, w  = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── Pass 1: CLAHE + Otsu threshold ───────────────────────────────────────
    clahe      = cv2.createCLAHE(clipLimit=3.5, tileGridSize=(4, 4))
    gray_clahe = clahe.apply(gray)
    gray_clean = _remove_noise(gray_clahe)
    _, otsu    = cv2.threshold(gray_clean, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # ── Pass 2: Bilateral filter + adaptive threshold ─────────────────────────
    # Bilateral preserves edges sambil menghaluskan area seragam
    bilateral   = cv2.bilateralFilter(gray, 9, 75, 75)
    clahe2      = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    bilateral_e = clahe2.apply(bilateral)
    adaptive    = cv2.adaptiveThreshold(
        bilateral_e, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 7
    )

    # ── Pass 3: Grayscale + sharpening (input natural untuk EasyOCR) ────────
    sharpened  = _sharpen(img)
    gray_sharp = cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)
    clahe3     = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(4, 4))
    gray_sharp = clahe3.apply(gray_sharp)
    gray_3ch   = cv2.cvtColor(gray_sharp, cv2.COLOR_GRAY2BGR)

    # ── Pass 4: Color inversion (plat gelap / teks putih) ────────────────────
    inverted       = cv2.bitwise_not(gray_clean)
    _, otsu_inv    = cv2.threshold(inverted, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # ── Pass 5: Morphological cleaning (untuk plat kotor) ────────────────────
    # Hapus garis horizontal/vertikal noise
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 3))
    morph_c  = cv2.morphologyEx(gray_clean, cv2.MORPH_CLOSE, kernel_h)
    _, morph_thresh = cv2.threshold(morph_c, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    def to_bgr(g):
        return cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)

    return [
        to_bgr(otsu),           # Pass 1
        to_bgr(adaptive),       # Pass 2
        gray_3ch,               # Pass 3
        to_bgr(otsu_inv),       # Pass 4 (inverted)
        to_bgr(morph_thresh),   # Pass 5
    ]


# ── OCR Runner ────────────────────────────────────────────────────────────────
def _run_ocr_on_image(img: np.ndarray) -> List[Tuple[str, float]]:
    """
    Jalankan EasyOCR pada satu gambar.
    Returns: list of (text, confidence) tuples.
    """
    reader = get_reader()
    try:
        results = reader.readtext(
            img,
            detail=1,
            allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
            paragraph=False,
            min_size=8,
            batch_size=1,
        )
        return [(text, conf) for (_, text, conf) in results]
    except Exception as e:
        print(f"[OCR] readtext error: {e}")
        return []


def _run_ocr(img: np.ndarray) -> Optional[str]:
    """
    Multi-pass OCR dengan voting ensemble.
    Semua pass dijalankan, hasil terbaik dipilih berdasarkan:
      - Confidence EasyOCR tertinggi
      - Pola plat Indonesia valid

    Returns:
        String plat nomor yang sudah dinormalisasi, atau None.
    """
    passes = _preprocess_plate(img)

    # Dict: plate_string → (total_conf, count)
    vote_map: dict = {}
    best_plate: Optional[str] = None
    best_conf  = 0.0

    for pass_idx, pass_img in enumerate(passes):
        raw_results = _run_ocr_on_image(pass_img)

        if not raw_results:
            continue

        # Coba setiap hasil OCR secara individual
        for text, conf in raw_results:
            if conf < 0.10:
                continue
            plate = _normalize_plate(text)
            if plate:
                existing_conf, count = vote_map.get(plate, (0.0, 0))
                vote_map[plate] = (existing_conf + conf, count + 1)
                if conf > best_conf:
                    best_conf  = conf
                    best_plate = plate

        # Coba gabungkan semua teks dalam satu pass (multi-line plate)
        if len(raw_results) > 1:
            combined_text = ' '.join(t for t, c in raw_results if c > 0.10)
            plate = _normalize_plate(combined_text)
            if plate:
                avg_conf = sum(c for _, c in raw_results) / len(raw_results)
                existing_conf, count = vote_map.get(plate, (0.0, 0))
                vote_map[plate] = (existing_conf + avg_conf * 0.8, count + 1)

        # Early exit jika sudah sangat yakin
        if best_plate and best_conf > 0.75:
            break

    if not vote_map:
        return best_plate  # balik hasil terbaik meski tanpa konfirmasi

    # Pilih berdasarkan weighted score: conf_total * count (voting + confidence)
    best_voted = max(vote_map.items(), key=lambda kv: kv[1][0] * (1 + kv[1][1] * 0.5))
    voted_plate, (voted_conf, voted_count) = best_voted

    if voted_count >= 2:
        # Dikonfirmasi oleh beberapa pass — lebih dipercaya
        print(f"[OCR] Ensemble voted: '{voted_plate}' (conf={voted_conf:.2f}, passes={voted_count})")
        return voted_plate

    # Fallback ke best individual
    return best_plate


# ── Helpers ───────────────────────────────────────────────────────────────────
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


# ── Public API ────────────────────────────────────────────────────────────────
def read_plate(frame: np.ndarray, bbox: dict) -> Optional[str]:
    """
    Baca plat nomor dari frame menggunakan pipeline eTilang-style v4.0:
      1. plate_detector.extract_plate_image() → crop plat presisi via YOLO / contour
      2. Perspective correction (deskew) — sudah ada di plate_detector
      3. Multi-pass preprocessing (5 variasi)
      4. EasyOCR dengan voting ensemble
      5. plate_postprocess: validasi & koreksi kode wilayah

    Fallback otomatis ke crop rasio jika plate detector gagal.

    Args:
        frame: Full frame BGR.
        bbox:  Bounding box kendaraan {x1, y1, x2, y2}.

    Returns:
        String plat normalisasi ("B 1234 ABC") atau None.
    """
    try:
        fh, fw = frame.shape[:2]
        bbox_w = bbox["x2"] - bbox["x1"]
        bbox_h = bbox["y2"] - bbox["y1"]
        is_fullframe = (bbox_w >= fw * 0.85 and bbox_h >= fh * 0.85)

        if is_fullframe:
            # Mode close-up: kendaraan sangat dekat, cari plat di seluruh frame
            print("[OCR] Close-up mode — deteksi plat dari full frame...")
            from plate_detector import extract_plate_from_fullframe
            plate_crop = extract_plate_from_fullframe(frame)
            if plate_crop is not None:
                sharp = _sharpness(plate_crop)
                if sharp >= 1.5:
                    return _run_ocr(plate_crop)
            # Fallback ke region scan lama jika plate_detector gagal
            for region in _closeup_regions(frame):
                result = _run_ocr(region)
                if result:
                    return result
            return None
        else:
            # Mode normal: gunakan plate_detector untuk crop plat presisi
            from plate_detector import extract_plate_image
            plate_crop = extract_plate_image(frame, bbox)
            if plate_crop is None:
                return None
            sharp = _sharpness(plate_crop)
            if sharp < 1.5:
                print(f"[OCR] Plate crop terlalu blur ({sharp:.1f}), skip")
                return None
            print(f"[OCR] Running OCR pada crop plat — sharpness: {sharp:.1f}")
            return _run_ocr(plate_crop)

    except Exception as e:
        print(f"⚠️  OCR error: {e}")
        import traceback
        traceback.print_exc()
        return None


def read_plate_from_frame(frame: np.ndarray) -> Optional[str]:
    """
    Shortcut untuk membaca plat dari full frame (close-up, tanpa bbox YOLO).
    Menggunakan plate_detector untuk mencari plat di seluruh frame.
    """
    full_bbox = {"x1": 0, "y1": 0, "x2": frame.shape[1], "y2": frame.shape[0]}
    return read_plate(frame, full_bbox)
