"""
Train the pothole model the same way you trained citylens_garbage.

1. Download a labelled pothole dataset in **YOLOv8 format**, e.g. search
   "pothole" on Roboflow Universe (universe.roboflow.com) or Kaggle.
   It should contain data.yaml plus train/ and valid/ folders.
2. Check that data.yaml's class name is "pothole" or "potholes"
   (both map to the Pothole issue in app/config.py).
3. Run:   python training/train_pothole.py path/to/data.yaml
4. Copy runs/detect/citylens_pothole/weights/best.pt to models/citylens_pothole.pt
"""
import sys

from ultralytics import YOLO

data = sys.argv[1] if len(sys.argv) > 1 else "datasets/pothole/data.yaml"
model = YOLO("yolov8n.pt")  # start from COCO weights (transfer learning)
model.train(data=data, epochs=60, imgsz=640, batch=16, name="citylens_pothole", patience=15)
metrics = model.val()
print("mAP50:", metrics.box.map50, "mAP50-95:", metrics.box.map)
