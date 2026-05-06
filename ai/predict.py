"""
YOLOv8 Prediction Script - Klasifikasi Kendaraan Tol
"""

import argparse
import os
from ultralytics import YOLO
from PIL import Image
import cv2

# Path default ke model terbaik hasil training
DEFAULT_MODEL = os.path.join(
    os.path.dirname(__file__), "runs", "vehicle_cls_v1", "weights", "best.pt"
)

CLASS_NAMES = {
    0: "GOL I   (Motor/Sepeda)",
    1: "GOL II  (Sedan/Minibus/Pick-up)",
    2: "GOL III (Truk 2 Gandar)",
    3: "GOL IV  (Truk 3 Gandar)",
    4: "GOL V   (Truk 4+ Gandar)",
}


def predict_image(model_path: str, image_path: str, conf: float = 0.25, save: bool = True):
    model = YOLO(model_path)
    results = model.predict(
        source=image_path,
        conf=conf,
        save=save,
        show_labels=True,
        show_conf=True,
        line_width=2,
    )

    print(f"\n🔍 Prediksi untuk: {image_path}")
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls)
            conf_val = float(box.conf)
            label = CLASS_NAMES.get(cls_id, f"Class {cls_id}")
            print(f"  ✅ {label} — Confidence: {conf_val:.2%}")

    return results


def predict_video(model_path: str, video_path: str, conf: float = 0.25):
    model = YOLO(model_path)
    results = model.predict(
        source=video_path,
        conf=conf,
        save=True,
        stream=True,
    )
    for r in results:
        pass  # iterasi frame
    print(f"\n✅ Video prediksi selesai. Output disimpan di runs/predict/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vehicle Classification Prediction")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Path ke model .pt")
    parser.add_argument("--source", type=str, required=True, help="Path gambar/video/0 untuk webcam")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    args = parser.parse_args()

    predict_image(args.model, args.source, args.conf)
