"""
=============================================================================
  train.py — YOLOv8n Training Script
  Project  : Klasifikasi Golongan Kendaraan Tol
  Model    : YOLOv8n (Nano) — dioptimalkan untuk CPU
  Dataset  : 5 kelas (GOL I – GOL V), 1453 gambar
  Ref      : Paper Section 3.3 — augmentasi brightness + noise

  Golongan Kendaraan Tol (standar Jasa Marga):
    GOL I   — Sedan, Jip, Pick-up, Bus (≤2 gandar, tinggi <1m)
    GOL II  — Truk 2 Gandar
    GOL III — Truk 3 Gandar
    GOL IV  — Truk 4 Gandar
    GOL V   — Truk 5 Gandar atau lebih
=============================================================================
"""

import os
import sys
import time
import shutil
from pathlib import Path

# ── Pastikan bisa import ultralytics tanpa aktivasi manual ──────────────────
ROOT = Path(__file__).parent                          # .../ai/
BASE = ROOT.parent                                    # .../Vehicle_Classification/
DATA_YAML   = ROOT / "dataset" / "data.yaml"
RUNS_DIR    = ROOT / "runs"
BACKEND_MDL = BASE / "backend" / "models"

# ── Config Training ─────────────────────────────────────────────────────────
CFG = dict(
    model      = "yolov8n.pt",   # Nano — paling ringan untuk CPU
    data       = str(DATA_YAML),
    epochs     = 100,
    imgsz      = 640,
    # ── CPU-safe batch: 4 cukup stabil; kurangi ke 2 jika RAM < 8 GB ───────
    batch      = 4,
    device     = "cpu",          # Paksa CPU
    workers    = 2,              # Thread minimal agar tidak overload
    # ── Output ──────────────────────────────────────────────────────────────
    project    = str(RUNS_DIR),
    name       = "vehicle_cls_v1",
    exist_ok   = True,           # Lanjutkan jika folder sudah ada
    # ── Regularisasi & early stopping ───────────────────────────────────────
    patience   = 20,             # Stop jika 20 epoch tidak improve
    save       = True,
    save_period= 10,             # Simpan checkpoint tiap 10 epoch
    plots      = True,
    verbose    = True,
    # ── Augmentasi (Section 3.3 Paper) ──────────────────────────────────────
    # Brightness / exposure
    hsv_h      = 0.015,          # Hue jitter
    hsv_s      = 0.7,            # Saturation jitter
    hsv_v      = 0.4,            # Value/brightness jitter  ← sesuai paper
    # Noise & geometric
    degrees    = 0.0,            # Tidak ada rotasi (kamera statis)
    translate  = 0.1,
    scale      = 0.5,
    shear      = 0.0,
    perspective= 0.0,
    flipud     = 0.0,            # Tidak flip vertikal (kamera atas)
    fliplr     = 0.5,            # Flip horizontal 50%
    mosaic     = 1.0,            # Mosaic augmentation
    mixup      = 0.0,
    copy_paste = 0.0,
    erasing    = 0.4,            # Random erasing ≈ simulasi noise oklusi ← sesuai paper
)

# ── Kelas kendaraan (standar Jasa Marga) ─────────────────────────────────────
CLASS_NAMES = ["GOL I", "GOL II", "GOL III", "GOL IV", "GOL V"]
CLASS_DESC  = {
    "GOL I"  : "Sedan / Jip / Pick-up / Bus",
    "GOL II" : "Truk 2 Gandar",
    "GOL III": "Truk 3 Gandar",
    "GOL IV" : "Truk 4 Gandar",
    "GOL V"  : "Truk 5 Gandar atau lebih",
}


