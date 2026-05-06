"""
=============================================================================
  evaluate.py — Evaluasi Model YOLOv8n
  Project  : Klasifikasi Golongan Kendaraan Tol
  Output   : mAP@50, mAP@50-95, confusion matrix, contoh prediksi
=============================================================================
  Cara pakai:
    python evaluate.py                        # pakai best.pt default
    python evaluate.py --model runs/vehicle_cls_v1/weights/best.pt
    python evaluate.py --split test           # evaluasi set test
=============================================================================
"""

import argparse
import os
import sys
import random
import json
from pathlib import Path

import cv2
import numpy as np
import matplotlib
matplotlib.use("Agg")   # non-interactive backend (aman untuk semua OS)
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# ── Path config ──────────────────────────────────────────────────────────────
ROOT        = Path(__file__).parent
BASE        = ROOT.parent
DATA_YAML   = ROOT / "dataset" / "data.yaml"
DEFAULT_MDL = ROOT / "runs" / "vehicle_cls_v1" / "weights" / "best.pt"
OUTPUT_DIR  = ROOT / "runs" / "evaluation"

CLASS_NAMES  = ["GOL I", "GOL II", "GOL III", "GOL IV", "GOL V"]
CLASS_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

# Hex → RGB tuple (0–1)
def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

COLORS_RGB = [hex_to_rgb(c) for c in CLASS_COLORS]


# ── 1. Metrik utama ──────────────────────────────────────────────────────────
def run_metrics(model, data_yaml, split="val"):
    print(f"\n{'='*60}")
    print(f"  EVALUASI METRIK — split: {split}")
    print(f"{'='*60}")

    metrics = model.val(
        data=str(data_yaml),
        split=split,
        device="cpu",
        verbose=False,
        plots=True,
        save_json=True,
    )

    map50    = metrics.box.map50
    map5095  = metrics.box.map
    prec     = metrics.box.mp
    recall   = metrics.box.mr

    # Per-kelas AP50
    ap50_per_cls = metrics.box.ap50   # array panjang nc
    ap_per_cls   = metrics.box.ap     # array panjang nc

    print(f"\n  {'Metrik':<22} {'Nilai':>10}  {'%':>8}")
    print(f"  {'-'*44}")
    print(f"  {'mAP@0.50':<22} {map50:>10.4f}  {map50*100:>7.1f}%")
    print(f"  {'mAP@0.50:0.95':<22} {map5095:>10.4f}  {map5095*100:>7.1f}%")
    print(f"  {'Precision (mean)':<22} {prec:>10.4f}  {prec*100:>7.1f}%")
    print(f"  {'Recall (mean)':<22} {recall:>10.4f}  {recall*100:>7.1f}%")

    print(f"\n  {'Kelas':<12} {'AP@0.50':>10}  {'AP@0.5:0.95':>12}")
    print(f"  {'-'*36}")
    for i, cls in enumerate(CLASS_NAMES):
        a50 = float(ap50_per_cls[i]) if i < len(ap50_per_cls) else 0.0
        a95 = float(ap_per_cls[i])   if i < len(ap_per_cls)   else 0.0
        print(f"  {cls:<12} {a50:>10.4f}  {a95:>12.4f}")

    # Simpan JSON
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summary = {
        "map50"     : round(float(map50),   4),
        "map50_95"  : round(float(map5095), 4),
        "precision" : round(float(prec),    4),
        "recall"    : round(float(recall),  4),
        "per_class" : {
            CLASS_NAMES[i]: {
                "ap50"   : round(float(ap50_per_cls[i]), 4) if i < len(ap50_per_cls) else 0,
                "ap50_95": round(float(ap_per_cls[i]),   4) if i < len(ap_per_cls)   else 0,
            }
            for i in range(len(CLASS_NAMES))
        }
    }
    json_out = OUTPUT_DIR / "metrics_summary.json"
    with open(json_out, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n  ✓ Metrik disimpan: {json_out}")

    return metrics, summary


# ── 2. Confusion Matrix Visual ───────────────────────────────────────────────
def plot_confusion_matrix(metrics, save_dir: Path):
    """Buat confusion matrix per kelas dari hasil val."""
    try:
        cm = metrics.confusion_matrix.matrix.astype(int)  # (nc+1, nc+1)
    except AttributeError:
        print("  ⚠ Confusion matrix tidak tersedia dari objek metrics.")
        return

    nc = len(CLASS_NAMES)
    # Ambil hanya nc×nc (buang kolom/baris background)
    if cm.shape[0] > nc:
        cm = cm[:nc, :nc]

    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.colorbar(im, ax=ax)

    tick_marks = range(nc)
    ax.set_xticks(tick_marks)
    ax.set_yticks(tick_marks)
    ax.set_xticklabels(CLASS_NAMES, rotation=30, ha="right", fontsize=10)
    ax.set_yticklabels(CLASS_NAMES, fontsize=10)

    thresh = cm.max() / 2.0
    for i in range(nc):
        for j in range(nc):
            ax.text(j, i, str(cm[i, j]),
                    ha="center", va="center", fontsize=11,
                    color="white" if cm[i, j] > thresh else "black")

    ax.set_ylabel("Ground Truth",  fontsize=12)
    ax.set_xlabel("Prediksi Model", fontsize=12)
    ax.set_title("Confusion Matrix — Golongan Kendaraan Tol", fontsize=13, fontweight="bold", pad=14)

    # Diagonal highlight
    for i in range(nc):
        ax.add_patch(plt.Rectangle((i - 0.5, i - 0.5), 1, 1,
                                   linewidth=2, edgecolor="#22c55e", facecolor="none"))

    plt.tight_layout()
    out = save_dir / "confusion_matrix_custom.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ Confusion matrix disimpan: {out}")


