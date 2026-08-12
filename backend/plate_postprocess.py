"""
plate_postprocess.py — Validasi & Koreksi Cerdas Plat Nomor Indonesia v1.0

Pipeline post-processing setelah OCR:
  1. Koreksi karakter konteks-aware (prefix daerah ≠ digit tengah)
  2. Validasi kode wilayah SAMSAT Indonesia
  3. Fuzzy matching ke kode wilayah terdekat
  4. Format normalisasi final: "XX 1234 ABC"

Referensi format plat Indonesia (Permenhub):
  [Kode Wilayah 1-2 huruf] [Nomor 1-4 digit] [Suffix 1-3 huruf]
  Contoh: B 1234 ABC (Jakarta), D 5678 XY (Bandung)
"""

import re
from typing import Optional, Tuple

# ── Database Kode Wilayah SAMSAT Indonesia ────────────────────────────────────
# Sumber: Korlantas Polri — semua kode BH resmi yang valid
VALID_AREA_CODES = {
    # Jawa & Bali
    "A":  "Banten (Serang)",
    "B":  "DKI Jakarta & sekitarnya",
    "D":  "Bandung Kota & Cimahi",
    "E":  "Cirebon",
    "F":  "Bogor",
    "G":  "Pekalongan",
    "H":  "Semarang",
    "K":  "Pati",
    "L":  "Surabaya",
    "M":  "Madura",
    "N":  "Malang",
    "P":  "Besuki (Jember)",
    "R":  "Banyumas (Purwokerto)",
    "S":  "Bojonegoro",
    "T":  "Karawang",
    "W":  "Gresik & Sidoarjo",
    "Z":  "Garut & Sumedang",
    "AB": "D.I. Yogyakarta",
    "AD": "Surakarta (Solo)",
    "AE": "Madiun",
    "AG": "Kediri",
    "BA": "Sumatera Barat (Padang)",
    "BB": "Sumatera Utara (Tapanuli)",
    "BD": "Bengkulu",
    "BE": "Lampung",
    "BG": "Sumatera Selatan (Palembang)",
    "BH": "Jambi",
    "BK": "Sumatera Utara (Medan)",
    "BL": "Aceh",
    "BM": "Riau (Pekanbaru)",
    "BN": "Kepulauan Bangka Belitung",
    "BP": "Kepulauan Riau",
    "DA": "Kalimantan Selatan (Banjarmasin)",
    "DB": "Sulawesi Utara (Manado)",
    "DC": "Sulawesi Barat (Mamuju)",
    "DD": "Sulawesi Selatan (Makassar)",
    "DE": "Maluku (Ambon)",
    "DG": "Sulawesi Selatan (Gowa)",
    "DH": "Nusa Tenggara Timur (Kupang)",
    "DK": "Bali",
    "DL": "Sulawesi Utara (Kepulauan Sangihe)",
    "DM": "Gorontalo",
    "DN": "Sulawesi Tengah (Palu)",
    "DR": "Nusa Tenggara Barat (Mataram)",
    "DS": "Papua (Jayapura)",
    "DT": "Sulawesi Tenggara (Kendari)",
    "DW": "Sulawesi Selatan (Takalar)",
    "EA": "Nusa Tenggara Barat (Sumbawa)",
    "EB": "Nusa Tenggara Timur (Ende/Flores)",
    "ED": "Nusa Tenggara Timur (Sumba)",
    "KA": "Kalimantan Barat (Pontianak)",
    "KB": "Kalimantan Barat (Sambas)",
    "KH": "Kalimantan Tengah (Palangka Raya)",
    "KT": "Kalimantan Timur (Samarinda)",
    "KU": "Kalimantan Utara (Tanjung Selor)",
    "PA": "Papua (Sorong)",
    "PB": "Papua Barat (Manokwari)",
    "SA": "Maluku Utara (Ternate)",
    "SG": "Sulawesi Tengah (Banggai)",
}

# Semua valid area codes sebagai set untuk lookup cepat
_VALID_CODES_SET = set(VALID_AREA_CODES.keys())

# Karakter yang sering tertukar di OCR — untuk koreksi digit (posisi TENGAH)
_DIGIT_OCR_FIXES = {
    'O': '0', 'Q': '0', 'D': '0',
    'I': '1', 'L': '1',
    'Z': '2',
    'S': '5',
    'G': '6',
    'T': '7',
    'B': '8',
}