def print_header():
    print("\n" + "=" * 65)
    print("  YOLOv8n — Klasifikasi Golongan Kendaraan Tol")
    print("=" * 65)
    print(f"  Dataset  : {DATA_YAML}")
    print(f"  Output   : {RUNS_DIR / CFG['name']}")
    print(f"  Device   : CPU  (batch={CFG['batch']}, workers={CFG['workers']})")
    print(f"  Epochs   : {CFG['epochs']}  (early-stop patience={CFG['patience']})")
    print(f"  Img size : {CFG['imgsz']}×{CFG['imgsz']}")
    print("\n  Kelas kendaraan:")
    for i, (name, desc) in enumerate(CLASS_DESC.items()):
        print(f"    [{i}] {name:8s} — {desc}")
    print("=" * 65 + "\n")


def validate_dataset():
    """Cek dataset tersedia sebelum training."""
    if not DATA_YAML.exists():
        print(f"[ERROR] data.yaml tidak ditemukan: {DATA_YAML}")
        sys.exit(1)

    import yaml
    with open(DATA_YAML) as f:
        cfg = yaml.safe_load(f)

    # Resolve path relatif terhadap data.yaml
    yaml_dir = DATA_YAML.parent
    for split in ["train", "val"]:
        p = cfg.get(split, "")
        abs_p = (yaml_dir / p).resolve()
        if not abs_p.exists():
            print(f"[ERROR] Folder '{split}' tidak ditemukan: {abs_p}")
            print("  Pastikan dataset sudah ada di folder train/ dan valid/")
            sys.exit(1)
        n_imgs = len(list(abs_p.glob("*.[jJpP][pPnN][gG]*")))
        print(f"  ✓ {split:5s}: {n_imgs:4d} gambar  ({abs_p})")

    print()


def train():
    from ultralytics import YOLO

    print_header()

    # Cek dataset
    print("[1/4] Validasi dataset ...")
    validate_dataset()

    # Load model pretrained
    print("[2/4] Memuat model YOLOv8n pretrained ...")
    model = YOLO(CFG["model"])

    # Training
    print(f"[3/4] Memulai training {CFG['epochs']} epochs (CPU mode) ...")
    print("      ⚠  CPU training bisa memakan waktu 3–8 jam tergantung spesifikasi.\n")

    t_start = time.time()
    results = model.train(**CFG)
    elapsed = time.time() - t_start

    h, m = divmod(int(elapsed), 3600)
    m, s = divmod(m, 60)
    print(f"\n  ⏱  Total waktu training : {h}j {m}m {s}d")

    # Salin model ke backend
    print("\n[4/4] Menyimpan best model ke backend/models/ ...")
    best_src = Path(results.save_dir) / "weights" / "best.pt"
    last_src = Path(results.save_dir) / "weights" / "last.pt"

    BACKEND_MDL.mkdir(parents=True, exist_ok=True)
    if best_src.exists():
        shutil.copy(best_src, BACKEND_MDL / "best.pt")
        print(f"  ✓ Disalin: {BACKEND_MDL / 'best.pt'}")
    if last_src.exists():
        shutil.copy(last_src, BACKEND_MDL / "last.pt")
        print(f"  ✓ Disalin: {BACKEND_MDL / 'last.pt'}")

    # Tampilkan metrik akhir
    print("\n" + "=" * 65)
    print("  HASIL TRAINING")
    print("=" * 65)
    try:
        metrics = model.val(data=str(DATA_YAML), device="cpu", verbose=False)
        print(f"  mAP@0.50      : {metrics.box.map50:.4f}  ({metrics.box.map50*100:.1f}%)")
        print(f"  mAP@0.50:0.95 : {metrics.box.map:.4f}  ({metrics.box.map*100:.1f}%)")
        print(f"  Precision     : {metrics.box.mp:.4f}")
        print(f"  Recall        : {metrics.box.mr:.4f}")
    except Exception as e:
        print(f"  (Gagal menampilkan metrik: {e})")

    print(f"\n  📁 Model terbaik : {best_src}")
    print(f"  📁 Run directory : {results.save_dir}")
    print("\n  Langkah selanjutnya:")
    print("    python evaluate.py   → evaluasi detail + confusion matrix")
    print("    python export.py     → export ke ONNX")
    print("=" * 65 + "\n")

    return results

if __name__ == "__main__":
    train()
