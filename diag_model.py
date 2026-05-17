import sys, os, glob
sys.path.insert(0, '.')

from ultralytics import YOLO
import cv2, numpy as np

model = YOLO('backend/models/best.pt')
print(f"Names: {model.names}")

# Test on training images at various confidence levels
train_imgs = glob.glob('train/images/*.jpg')[:5]
print(f"\nTesting on {len(train_imgs)} training images:\n")

for img_path in train_imgs:
    img = cv2.imread(img_path)
    h, w = img.shape[:2]
    for conf in [0.01, 0.05, 0.1, 0.25]:
        r = model.predict(img, conf=conf, verbose=False)
        dets = r[0].boxes
        if len(dets) > 0:
            cls_ids = [int(b.cls) for b in dets]
            confs   = [round(float(b.conf), 3) for b in dets]
            print(f"  [{os.path.basename(img_path)[:20]}] conf>={conf}: {len(dets)} det → classes={cls_ids} confs={confs}")
            break
    else:
        print(f"  [{os.path.basename(img_path)[:20]}] NO detection even @ conf=0.01 !")

print("\n-- Test with live-like resized frame --")
# Simulate webcam frame: resize to 640x480 JPEG encode-decode
img_test = cv2.imread(train_imgs[0])
img_small = cv2.resize(img_test, (640, 480))

# Simulate JPEG compression (like canvas.toBlob with quality=0.9)
_, buf = cv2.imencode('.jpg', img_small, [cv2.IMWRITE_JPEG_QUALITY, 90])
img_decoded = cv2.imdecode(np.frombuffer(buf, np.uint8), cv2.IMREAD_COLOR)

for conf in [0.01, 0.05, 0.15, 0.25]:
    r = model.predict(img_decoded, conf=conf, verbose=False)
    print(f"  JPEG-resized @ conf={conf}: {len(r[0].boxes)} detections")