# Karakter yang sering tertukar di OCR — untuk koreksi huruf (posisi PREFIX/SUFFIX)
_LETTER_OCR_FIXES = {
    '0': 'O', '8': 'B',
    '1': 'I', '6': 'G',
    '5': 'S', '7': 'T',
}

# ── Format Regex Plat Indonesia ───────────────────────────────────────────────
# Format ketat: 1-2 huruf prefix + 1-4 digit + 1-3 huruf suffix
_STRICT_PLATE = re.compile(
    r'^([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{1,3})$',
    re.IGNORECASE
)

# Format longgar (untuk parsing OCR raw)
_LOOSE_PLATE = re.compile(
    r'([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{1,3})',
    re.IGNORECASE
)


# ── Koreksi Karakter Konteks-Aware ───────────────────────────────────────────
def _fix_prefix(text: str) -> str:
    """
    Koreksi prefix kode wilayah (1-2 huruf) — HANYA angka → huruf.
    Contoh: '8' → 'B', '0' → 'O'
    TIDAK mengubah huruf → angka (B bukan 8 di posisi prefix)
    """
    result = ""
    for ch in text.upper():
        result += _LETTER_OCR_FIXES.get(ch, ch)
    return result


def _fix_digits(text: str) -> str:
    """
    Koreksi bagian digit — huruf mirip angka → angka.
    Contoh: 'O' → '0', 'I' → '1', 'B' → '8'
    """
    result = ""
    for ch in text.upper():
        if ch.isdigit():
            result += ch
        else:
            result += _DIGIT_OCR_FIXES.get(ch, ch)
    return result


def _fix_suffix(text: str) -> str:
    """
    Koreksi suffix (1-3 huruf) — HANYA angka → huruf.
    Plat Indonesia tidak punya angka di suffix.
    """
    result = ""
    for ch in text.upper():
        result += _LETTER_OCR_FIXES.get(ch, ch)
    return result