# ── 3. Grafik mAP per kelas ──────────────────────────────────────────────────
def plot_per_class_ap(summary: dict, save_dir: Path):
    classes = list(summary["per_class"].keys())
    ap50    = [summary["per_class"][c]["ap50"]    for c in classes]
    ap5095  = [summary["per_class"][c]["ap50_95"] for c in classes]

    x = np.arange(len(classes))
    w = 0.35

    fig, ax = plt.subplots(figsize=(10, 5))
    bars1 = ax.bar(x - w/2, ap50,   w, label="AP@0.50",    color=COLORS_RGB, alpha=0.85)
    bars2 = ax.bar(x + w/2, ap5095, w, label="AP@0.5:0.95",
                   color=COLORS_RGB, alpha=0.45, edgecolor="black", linewidth=0.8)

    for bar in bars1:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f"{bar.get_height():.2f}", ha="center", va="bottom", fontsize=9)
    for bar in bars2:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f"{bar.get_height():.2f}", ha="center", va="bottom", fontsize=9)

    ax.set_xticks(x)
    ax.set_xticklabels(classes, fontsize=11)
    ax.set_ylim(0, 1.1)
    ax.set_ylabel("Average Precision", fontsize=12)
    ax.set_title("AP per Kelas Kendaraan", fontsize=13, fontweight="bold")
    ax.legend(fontsize=11)
    ax.axhline(y=summary["map50"], color="red", linestyle="--", linewidth=1.2,
               label=f"mAP@50={summary['map50']:.3f}")
    ax.legend(fontsize=10)
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    out = save_dir / "ap_per_class.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ Grafik AP per kelas disimpan: {out}")


