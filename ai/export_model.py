"""
Export YOLOv8 model ke format ONNX untuk deployment backend
"""

import os
from ultralytics import YOLO

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "runs", "vehicle_cls_v1", "weights", "best.pt"
)
EXPORT_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "models")

def export_onnx():
    model = YOLO(MODEL_PATH)

    # Export ke ONNX
    export_path = model.export(format="onnx", imgsz=640, opset=12)
    print(f"✅ Model exported ke: {export_path}")

    # Salin ke folder backend/models
    os.makedirs(EXPORT_DIR, exist_ok=True)
    import shutil
    dest = os.path.join(EXPORT_DIR, "best.onnx")
    shutil.copy(export_path, dest)
    print(f"📦 Disalin ke: {dest}")

    # Juga salin best.pt langsung
    dest_pt = os.path.join(EXPORT_DIR, "best.pt")
    shutil.copy(MODEL_PATH, dest_pt)
    print(f"📦 Disalin ke: {dest_pt}")


if __name__ == "__main__":
    export_onnx()
