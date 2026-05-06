# 🚗 Vehicle Classification Tol — YOLOv8 + FastAPI + Next.js

Sistem klasifikasi golongan kendaraan tol secara real-time menggunakan:
- **AI/ML** : YOLOv8 (Ultralytics)
- **Backend**: FastAPI + Uvicorn
- **Frontend**: Next.js 15 + Tailwind CSS
- **Dataset** : Golongan Kendaraan Jalan Tol Lingkar Luar Jakarta Timur (5 kelas, 1453 gambar)

---

## 📁 Struktur Folder

```
Vehicle_Classification/
├── ai/                    # Training & inferensi YOLOv8
│   ├── venv/              # Python virtual environment
│   ├── runs/              # Output training (weights, plots)
│   ├── train.py           # Script training utama
│   ├── predict.py         # Script inferensi gambar/video
│   ├── export_model.py    # Export model ke backend/models/
│   ├── evaluate.py        # Evaluasi & visualisasi metrics
│   └── requirements.txt
├── backend/               # FastAPI REST API
│   ├── venv/
│   ├── models/            # Simpan best.pt di sini
│   ├── uploads/           # Temporary upload storage
│   ├── main.py            # Entry point API
│   ├── .env
│   └── requirements.txt
├── frontend/              # Next.js 15 UI
│   ├── src/app/
│   └── ...
├── train/                 # Dataset training (dari Roboflow)
├── valid/                 # Dataset validasi
├── test/                  # Dataset test
├── data.yaml              # Config dataset YOLOv8
├── setup_env.bat          # Setup otomatis (Windows)
├── setup_env.sh           # Setup otomatis (Linux/Mac)
└── .gitignore
```

---

## ⚡ Quick Start

### 1. Setup Environment (Satu Kali)

**Windows:**
```bat
setup_env.bat
```

**Linux / Mac:**
```bash
bash setup_env.sh
```

### 2. Training Model

```bash
cd ai
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

python train.py
```

### 3. Export Model ke Backend

```bash
python export_model.py
```

### 4. Jalankan Backend API

```bash
cd ../backend
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

python main.py
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### 5. Jalankan Frontend

```bash
cd ../frontend
npm run dev
# → http://localhost:3000
```

---

## 🏷️ Kelas Kendaraan

| ID | Golongan | Deskripsi |
|----|----------|-----------|
| 0  | GOL I    | Motor / Sepeda |
| 1  | GOL II   | Sedan / Minibus / Pick-up |
| 2  | GOL III  | Truk 2 Gandar |
| 3  | GOL IV   | Truk 3 Gandar |
| 4  | GOL V    | Truk 4 Gandar atau lebih |

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/`      | Info API |
| GET    | `/health`| Status server & model |
| GET    | `/classes`| Daftar kelas kendaraan |
| POST   | `/predict`| Upload gambar → hasil deteksi |
| WS     | `/ws/predict` | Live stream frame |

---

## 📊 Dataset

- **Sumber**: [Roboflow Universe](https://universe.roboflow.com/muhammad-rizky-ferdiansyah-00fow/golongan-kendaraan-jalan-tol-lingkar-luar-jakarta-timur/dataset/5)
- **Jumlah**: 1453 gambar (dengan augmentasi)
- **Format**: YOLOv8
- **Resolusi**: 640×640
