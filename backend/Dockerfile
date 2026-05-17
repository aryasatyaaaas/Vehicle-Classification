FROM python:3.11-slim

WORKDIR /app

# Install system dependencies untuk OpenCV + EasyOCR
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements dan install Python deps (CPU-only untuk VM tanpa GPU)
COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

# Copy source code
COPY main.py plate_ocr.py run_server.py ./

# Copy model YOLOv8 (best.pt harus ada di folder models/)
COPY models/ ./models/

# Pre-download EasyOCR models saat build agar tidak download saat runtime
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)" || true

# Port FastAPI
EXPOSE 8000

# Jalankan via run_server.py (no reload, production mode)
CMD ["python", "run_server.py"]
