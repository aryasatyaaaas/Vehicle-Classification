"""
=============================================================================
  export.py — Export YOLOv8n ke format ONNX
  Project  : Klasifikasi Golongan Kendaraan Tol
  Output   : backend/models/best.onnx  +  backend/models/best.pt
=============================================================================
  Cara pakai:
    python export.py                          # default best.pt
    python export.py --model runs/vehicle_cls_v1/weights/best.pt
    python export.py --format onnx            # format: onnx | torchscript | openvino
=============================================================================
"""

import argparse
import shutil
import sys
from pathlib import Path

ROOT        = Path(__file__).parent
BASE        = ROOT.parent
DEFAULT_MDL = ROOT / "runs" / "vehicle_cls_v1" / "weights" / "best.pt"
BACKEND_MDL = BASE / "backend" / "models"

SUPPORTED_FORMATS = ["onnx", "torchscript", "openvino"]

EXT_MAP = {
    "onnx"       : ".onnx",
    "torchscript": ".torchscript",
    "openvino"   : "_openvino_model",
}


def export_model(model_path: Path, fmt: str, img_size: int, opset: int):
    from ultralytics import YOLO

    print("\n" + "=" * 60)
    print("  EXPORT MODEL — YOLOv8n Kendaraan Tol")
    print("=" * 60)
    print(f"  Source  : {model_path}")
    print(f"  Format  : {fmt.upper()}")
    print(f"  Img size: {img_size}×{img_size}")
    if fmt == "onnx":
        print(f"  Opset   : {opset}")
    print()

    if not model_path.exists():
        print(f"[ERROR] Model tidak ditemukan: {model_path}")
        print("  Jalankan 'python train.py' terlebih dahulu.\n")
        sys.exit(1)

    model = YOLO(str(model_path))

    # Export
    export_kwargs = dict(
        format  = fmt,
        imgsz   = img_size,
        device  = "cpu",
        simplify= True if fmt == "onnx" else False,
    )
    if fmt == "onnx":
        export_kwargs["opset"] = opset

    print(f"[1/3] Mengekspor ke format {fmt.upper()} ...")
    exported_path = model.export(**export_kwargs)
    exported_path = Path(exported_path)
    print(f"  ✓ Ekspor selesai: {exported_path}")

    # Salin ke backend/models/
    print(f"\n[2/3] Menyalin ke backend/models/ ...")
    BACKEND_MDL.mkdir(parents=True, exist_ok=True)

    # Selalu salin .pt juga
    pt_dest = BACKEND_MDL / "best.pt"
    shutil.copy(model_path, pt_dest)
    print(f"  ✓ best.pt  → {pt_dest}")

    # Salin file export
    if exported_path.is_dir():
        # OpenVINO menghasilkan folder
        dest_dir = BACKEND_MDL / exported_path.name
        if dest_dir.exists():
            shutil.rmtree(dest_dir)
        shutil.copytree(exported_path, dest_dir)
        print(f"  ✓ {fmt} dir → {dest_dir}")
    else:
        dest_file = BACKEND_MDL / f"best{EXT_MAP.get(fmt, '.' + fmt)}"
        shutil.copy(exported_path, dest_file)
        print(f"  ✓ best{EXT_MAP.get(fmt, '')} → {dest_file}")

    # Verifikasi ONNX
    if fmt == "onnx":
        print(f"\n[3/3] Verifikasi ONNX ...")
        _verify_onnx(BACKEND_MDL / "best.onnx", img_size)
    else:
        print(f"\n[3/3] Verifikasi (skipped untuk format {fmt})")

    print("\n" + "=" * 60)
    print("  EXPORT SELESAI")
    print("=" * 60)
    _print_backend_contents()
    print()


def _verify_onnx(onnx_path: Path, img_size: int):
    try:
        import onnxruntime as ort
        import numpy as np
        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        dummy = np.random.rand(1, 3, img_size, img_size).astype(np.float32)
        inp_name = sess.get_inputs()[0].name
        out = sess.run(None, {inp_name: dummy})
        print(f"  ✓ ONNX Runtime inference OK — output shape: {out[0].shape}")
    except ImportError:
        print("  ℹ onnxruntime tidak terinstall; skip verifikasi.")
        print("    Install dengan: pip install onnxruntime")
    except Exception as e:
        print(f"  ⚠ Verifikasi gagal: {e}")


def _print_backend_contents():
    print(f"\n  📁 Isi backend/models/:")
    if BACKEND_MDL.exists():
        for f in sorted(BACKEND_MDL.iterdir()):
            if f.is_file():
                size_mb = f.stat().st_size / (1024 * 1024)
                print(f"    {f.name:<35} ({size_mb:.1f} MB)")
            else:
                print(f"    {f.name}/ (folder)")
    print()
    print("  Cara pakai di backend (main.py):")
    print("    model = YOLO('backend/models/best.pt')          # PyTorch")
    print("    model = YOLO('backend/models/best.onnx')        # ONNX (lebih cepat)")


def main():
    parser = argparse.ArgumentParser(description="Export YOLOv8n ke ONNX / TorchScript")
    parser.add_argument("--model",   type=str, default=str(DEFAULT_MDL), help="Path ke .pt")
    parser.add_argument("--format",  type=str, default="onnx",           help="onnx | torchscript | openvino")
    parser.add_argument("--imgsz",   type=int, default=640,              help="Image size (default: 640)")
    parser.add_argument("--opset",   type=int, default=12,               help="ONNX opset version (default: 12)")
    args = parser.parse_args()

    if args.format not in SUPPORTED_FORMATS:
        print(f"[ERROR] Format tidak didukung: {args.format}")
        print(f"  Pilihan: {', '.join(SUPPORTED_FORMATS)}")
        sys.exit(1)

    export_model(
        model_path = Path(args.model),
        fmt        = args.format,
        img_size   = args.imgsz,
        opset      = args.opset,
    )


if __name__ == "__main__":
    main()
