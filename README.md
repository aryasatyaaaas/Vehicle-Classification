# 🚗 Vehicle Classification Tol

> Sistem klasifikasi dan pembacaan plat nomor kendaraan tol secara real-time menggunakan YOLOv8, FastAPI, dan Next.js.

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-purple?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PC9zdmc+)](https://ultralytics.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Dataset](https://img.shields.io/badge/Dataset-Roboflow-purple?logo=roboflow)](https://universe.roboflow.com/muhammad-rizky-ferdiansyah-00fow/golongan-kendaraan-jalan-tol-lingkar-luar-jakarta-timur/dataset/5)

---

## 📖 Deskripsi

**Vehicle Classification Tol** adalah sistem berbasis AI untuk mengklasifikasikan golongan kendaraan di gerbang tol secara real-time. Sistem ini memadukan deteksi objek YOLOv8 dengan pembacaan plat nomor (EasyOCR) dan menyajikan hasilnya melalui antarmuka web modern.

**Masalah yang diselesaikan:**
- Identifikasi manual golongan kendaraan di gerbang tol yang lambat dan rawan kesalahan manusia.
- Membutuhkan sistem otomatis yang dapat mendeteksi golongan kendaraan (GOL I–V standar Jasa Marga) sekaligus membaca plat nomor dalam satu pipeline yang efisien.

---

## ✨ Fitur

- 🎯 **Deteksi Real-time** — Streaming frame via WebSocket dengan latensi rendah
- 🧠 **Smart Capture** — Deteksi stabilitas bounding box antar frame; OCR hanya dijalankan saat kendaraan berhenti (hemat komputasi)
- 🔤 **Plate OCR** — Pembacaan plat nomor dua tahap: crop region → EasyOCR
- 📸 **Manual Capture** — Tombol capture untuk operator; pemilihan frame paling tajam otomatis
- 🖼️ **Image Upload** — Analisis gambar statis via endpoint `/predict`
- 📊 **5 Kelas Kendaraan** — GOL I sampai GOL V sesuai standar Jasa Marga
- 🔒 **HTTPS Ready** — Nginx reverse proxy dengan HTTPS untuk akses kamera browser
- 🐳 **Docker Compose** — Deploy satu perintah ke server/VM
- 🖥️ **Desktop App** — Dukungan Tauri untuk membangun aplikasi desktop native

---

## 🏷️ Kelas Kendaraan

| ID | Golongan | Deskripsi | Warna |
|----|----------|-----------|-------|
| 0 | **GOL I** | Sedan / Jip / Pick-up / Bus | 🟢 Hijau |
| 1 | **GOL II** | Truk 2 Gandar | 🔵 Biru |
| 2 | **GOL III** | Truk 3 Gandar | 🟡 Kuning |
| 3 | **GOL IV** | Truk 4 Gandar | 🔴 Merah |
| 4 | **GOL V** | Truk 5 Gandar atau lebih | 🟣 Ungu |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **AI / ML** | YOLOv8n (Ultralytics ≥ 8.2), PyTorch ≥ 2.0 |
| **OCR** | EasyOCR ≥ 1.7 |
| **Backend** | FastAPI ≥ 0.111, Uvicorn, Python 3.10+ |
| **Image Processing** | OpenCV ≥ 4.8, NumPy, Pillow |
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4, TypeScript |
| **Desktop** | Tauri 2 (opsional) |
| **Reverse Proxy** | Nginx (HTTPS, self-signed cert) |
| **Containerization** | Docker + Docker Compose |
| **Dataset** | Roboflow Universe (Public Domain) |

---

## 📋 Prerequisites

Pastikan software berikut sudah terinstall sebelum memulai:

| Software | Versi Minimum | Link |
|----------|--------------|------|
| Python | 3.10 | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 LTS | [nodejs.org](https://nodejs.org/) |
| Git | terbaru | [git-scm.com](https://git-scm.com/) |
| Docker + Docker Compose | terbaru | [docs.docker.com](https://docs.docker.com/get-docker/) *(untuk deployment)* |

> **Catatan GPU:** Training sangat disarankan menggunakan GPU (CUDA). Untuk inferensi/backend, CPU sudah cukup.

---

## ⚡ Installation & Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/aryasatyaaaas/Vehicle-Classification.git
cd Vehicle-Classification
```

### 2. Setup Environment Otomatis

Script berikut akan membuat virtual environment dan menginstall semua dependensi untuk modul `ai/` dan `backend/`.

**Windows:**
```bat
setup_env.bat
```

**Linux / macOS:**
```bash
bash setup_env.sh
```

### 3. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit file `.env` sesuai konfigurasi server Anda (lihat bagian [Konfigurasi](#konfigurasi)).

---

## 🚀 Usage / Cara Pakai

### Mode Development (Lokal)

#### A. Training Model (Opsional — skip jika sudah punya `best.pt`)

```bash
cd ai

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

# Mulai training (±3–8 jam di CPU)
python train.py
```

Setelah selesai, model terbaik otomatis disalin ke `backend/models/best.pt`.

Jika model sudah ada di folder `runs/`, ekspor manual:
```bash
python export_model.py
```

#### B. Jalankan Backend API

```bash
cd backend

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

python main.py
# API tersedia di → http://localhost:8000
# Dokumentasi Swagger → http://localhost:8000/docs
```

#### C. Jalankan Frontend

```bash
cd frontend
npm install
npm run dev
# UI tersedia di → http://localhost:3000
```

---

### Mode Production (Docker)

Deploy seluruh stack (Backend + Frontend + Nginx HTTPS) dengan satu perintah:

```bash
# Salin dan isi file .env terlebih dahulu
cp .env.example .env

# Build dan jalankan semua service
docker compose up --build -d

# Cek status service
docker compose ps

# Lihat log real-time
docker compose logs -f
```

Akses aplikasi:
- **HTTPS (utama)**: `https://<IP_VM>`
- **HTTP fallback**: `http://<IP_VM>:8080`
- **API langsung**: `http://<IP_VM>:8000`
- **API Docs**: `http://<IP_VM>:8000/docs`

> **Penting:** HTTPS diperlukan agar browser mengizinkan akses kamera.

Untuk menghentikan:
```bash
docker compose down
```

---

## ⚙️ Konfigurasi

Salin `.env.example` ke `.env` lalu sesuaikan nilai berikut:

```env
# IP atau domain server/VM Anda
# Contoh: http://192.168.1.100:8000 atau https://tol.namadomain.com/api
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# Opsional: nama domain jika ada
# DOMAIN=tol.namadomain.com
```

| Variable | Keterangan | Contoh |
|----------|-----------|--------|
| `NEXT_PUBLIC_API_URL` | URL backend API yang bisa diakses frontend | `http://192.168.1.100:8000` |
| `DOMAIN` | Domain untuk konfigurasi Nginx (opsional) | `tol.example.com` |

---

## 🔌 API Documentation

Base URL: `http://localhost:8000`

| Method | Endpoint | Deskripsi | Body |
|--------|----------|-----------|------|
| `GET` | `/` | Info status API & model | — |
| `GET` | `/health` | Health check (digunakan Docker & Tauri) | — |
| `GET` | `/classes` | Daftar 5 kelas kendaraan beserta info | — |
| `POST` | `/predict` | Upload gambar statis → hasil deteksi + plat | `multipart/form-data`: `file`, `conf` (opsional, default 0.15) |
| `POST` | `/capture` | Capture manual operator (full pipeline) | `multipart/form-data`: `file` |
| `WS` | `/ws/predict` | Live stream frame → deteksi + stabilitas + plat | Binary JPEG frames |

### Contoh Response `/predict`

```json
{
  "filename": "kendaraan.jpg",
  "image_size": { "width": 1280, "height": 720 },
  "inference_ms": 120.5,
  "total_detections": 1,
  "detections": [
    {
      "class_id": 0,
      "class_name": "GOL I",
      "description": "Sedan / Jip / Pick-up / Bus",
      "color": "#22c55e",
      "confidence": 0.9341,
      "bbox": { "x1": 100, "y1": 80, "x2": 640, "y2": 500 },
      "plate_number": "B 1234 XYZ"
    }
  ]
}
```

### WebSocket Response Schema

```json
{
  "detections": [...],
  "stability_count": 4,
  "stable": false,
  "stability_max": 5,
  "plate_update": "B 1234 XYZ"
}
```

> Dokumentasi interaktif Swagger tersedia di `/docs` dan ReDoc di `/redoc`.

---

## 📁 Struktur Folder

```
Vehicle_Classification/
├── ai/                          # Modul AI: training & inferensi
│   ├── dataset/                 # data.yaml untuk YOLOv8
│   ├── runs/                    # Output training (weights, plots, metrics)
│   ├── train.py                 # Script training utama (YOLOv8n, CPU-optimized)
│   ├── predict.py               # Inferensi gambar/video via CLI
│   ├── export_model.py          # Salin best.pt ke backend/models/
│   ├── export.py                # Export ke ONNX
│   ├── evaluate.py              # Evaluasi metrik & visualisasi
│   ├── generate_report.py       # Generate laporan PDF
│   ├── train_colab.ipynb        # Notebook Google Colab (GPU)
│   ├── requirements.txt
│   └── yolov8n.pt               # Base pretrained model
│
├── backend/                     # FastAPI REST API + WebSocket
│   ├── models/                  # Letakkan best.pt di sini
│   ├── uploads/                 # Temporary file upload storage
│   ├── main.py                  # Entry point API (v3.0)
│   ├── plate_detector.py        # Stage-1 plate region detection
│   ├── plate_ocr.py             # EasyOCR plate reader
│   ├── plate_postprocess.py     # Post-processing hasil OCR
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                    # Next.js 15 Web UI
│   ├── src/
│   │   └── app/                 # Next.js App Router
│   ├── public/
│   ├── src-tauri/               # Tauri desktop app config
│   ├── Dockerfile
│   └── package.json
│
├── nginx/                       # Reverse proxy HTTPS
│   ├── nginx.conf
│   └── Dockerfile
│
├── train/                       # Dataset training (gambar + label)
├── valid/                       # Dataset validasi
├── test/                        # Dataset test
│
├── docker-compose.yml           # Orkestrasi semua service
├── data.yaml                    # Konfigurasi dataset YOLOv8
├── setup_env.bat                # Setup otomatis Windows
├── setup_env.sh                 # Setup otomatis Linux/macOS
├── train.bat                    # Shortcut training di Windows
├── .env.example                 # Template konfigurasi
└── .gitignore
```

---

## 📊 Dataset

| Atribut | Detail |
|---------|--------|
| **Sumber** | [Roboflow Universe](https://universe.roboflow.com/muhammad-rizky-ferdiansyah-00fow/golongan-kendaraan-jalan-tol-lingkar-luar-jakarta-timur/dataset/5) |
| **Nama** | Golongan Kendaraan Jalan Tol Lingkar Luar Jakarta Timur |
| **Versi** | v5 (2023-08-03) |
| **Jumlah Gambar** | 1.453 (setelah augmentasi) |
| **Format Label** | YOLOv8 |
| **Resolusi** | 640 × 640 px |
| **Lisensi** | Public Domain |

**Augmentasi yang diterapkan:**
- Flip horizontal (50%)
- Rotasi 90° (acak)
- Rotasi ±15°
- Shear horizontal & vertikal ±15°
- Penyesuaian brightness ±25%

---

## 🧪 Testing & Evaluasi

### Jalankan Evaluasi Model

```bash
cd ai
source venv/bin/activate   # atau venv\Scripts\activate di Windows

# Evaluasi metrik (mAP, Precision, Recall, Confusion Matrix)
python evaluate.py

# Inferensi pada gambar/video tertentu
python predict.py --source path/to/image.jpg

# Generate laporan PDF
python generate_report.py
```

### Cek Health Backend

```bash
curl http://localhost:8000/health
# Response: {"status": "ok", "model_loaded": true}
```

### Lint Frontend

```bash
cd frontend
npm run lint
```

---

## 🖥️ Desktop App (Tauri) — Opsional

Proyek ini mendukung build sebagai aplikasi desktop native menggunakan Tauri 2.

**Prerequisites tambahan:** Rust toolchain (`rustup`)

```bash
cd frontend

# Development mode
npm run tauri:dev

# Build distributable (.exe / .dmg / .AppImage)
npm run tauri:build
```

---

## 🗺️ Roadmap

- [x] Klasifikasi 5 golongan kendaraan real-time via WebSocket
- [x] Pembacaan plat nomor dengan EasyOCR (dua tahap)
- [x] Smart capture berdasarkan stabilitas bounding box
- [x] Deployment Docker dengan HTTPS via Nginx
- [x] Desktop app via Tauri
- [ ] Integrasi database untuk riwayat transaksi
- [ ] Dashboard statistik kendaraan per shift/hari
- [ ] Support GPU inference untuk throughput lebih tinggi
- [ ] Export data CSV/Excel per sesi

---

## 🤝 Contributing

Kontribusi sangat diterima! Ikuti langkah berikut:

1. **Fork** repository ini
2. **Buat branch** fitur baru: `git checkout -b feature/nama-fitur`
3. **Commit** perubahan: `git commit -m 'feat: tambah fitur X'`
4. **Push** ke branch: `git push origin feature/nama-fitur`
5. **Buat Pull Request** dan jelaskan perubahan yang dibuat

**Panduan commit message** (Conventional Commits):
- `feat:` — Fitur baru
- `fix:` — Bug fix
- `docs:` — Perubahan dokumentasi
- `refactor:` — Refactoring kode
- `chore:` — Maintenance/konfigurasi

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT**. Lihat file [LICENSE](LICENSE) untuk detail lengkap.

Dataset yang digunakan berlisensi **Public Domain** dari Roboflow Universe.

---


## 🙏 Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) — Object detection framework
- [EasyOCR](https://github.com/JaidedAI/EasyOCR) — OCR library untuk pembacaan plat nomor
- [FastAPI](https://fastapi.tiangolo.com/) — High-performance Python web framework
- [Next.js](https://nextjs.org/) — React framework untuk frontend
- [Tauri](https://tauri.app/) — Framework desktop app berbasis web
- [Roboflow Universe](https://universe.roboflow.com/) — Platform dataset & anotasi
- **Muhammad Rizky Ferdiansyah** — Pembuat dataset asli di Roboflow Universe
- [Jasa Marga](https://www.jasamarga.com/) — Standar golongan kendaraan tol Indonesia