# ── Fuzzy Area Code Matching ──────────────────────────────────────────────────
def _levenshtein(s1: str, s2: str) -> int:
    """Hitung jarak Levenshtein sederhana antara dua string pendek."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            curr.append(min(
                prev[j + 1] + 1,   # deletion
                curr[j] + 1,       # insertion
                prev[j] + (c1 != c2)  # substitution
            ))
        prev = curr
    return prev[-1]


def _fuzzy_area_code(raw: str) -> Optional[str]:
    """
    Cocokkan kode wilayah raw ke kode resmi terdekat.
    Toleransi: jarak Levenshtein 1 untuk kode 2-karakter, 0 untuk 1-karakter.
    """
    raw = raw.upper().strip()
    if raw in _VALID_CODES_SET:
        return raw  # exact match

    # Toleransi 1 substitusi untuk kode 2 karakter
    if len(raw) == 2:
        best_code = None
        best_dist = 99
        for code in _VALID_CODES_SET:
            if len(code) == 2:
                d = _levenshtein(raw, code)
                if d < best_dist:
                    best_dist = d
                    best_code = code
        if best_dist <= 1:
            return best_code

    # Untuk kode 1 karakter, hanya exact match
    if len(raw) == 1 and raw in _VALID_CODES_SET:
        return raw

    return None  # tidak bisa diperbaiki


# ── Pipeline Utama ────────────────────────────────────────────────────────────
def normalize_plate(raw_text: str) -> Optional[str]:
    """
    Normalisasi & validasi teks OCR sebagai plat nomor Indonesia.

    Pipeline:
      1. Bersihkan karakter non-alfanumerik
      2. Koreksi angka di posisi prefix (8→B, 0→O, dll) sebelum parsing
      3. Coba parse format plat (3 segmen: prefix-digit-suffix)
      4. Koreksi karakter masing-masing segmen (konteks-aware)
      5. Validasi/fuzzy-fix kode wilayah
      6. Kembalikan format standar "XX 1234 ABC" atau None

    Args:
        raw_text: Teks mentah dari OCR (belum dibersihkan)

    Returns:
        String plat format standar, atau None jika tidak valid
    """
    if not raw_text:
        return None

    text = raw_text.upper().strip()
    text = re.sub(r'[^A-Z0-9\s\-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    # ── Coba parse langsung ───────────────────────────────────────────────────
    candidate = _try_parse(text)
    if candidate:
        return candidate

    # ── Gabungkan semua token lalu parse ─────────────────────────────────────
    combined = ''.join(text.split())
    candidate = _try_parse(combined)
    if candidate:
        return candidate

    # ── Pre-koreksi prefix (angka di awal → huruf) lalu parse ulang ──────────
    # Contoh: '8 1234 ABC' → '8' di prefix dikoreksi ke 'B' → 'B1234ABC'
    prefix_fixed = _fix_prefix_in_text(combined)
    if prefix_fixed != combined:
        candidate = _try_parse(prefix_fixed)
        if candidate:
            return candidate

    # ── Coba setiap substring dengan panjang yang mungkin ────────────────────
    # (untuk kasus OCR membaca karakter ekstra di tepi)
    for start in range(min(3, len(combined))):
        for end in range(start + 4, min(start + 12, len(combined) + 1)):
            candidate = _try_parse(combined[start:end])
            if candidate:
                return candidate
        # Juga coba pada prefix_fixed
        for end in range(start + 4, min(start + 12, len(prefix_fixed) + 1)):
            candidate = _try_parse(prefix_fixed[start:end])
            if candidate:
                return candidate

    return None


def _fix_prefix_in_text(text: str) -> str:
    """
    Koreksi angka/digit-like di 1-2 karakter PERTAMA (posisi prefix kode wilayah).
    Hanya mengubah angka → huruf di area prefix, sisanya tidak disentuh.

    Contoh:
      '81234ABC' → '81234ABC'  (8 dikoreksi ke B di prefix)
      '01234ABC' → 'O1234ABC'
    """
    if not text or len(text) < 3:
        return text

    result = list(text)

    # Koreksi posisi 0 (selalu prefix)
    if result[0] in _LETTER_OCR_FIXES:
        result[0] = _LETTER_OCR_FIXES[result[0]]

    # Koreksi posisi 1 hanya jika JUGA terlihat seperti huruf prefix
    # (yaitu jika posisi 1 bukan digit biasa dan tidak diikuti langsung digit)
    if len(result) > 1 and result[1] in _LETTER_OCR_FIXES:
        # Hanya koreksi jika posisi 2 adalah digit (transisi prefix→digit)
        if len(result) > 2 and (result[2].isdigit() or result[2] in _DIGIT_OCR_FIXES):
            result[1] = _LETTER_OCR_FIXES[result[1]]

    return ''.join(result)


def _try_parse(text: str) -> Optional[str]:
    """
    Coba parse teks sebagai plat nomor Indonesia.
    Strategi:
      1. Koreksi prefix dulu (angka mirip huruf → huruf), lalu coba regex
      2. Normalisasi karakter mirip digit di bagian tengah, lalu split
      3. Brute-force semua segmen possible
    """
    text = text.strip()
    if not text:
        return None

    combined = re.sub(r'\s', '', text)

    # ── Pass A: regex langsung pada combined ─────────────────────────────────
    m = _LOOSE_PLATE.search(combined)
    if m:
        prefix, digits, suffix = m.groups()
        result = _build_plate(prefix, digits, suffix)
        if result:
            return result

    # ── Pass B: Pre-koreksi seluruh string (digit mirip huruf di bagian digit) ─
    # Bangun string di mana setiap char yang terlihat seperti angka di posisi
    # tengah dikoreksi, agar regex bisa menangkap transisi yang benar.
    # Contoh: 'B1Z3ABC' -> setelah partial fix -> 'B123ABC'
    #
    # Strategi: scan dari kiri, temukan posisi pertama digit/mirip-digit,
    # lalu koreksi semua char di blok tengah tersebut.
    pre_fixed = _pre_fix_digits_in_middle(combined)
    if pre_fixed != combined:
        m2 = _LOOSE_PLATE.search(pre_fixed)
        if m2:
            prefix, digits, suffix = m2.groups()
            result = _build_plate(prefix, digits, suffix)
            if result:
                return result

    # ── Pass C: split pada transisi char-type ─────────────────────────────────
    segments = re.split(r'(?<=[A-Z])(?=\d)|(?<=\d)(?=[A-Z])', pre_fixed, flags=re.IGNORECASE)
    if len(segments) == 3:
        prefix, digits, suffix = segments
        if 1 <= len(prefix) <= 2 and 1 <= len(digits) <= 4 and 1 <= len(suffix) <= 3:
            result = _build_plate(prefix, digits, suffix)
            if result:
                return result

    # ── Pass D: brute-force segmen [1-2][1-4][1-3] ───────────────────────────
    s = pre_fixed
    for p_len in [1, 2]:
        if len(s) < p_len + 2:
            continue
        prefix_raw = s[:p_len]
        rest = s[p_len:]
        for d_len in [4, 3, 2, 1]:
            if len(rest) < d_len + 1:
                continue
            digits_raw = rest[:d_len]
            suffix_raw = rest[d_len:d_len + 3]
            if not suffix_raw:
                continue
            result = _build_plate(prefix_raw, digits_raw, suffix_raw)
            if result:
                return result

    return None


def _pre_fix_digits_in_middle(text: str) -> str:
    """
    Pra-koreksi: temukan blok 'digit+mirip-digit' di tengah string
    dan koreksi karakter mirip angka (O→0, Z→2, I→1, S→5, B→8, G→6) di sana.
    Bagian prefix (awal) dan suffix (akhir) huruf tidak diubah.

    Contoh:
      'B1Z3ABC' → 'B123ABC'   (Z di blok digit → 2)
      'DK5OAB'  → 'DK50AB'   (O di blok digit → 0)
    """
    if not text:
        return text

    # Temukan posisi mulai dan akhir blok digit
    # Scan kiri → kanan: lewati prefix huruf, masuk ke blok digit, keluar saat huruf panjang
    i = 0
    n = len(text)

    # Lewati prefix (maks 2 huruf)
    while i < n and i < 2 and text[i].isalpha():
        i += 1

    digit_start = i

    # Scan digit block: karakter adalah digit ATAU mirip digit (O,I,S,Z,G,B,D,Q,T)
    _digit_like = set('0123456789OISZGBDQLT')
    while i < n and text[i].upper() in _digit_like:
        i += 1

    digit_end = i

    if digit_start >= digit_end:
        return text  # tidak ada blok digit ditemukan

    # Koreksi karakter di blok digit
    fixed_middle = ''
    for ch in text[digit_start:digit_end]:
        if ch.isdigit():
            fixed_middle += ch
        else:
            fixed_middle += _DIGIT_OCR_FIXES.get(ch.upper(), ch)

    return text[:digit_start] + fixed_middle + text[digit_end:]


def _build_plate(prefix: str, digits: str, suffix: str) -> Optional[str]:
    """
    Bangun string plat final dengan koreksi per segmen dan validasi kode wilayah.
    """
    # Koreksi per segmen (konteks-aware)
    fixed_prefix = _fix_prefix(prefix)
    fixed_digits = _fix_digits(digits)
    fixed_suffix = _fix_suffix(suffix)

    # Pastikan setelah koreksi, digits benar-benar angka semua
    if not fixed_digits.isdigit():
        return None

    # Pastikan prefix dan suffix benar-benar huruf semua
    if not (fixed_prefix.isalpha() and fixed_suffix.isalpha()):
        return None

    # Validasi panjang
    if not (1 <= len(fixed_prefix) <= 2 and 1 <= len(fixed_digits) <= 4 and 1 <= len(fixed_suffix) <= 3):
        return None

    # Validasi / fuzzy-fix kode wilayah
    valid_code = _fuzzy_area_code(fixed_prefix)
    if valid_code is None:
        # Tidak ada kode wilayah yang cocok — tetap kembalikan tapi tanpa validasi wilayah
        # (mungkin format baru atau plat luar biasa)
        valid_code = fixed_prefix

    return f"{valid_code} {fixed_digits} {fixed_suffix.upper()}"


def get_area_name(plate: str) -> Optional[str]:
    """
    Ambil nama wilayah dari plat nomor yang sudah dinormalisasi.

    Args:
        plate: Plat dalam format standar "XX 1234 ABC"

    Returns:
        Nama wilayah (misal: "DKI Jakarta & sekitarnya") atau None
    """
    if not plate:
        return None
    parts = plate.split()
    if parts:
        code = parts[0].upper()
        return VALID_AREA_CODES.get(code)
    return None


def validate_plate_format(plate: str) -> bool:
    """
    Validasi apakah string plat sudah dalam format standar yang valid.

    Args:
        plate: String plat nomor

    Returns:
        True jika format valid, False jika tidak
    """
    if not plate:
        return False
    return bool(_STRICT_PLATE.match(plate.replace(' ', '')))