# ── 4. Contoh Prediksi vs Ground Truth ──────────────────────────────────────
def plot_prediction_samples(model, data_yaml, n_samples=8, save_dir=None):
    """Ambil n_samples gambar dari val set, tampilkan GT vs prediksi."""
    import yaml, textwrap

    with open(data_yaml) as f:
        cfg = yaml.safe_load(f)

    yaml_dir  = Path(data_yaml).parent
    val_img_dir = (yaml_dir / cfg["val"]).resolve()

    img_paths = sorted(val_img_dir.glob("*.[jJpP][pPnN][gG]*"))
    if not img_paths:
        print("  ⚠ Tidak ada gambar di val set untuk contoh prediksi.")
        return

    samples = random.sample(img_paths, min(n_samples, len(img_paths)))

    rows = 2
    cols = 4
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4))
    axes = axes.flatten()

    fig.suptitle("Contoh Prediksi vs Ground Truth", fontsize=14, fontweight="bold", y=1.01)

    for idx, img_path in enumerate(samples):
        ax  = axes[idx]
        img = cv2.imread(str(img_path))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]

        # Ground truth (dari file label .txt)
        lbl_path = img_path.parent.parent / "labels" / (img_path.stem + ".txt")
        gt_info  = []
        if lbl_path.exists():
            for line in lbl_path.read_text().strip().splitlines():
                parts = line.split()
                if len(parts) >= 5:
                    cls_id = int(parts[0])
                    cx, cy, bw, bh = map(float, parts[1:5])
                    x1 = int((cx - bw/2) * w); y1 = int((cy - bh/2) * h)
                    x2 = int((cx + bw/2) * w); y2 = int((cy + bh/2) * h)
                    gt_info.append((cls_id, x1, y1, x2, y2))
                    # Draw GT (hijau, garis tebal)
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 220, 0), 2)
                    cv2.putText(img, f"GT:{CLASS_NAMES[cls_id]}", (x1, max(y1-6, 12)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 0), 1)

        # Prediksi model
        result = model.predict(str(img_path), device="cpu", conf=0.25, verbose=False)[0]
        pred_info = []
        for box in result.boxes:
            cls_id   = int(box.cls)
            conf_val = float(box.conf)
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            pred_info.append((cls_id, conf_val))
            # Draw pred (merah, garis tipis)
            cv2.rectangle(img, (x1, y1), (x2, y2), (220, 60, 60), 2)
            cv2.putText(img, f"P:{CLASS_NAMES[cls_id]} {conf_val:.0%}",
                        (x1, y2 + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (220, 60, 60), 1)

        ax.imshow(img)
        ax.axis("off")

        gt_str   = ", ".join(CLASS_NAMES[c[0]] for c in gt_info)  or "—"
        pred_str = ", ".join(f"{CLASS_NAMES[c[0]]}({c[1]:.0%})" for c in pred_info) or "—"
        title    = f"GT: {gt_str}\nP: {pred_str}"
        ax.set_title(textwrap.fill(title, 32), fontsize=7.5, pad=3)

    for ax in axes[len(samples):]:
        ax.axis("off")

    # Legend
    patches = [
        mpatches.Patch(color="#00dc00", label="Ground Truth (GT)"),
        mpatches.Patch(color="#dc3c3c", label="Prediksi Model"),
    ]
    fig.legend(handles=patches, loc="lower center", ncol=2, fontsize=10,
               bbox_to_anchor=(0.5, -0.01))

    plt.tight_layout()
    out = save_dir / "prediction_samples.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ Contoh prediksi disimpan: {out}")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Evaluasi model YOLOv8n Kendaraan Tol")
    parser.add_argument("--model",    type=str, default=str(DEFAULT_MDL), help="Path ke file .pt")
    parser.add_argument("--data",     type=str, default=str(DATA_YAML),   help="Path ke data.yaml")
    parser.add_argument("--split",    type=str, default="val",            help="Split: val | test")
    parser.add_argument("--samples",  type=int, default=8,                help="Jumlah contoh prediksi")
    parser.add_argument("--out",      type=str, default=str(OUTPUT_DIR),  help="Folder output")
    args = parser.parse_args()

    model_path = Path(args.model)
    data_yaml  = Path(args.data)
    out_dir    = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not model_path.exists():
        print(f"\n[ERROR] Model tidak ditemukan: {model_path}")
        print("  Jalankan 'python train.py' terlebih dahulu.\n")
        sys.exit(1)

    if not data_yaml.exists():
        print(f"\n[ERROR] data.yaml tidak ditemukan: {data_yaml}\n")
        sys.exit(1)

    from ultralytics import YOLO
    model = YOLO(str(model_path))

    print(f"\n  Model    : {model_path}")
    print(f"  Dataset  : {data_yaml}")
    print(f"  Split    : {args.split}")
    print(f"  Output   : {out_dir}")

    # 1. Metrik
    metrics, summary = run_metrics(model, data_yaml, args.split)

    print(f"\n{'='*60}")
    print("  MEMBUAT VISUALISASI")
    print(f"{'='*60}")

    # 2. Confusion matrix
    plot_confusion_matrix(metrics, out_dir)

    # 3. AP per kelas
    plot_per_class_ap(summary, out_dir)

    # 4. Contoh prediksi
    plot_prediction_samples(model, data_yaml, n_samples=args.samples, save_dir=out_dir)

    print(f"\n{'='*60}")
    print("  SELESAI")
    print(f"{'='*60}")
    print(f"  Semua output tersimpan di: {out_dir}")
    print(f"\n  File yang dihasilkan:")
    for f in sorted(out_dir.iterdir()):
        size_kb = f.stat().st_size // 1024
        print(f"    {f.name:<40} ({size_kb:>4} KB)")
    print()


if __name__ == "__main__":
    main()
