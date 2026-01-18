"""
CV Service - YOLOv8 + MediaPipe Inference Server
Runs on port 5000, receives frames via HTTP, returns detections

Updated to use MediaPipe Tasks API (new approach)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import base64
import logging
from datetime import datetime
import os
import urllib.request

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Model paths
FACE_LANDMARKER_MODEL = "face_landmarker_v2_with_blendshapes.task"

def download_model(model_path):
    """Download MediaPipe face landmarker model if not exists"""
    if os.path.exists(model_path):
        return True
    
    url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    logger.info(f"Downloading MediaPipe Face Landmarker model...")
    try:
        urllib.request.urlretrieve(url, model_path)
        logger.info("Model downloaded successfully!")
        return True
    except Exception as e:
        logger.error(f"Error downloading model: {e}")
        return False

# Load models on startup
logger.info("Loading YOLOv8 model...")
yolo_model = YOLO("yolov8n.pt")  # Nano model (fast)

logger.info("Loading MediaPipe Face Landmarker (Tasks API)...")
face_landmarker = None

if download_model(FACE_LANDMARKER_MODEL):
    try:
        base_options = mp_python.BaseOptions(model_asset_path=FACE_LANDMARKER_MODEL)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False
        )
        face_landmarker = vision.FaceLandmarker.create_from_options(options)
        logger.info("MediaPipe Face Landmarker loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load Face Landmarker: {e}")
        face_landmarker = None
else:
    logger.warning("Could not download face landmarker model. Facial analysis disabled.")

logger.info("CV Service ready!")

# ============================================================================
# YOLO Detection
# ============================================================================

@app.route('/detect', methods=['POST'])
def detect():
    """
    Receive frame, run YOLOv8 detection
    
    Request:
    {
        "frame": "base64_encoded_image"
    }
    
    Response:
    {
        "detections": [
            {"class": "person", "bbox": [x, y, w, h], "confidence": 0.95},
            {"class": "cell phone", "bbox": [x, y, w, h], "confidence": 0.87}
        ],
        "processing_time_ms": 75
    }
    """
    try:
        data = request.json
        frame_b64 = data.get('frame')
        
        if not frame_b64:
            return jsonify({"error": "No frame provided"}), 400
        
        # Decode frame
        frame_data = base64.b64decode(frame_b64)
        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({"error": "Invalid frame"}), 400
        
        start_time = datetime.now()
        
        # Run YOLO inference
        results = yolo_model(frame, verbose=False)
        
        # Parse detections
        detections = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0]
                
                # Class names mapping
                class_names = {
                    0: "person",
                    67: "cell phone",  # COCO class ID for cell phone
                }
                
                class_name = class_names.get(cls_id, f"class_{cls_id}")
                
                detections.append({
                    "class": class_name,
                    "class_id": cls_id,
                    "bbox": [
                        float(x1),
                        float(y1),
                        float(x2 - x1),  # width
                        float(y2 - y1)   # height
                    ],
                    "confidence": conf
                })
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return jsonify({
            "detections": detections,
            "processing_time_ms": processing_time,
            "frame_size": list(frame.shape)
        })
    
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# MediaPipe Face Landmarks (Tasks API)
# ============================================================================

@app.route('/landmarks', methods=['POST'])
def get_landmarks():
    """
    Extract 468 facial landmarks using MediaPipe Tasks API
    
    Request:
    {
        "frame": "base64_encoded_image"
    }
    
    Response:
    {
        "landmarks": [
            {"x": 0.5, "y": 0.3, "z": 0.0},
            ...
        ],
        "detected": true,
        "num_landmarks": 468,
        "processing_time_ms": 18
    }
    """
    try:
        if face_landmarker is None:
            return jsonify({"error": "Face landmarker not available"}), 503
        
        data = request.json
        frame_b64 = data.get('frame')
        
        if not frame_b64:
            return jsonify({"error": "No frame provided"}), 400
        
        # Decode frame
        frame_data = base64.b64decode(frame_b64)
        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({"error": "Invalid frame"}), 400
        
        start_time = datetime.now()
        
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Create MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Run detection
        result = face_landmarker.detect(mp_image)
        
        landmarks = []
        detected = False
        
        if result.face_landmarks and len(result.face_landmarks) > 0:
            detected = True
            face_landmarks = result.face_landmarks[0]
            
            for landmark in face_landmarks:
                landmarks.append({
                    "x": float(landmark.x),
                    "y": float(landmark.y),
                    "z": float(landmark.z)
                })
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return jsonify({
            "detected": detected,
            "landmarks": landmarks,
            "num_landmarks": len(landmarks),
            "processing_time_ms": processing_time
        })
    
    except Exception as e:
        logger.error(f"Landmarks error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# Combined Inference (Detection + Landmarks)
# ============================================================================

@app.route('/infer', methods=['POST'])
def full_inference():
    """
    Full inference: YOLO detection + MediaPipe landmarks
    
    Request:
    {
        "frame": "base64_encoded_image"
    }
    
    Response:
    {
        "detections": [...],
        "landmarks": [...],
        "face_detected": true,
        "timing": {"yolo_ms": 30, "mediapipe_ms": 15, "total_ms": 45}
    }
    """
    try:
        data = request.json
        frame_b64 = data.get('frame')
        
        if not frame_b64:
            return jsonify({"error": "No frame provided"}), 400
        
        # Decode frame once
        frame_data = base64.b64decode(frame_b64)
        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({"error": "Invalid frame"}), 400
        
        total_start = datetime.now()
        
        # --- YOLOv8 Detection ---
        start_yolo = datetime.now()
        results = yolo_model(frame, verbose=False)
        
        detections = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0]
                
                class_names = {
                    0: "person",
                    67: "cell phone",
                }
                
                class_name = class_names.get(cls_id, f"class_{cls_id}")
                
                detections.append({
                    "class": class_name,
                    "bbox": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                    "confidence": conf
                })
        
        yolo_time = (datetime.now() - start_yolo).total_seconds() * 1000
        
        # --- MediaPipe Landmarks (Tasks API) ---
        landmarks = []
        face_detected = False
        mp_time = 0
        
        if face_landmarker is not None:
            start_mp = datetime.now()
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            result = face_landmarker.detect(mp_image)
            
            if result.face_landmarks and len(result.face_landmarks) > 0:
                face_detected = True
                face_landmarks = result.face_landmarks[0]
                
                for landmark in face_landmarks:
                    landmarks.append({
                        "x": float(landmark.x),
                        "y": float(landmark.y),
                        "z": float(landmark.z)
                    })
            
            mp_time = (datetime.now() - start_mp).total_seconds() * 1000
        
        total_time = (datetime.now() - total_start).total_seconds() * 1000
        
        return jsonify({
            "detections": detections,
            "landmarks": landmarks,
            "face_detected": face_detected,
            "timing": {
                "yolo_ms": yolo_time,
                "mediapipe_ms": mp_time,
                "total_ms": total_time
            }
        })
    
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# Health Check
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    models = ["YOLOv8n"]
    if face_landmarker is not None:
        models.append("MediaPipe FaceLandmarker")
    
    return jsonify({
        "status": "healthy",
        "service": "CV Service",
        "models": models,
        "timestamp": datetime.now().isoformat()
    })


if __name__ == '__main__':
    # Run on localhost:5000
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )

