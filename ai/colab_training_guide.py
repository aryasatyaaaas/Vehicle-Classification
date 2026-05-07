# =============================================================================
#  PANDUAN GOOGLE COLAB — YOLOv8n Training Kendaraan Tol
#  Copy-paste tiap cell ke Google Colab secara berurutan.
#  WAJIB: Runtime → Change runtime type → T4 GPU
# =============================================================================


# ── CELL 1: Cek GPU ───────────────────────────────────────────────────────────
import torch
print('='*50)
print(f'GPU tersedia : {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'Nama GPU     : {torch.cuda.get_device_name(0)}')
    print(f'VRAM         : {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB')
else:
    print('❌ GPU TIDAK AKTIF! → Runtime → Change runtime type → T4 GPU → Save')
print('='*50)


# ── CELL 2: Install dependencies ──────────────────────────────────────────────
# !pip install ultralytics roboflow -q
# print('✅ Ultralytics & Roboflow installed')


# ── CELL 3: Download Dataset dari Roboflow ────────────────────────────────────
# Daftar API Key gratis di: https://app.roboflow.com → Settings → API Keys
from roboflow import Roboflow

API_KEY = "GANTI_DENGAN_API_KEY_KAMU"   # ← ganti ini!

rf      = Roboflow(api_key=API_KEY)
project = rf.workspace("muhammad-rizky-ferdiansyah-00fow").project(
    "golongan-kendaraan-jalan-tol-lingkar-luar-jakarta-timur"
)
dataset = project.version(5).download("yolov8")
print(f'✅ Dataset downloaded ke: {dataset.location}')


# ── CELL 4: Buat data.yaml ────────────────────────────────────────────────────
import os, yaml
from pathlib import Path

DATASET_DIR = Path(dataset.location)   # ubah ke Path('/content/dataset') jika upload manual

data_cfg = {
    'train': str(DATASET_DIR / 'train' / 'images'),
    'val':   str(DATASET_DIR / 'valid' / 'images'),
    'test':  str(DATASET_DIR / 'test'  / 'images'),
    'nc': 5,
    'names': ['GOL I', 'GOL II', 'GOL III', 'GOL IV', 'GOL V'],
}

YAML_PATH = '/content/data.yaml'
with open(YAML_PATH, 'w') as f:
    yaml.dump(data_cfg, f, default_flow_style=False)

print('✅ data.yaml dibuat:')
print(open(YAML_PATH).read())
for split in ['train', 'valid', 'test']:
    p = DATASET_DIR / split / 'images'
    n = len(list(p.glob('*.[jJpP][pPnN][gG]*'))) if p.exists() else 0
    print(f'  {split:6s}: {n} gambar')


# ── CELL 5: TRAINING ──────────────────────────────────────────────────────────
from ultralytics import YOLO
import time

YAML_PATH = '/content/data.yaml'   # didefinisikan ulang agar cell mandiri
SAVE_DIR  = '/content/runs/vehicle_cls_v1'

model = YOLO('yolov8n.pt')
t0    = time.time()

results = model.train(
    data       = YAML_PATH,
    epochs     = 100,
    imgsz      = 640,
    batch      = 16,        # GPU T4: 16 aman (~2 GB VRAM)
    device     = 0,         # cuda:0
    workers    = 2,
    project    = '/content/runs',
    name       = 'vehicle_cls_v1',
    exist_ok   = True,
    patience   = 20,
    save       = True,
    save_period= 10,
    plots      = True,
    verbose    = True,
    # ── Augmentasi (Paper Section 3.3) ──
    hsv_h      = 0.015,
    hsv_s      = 0.7,
    hsv_v      = 0.4,       # brightness jitter
    degrees    = 0.0,
    translate  = 0.1,
    scale      = 0.5,
    shear      = 0.0,
    perspective= 0.0,
    flipud     = 0.0,
    fliplr     = 0.5,
    mosaic     = 1.0,
    mixup      = 0.0,
    copy_paste = 0.0,
    erasing    = 0.4,       # random erasing ≈ simulasi noise oklusi
)

elapsed = time.time() - t0
h, m = divmod(int(elapsed), 3600)
m, s = divmod(m, 60)
print(f'\n⏱️  Total training: {h}j {m}m {s}d')
print(f'📁 Disimpan di   : {results.save_dir}')


# ── CELL 6: Evaluasi — SELF-CONTAINED (tidak butuh variabel Cell 5) ───────────
from ultralytics import YOLO

SAVE_DIR  = '/content/runs/vehicle_cls_v1'   # hardcoded
YAML_PATH = '/content/data.yaml'
best_pt   = f'{SAVE_DIR}/weights/best.pt'

model   = YOLO(best_pt)
metrics = model.val(data=YAML_PATH, device=0, verbose=True)

CLASS_NAMES = ['GOL I', 'GOL II', 'GOL III', 'GOL IV', 'GOL V']
print('\n' + '='*55)
print('  HASIL EVALUASI AKHIR')
print('='*55)
print(f'  mAP@0.50      : {metrics.box.map50:.4f}  ({metrics.box.map50*100:.1f}%)')
print(f'  mAP@0.50:0.95 : {metrics.box.map:.4f}  ({metrics.box.map*100:.1f}%)')
print(f'  Precision     : {metrics.box.mp:.4f}')
print(f'  Recall        : {metrics.box.mr:.4f}')
print(f'\n  {"Kelas":<12} {"AP@50":>10}  {"AP@50-95":>12}')
print(f'  {"-"*36}')
for i, cls in enumerate(CLASS_NAMES):
    a50 = float(metrics.box.ap50[i]) if i < len(metrics.box.ap50) else 0
    a95 = float(metrics.box.ap[i])   if i < len(metrics.box.ap)   else 0
    print(f'  {cls:<12} {a50:>10.4f}  {a95:>12.4f}')
print('='*55)


# ── CELL 7: Export ONNX — SELF-CONTAINED ─────────────────────────────────────
from ultralytics import YOLO

SAVE_DIR = '/content/runs/vehicle_cls_v1'   # hardcoded
best_pt  = f'{SAVE_DIR}/weights/best.pt'

model     = YOLO(best_pt)
onnx_path = model.export(
    format   = 'onnx',
    imgsz    = 640,
    opset    = 12,
    simplify = True,
    device   = 0,
)
print(f'✅ ONNX disimpan: {onnx_path}')


# ── CELL 8: Download — SELF-CONTAINED (fix: zip_out bukan zip_path) ──────────
import shutil, os
from google.colab import files

SAVE_DIR = '/content/runs/vehicle_cls_v1'   # hardcoded — tidak butuh variabel Cell 5
zip_out  = '/content/vehicle_cls_v1_results.zip'

print('📦 Membuat zip dari hasil training ...')
shutil.make_archive('/content/vehicle_cls_v1_results', 'zip', SAVE_DIR)

print('\n📦 File tersedia:')
for fname in ['best.pt', 'last.pt', 'best.onnx']:
    fp = os.path.join(SAVE_DIR, 'weights', fname)
    if os.path.exists(fp):
        size_mb = os.path.getsize(fp) / 1e6
        print(f'   ✅ weights/{fname} ({size_mb:.1f} MB)')
    else:
        print(f'   ⚠️  weights/{fname} tidak ditemukan')

zip_size = os.path.getsize(zip_out) / 1e6
print(f'\n⬇️  Mendownload zip ({zip_size:.1f} MB) ...')
files.download(zip_out)   # ← fix: pakai zip_out bukan zip_path
