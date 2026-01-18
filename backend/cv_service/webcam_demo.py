"""
Driver Monitoring System - Real-Time Webcam Demo
================================================
Uses YOLOv8 + MediaPipe FaceLandmarker (Tasks API) to detect:
- Drowsiness (Eye Aspect Ratio)
- Yawning (Mouth openness)
- Distraction (Head pose)
- Phone usage (YOLO detection)

Press 'Q' to quit.
"""

import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from datetime import datetime
import time
from collections import deque
import urllib.request
import os

# ============================================================================
# Configuration
# ============================================================================

CONFIG = {
    # Eye Aspect Ratio (EAR) thresholds
    "EAR_THRESHOLD": 0.21,           # Below this = eyes closed
    "EAR_CONSEC_FRAMES": 15,         # Frames to trigger drowsiness alert
    
    # Mouth openness (yawning)
    "YAWN_THRESHOLD": 0.6,           # Mouth aspect ratio for yawn
    "YAWN_CONSEC_FRAMES": 10,
    
    # Head pose thresholds (degrees)
    "HEAD_YAW_THRESHOLD": 30,        # Looking left/right
    "HEAD_PITCH_THRESHOLD": 25,      # Looking up/down
    
    # Phone detection
    "PHONE_CONFIDENCE": 0.5,
    
    # Display
    "WINDOW_NAME": "Driver Monitoring System",
    "FPS_SMOOTHING": 10,
    
    # Model path
    "FACE_LANDMARKER_MODEL": "face_landmarker_v2_with_blendshapes.task"
}

# MediaPipe Face Landmark indices
# Left eye landmarks (for EAR calculation)
LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
# Right eye landmarks (for EAR calculation)  
RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
# Mouth landmarks
UPPER_LIP = 13
LOWER_LIP = 14
LEFT_MOUTH = 61
RIGHT_MOUTH = 291

# ============================================================================
# Helper Functions
# ============================================================================

def download_model(model_path):
    """Download MediaPipe face landmarker model if not exists"""
    if os.path.exists(model_path):
        return True
    
    url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    print(f"Downloading MediaPipe Face Landmarker model...")
    try:
        urllib.request.urlretrieve(url, model_path)
        print("Model downloaded successfully!")
        return True
    except Exception as e:
        print(f"Error downloading model: {e}")
        return False

def calculate_ear(landmarks, eye_indices, frame_w, frame_h):
    """Calculate Eye Aspect Ratio"""
    def get_point(idx):
        lm = landmarks[idx]
        return np.array([lm.x * frame_w, lm.y * frame_h])
    
    # Get eye points
    p1 = get_point(eye_indices[0])
    p2 = get_point(eye_indices[1])
    p3 = get_point(eye_indices[2])
    p4 = get_point(eye_indices[3])
    p5 = get_point(eye_indices[4])
    p6 = get_point(eye_indices[5])
    
    # EAR formula
    vertical_1 = np.linalg.norm(p2 - p6)
    vertical_2 = np.linalg.norm(p3 - p5)
    horizontal = np.linalg.norm(p1 - p4)
    
    if horizontal == 0:
        return 0.3  # Default open eye value
    
    ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
    return ear

def calculate_mar(landmarks, frame_w, frame_h):
    """Calculate Mouth Aspect Ratio (for yawn detection)"""
    def get_point(idx):
        lm = landmarks[idx]
        return np.array([lm.x * frame_w, lm.y * frame_h])
    
    # Mouth corners and top/bottom
    left = get_point(LEFT_MOUTH)
    right = get_point(RIGHT_MOUTH)
    top = get_point(UPPER_LIP)
    bottom = get_point(LOWER_LIP)
    
    horizontal = np.linalg.norm(left - right)
    vertical = np.linalg.norm(top - bottom)
    
    if horizontal == 0:
        return 0
    
    mar = vertical / horizontal
    return mar

def estimate_head_pose(landmarks, frame_w, frame_h):
    """Estimate head pose using key facial landmarks"""
    def get_point(idx):
        lm = landmarks[idx]
        return np.array([lm.x * frame_w, lm.y * frame_h, lm.z * frame_w])
    
    # Key points for pose estimation
    nose = get_point(1)
    left_eye = get_point(33)
    right_eye = get_point(263)
    
    # Simple yaw calculation based on eye positions
    eye_center_x = (left_eye[0] + right_eye[0]) / 2
    nose_offset = nose[0] - eye_center_x
    face_width = abs(right_eye[0] - left_eye[0])
    
    if face_width > 0:
        yaw = (nose_offset / face_width) * 60  # Approximate degrees
    else:
        yaw = 0
    
    # Pitch from z-depth
    pitch = nose[2] * 45 if len(nose) > 2 else 0
    
    return {"yaw": yaw, "pitch": pitch}

def draw_eye_contours(frame, landmarks, frame_w, frame_h):
    """Draw eye contours"""
    def draw_eye(indices, color):
        points = []
        for idx in indices:
            lm = landmarks[idx]
            x, y = int(lm.x * frame_w), int(lm.y * frame_h)
            points.append((x, y))
        points = np.array(points, dtype=np.int32)
        cv2.polylines(frame, [points], True, color, 1)
    
    draw_eye(LEFT_EYE_INDICES, (0, 255, 255))
    draw_eye(RIGHT_EYE_INDICES, (0, 255, 255))

# ============================================================================
# Main Demo Class
# ============================================================================

class DriverMonitoringDemo:
    def __init__(self):
        print("Initializing Driver Monitoring System...")
        
        # Load YOLOv8
        print("Loading YOLOv8 model...")
        self.yolo = YOLO("yolov8n.pt")
        
        # Download and initialize MediaPipe Face Landmarker
        print("Loading MediaPipe Face Landmarker...")
        model_path = CONFIG["FACE_LANDMARKER_MODEL"]
        
        if not download_model(model_path):
            print("WARNING: Could not download face landmarker model. Facial analysis disabled.")
            self.face_landmarker = None
        else:
            # Create face landmarker using Tasks API
            base_options = mp_python.BaseOptions(model_asset_path=model_path)
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
            self.face_landmarker = vision.FaceLandmarker.create_from_options(options)
        
        # State tracking
        self.drowsy_frames = 0
        self.yawn_frames = 0
        self.fps_buffer = deque(maxlen=CONFIG["FPS_SMOOTHING"])
        self.alert_history = []
        
        # Alert states
        self.is_drowsy = False
        self.is_yawning = False
        self.is_distracted = False
        self.phone_detected = False
        
        print("System ready!")
    
    def process_frame(self, frame):
        """Process a single frame"""
        start_time = time.time()
        
        h, w = frame.shape[:2]
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Reset alerts
        alerts = []
        self.phone_detected = False
        
        # ===== YOLO Detection =====
        yolo_results = self.yolo(frame, verbose=False, classes=[0, 67])  # person, cell phone
        
        for r in yolo_results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                if cls_id == 67 and conf > CONFIG["PHONE_CONFIDENCE"]:  # Cell phone
                    self.phone_detected = True
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(frame, f"PHONE {conf:.1%}", (x1, y1-10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                    alerts.append("PHONE DETECTED!")
                    
                elif cls_id == 0:  # Person
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
        
        # ===== MediaPipe Face Landmarker =====
        if self.face_landmarker is not None:
            # Convert to MediaPipe Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            # Detect face landmarks
            result = self.face_landmarker.detect(mp_image)
            
            if result.face_landmarks and len(result.face_landmarks) > 0:
                face_landmarks = result.face_landmarks[0]
                
                # Draw eye contours
                draw_eye_contours(frame, face_landmarks, w, h)
                
                # Calculate EAR (Eye Aspect Ratio)
                left_ear = calculate_ear(face_landmarks, LEFT_EYE_INDICES, w, h)
                right_ear = calculate_ear(face_landmarks, RIGHT_EYE_INDICES, w, h)
                avg_ear = (left_ear + right_ear) / 2
                
                # Drowsiness detection
                if avg_ear < CONFIG["EAR_THRESHOLD"]:
                    self.drowsy_frames += 1
                    if self.drowsy_frames >= CONFIG["EAR_CONSEC_FRAMES"]:
                        self.is_drowsy = True
                        alerts.append("DROWSINESS ALERT!")
                else:
                    self.drowsy_frames = 0
                    self.is_drowsy = False
                
                # Calculate MAR (Mouth Aspect Ratio) for yawning
                mar = calculate_mar(face_landmarks, w, h)
                
                if mar > CONFIG["YAWN_THRESHOLD"]:
                    self.yawn_frames += 1
                    if self.yawn_frames >= CONFIG["YAWN_CONSEC_FRAMES"]:
                        self.is_yawning = True
                        alerts.append("YAWNING DETECTED!")
                else:
                    self.yawn_frames = 0
                    self.is_yawning = False
                
                # Head pose estimation
                head_pose = estimate_head_pose(face_landmarks, w, h)
                
                if abs(head_pose["yaw"]) > CONFIG["HEAD_YAW_THRESHOLD"]:
                    self.is_distracted = True
                    direction = "LEFT" if head_pose["yaw"] < 0 else "RIGHT"
                    alerts.append(f"LOOKING {direction}!")
                else:
                    self.is_distracted = False
                
                # Draw metrics on frame
                y_offset = 30
                cv2.putText(frame, f"EAR: {avg_ear:.2f}", (10, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                y_offset += 25
                cv2.putText(frame, f"MAR: {mar:.2f}", (10, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                y_offset += 25
                cv2.putText(frame, f"Yaw: {head_pose['yaw']:.1f}°", (10, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
            else:
                # No face detected
                cv2.putText(frame, "NO FACE DETECTED", (w//2 - 100, h//2),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                alerts.append("DRIVER NOT VISIBLE!")
        
        # Calculate FPS
        fps = 1.0 / (time.time() - start_time + 0.001)
        self.fps_buffer.append(fps)
        avg_fps = sum(self.fps_buffer) / len(self.fps_buffer)
        
        # Draw status bar
        self.draw_status_bar(frame, alerts, avg_fps)
        
        return frame, alerts
    
    def draw_status_bar(self, frame, alerts, fps):
        """Draw status bar with alerts"""
        h, w = frame.shape[:2]
        
        # Status bar background
        cv2.rectangle(frame, (0, h-80), (w, h), (40, 40, 40), -1)
        
        # FPS
        cv2.putText(frame, f"FPS: {fps:.1f}", (10, h-55),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        
        # Alert indicators
        x_offset = 150
        indicators = [
            ("DROWSY", self.is_drowsy, (0, 0, 255)),
            ("YAWN", self.is_yawning, (0, 165, 255)),
            ("DISTRACTED", self.is_distracted, (0, 255, 255)),
            ("PHONE", self.phone_detected, (255, 0, 255)),
        ]
        
        for label, active, color in indicators:
            bg_color = color if active else (80, 80, 80)
            text_color = (255, 255, 255) if active else (150, 150, 150)
            
            cv2.rectangle(frame, (x_offset, h-70), (x_offset+80, h-40), bg_color, -1)
            cv2.putText(frame, label, (x_offset+5, h-50),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, text_color, 1)
            x_offset += 90
        
        # Scrolling alert text
        if alerts:
            alert_text = " | ".join(alerts)
            cv2.putText(frame, alert_text, (10, h-15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        else:
            cv2.putText(frame, "Status: Normal", (10, h-15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    
    def run(self):
        """Run the webcam demo"""
        print("\nStarting webcam capture...")
        print("Press 'Q' to quit\n")
        
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("ERROR: Could not open webcam!")
            return
        
        # Set resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame")
                break
            
            # Mirror the frame for natural interaction
            frame = cv2.flip(frame, 1)
            
            # Process frame
            processed_frame, alerts = self.process_frame(frame)
            
            # Show frame
            cv2.imshow(CONFIG["WINDOW_NAME"], processed_frame)
            
            # Print alerts to console
            if alerts:
                for alert in alerts:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️  {alert}")
            
            # Check for quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        print("\nDriver monitoring stopped.")

# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  DRIVER MONITORING SYSTEM - WEBCAM DEMO")
    print("=" * 60)
    print()
    
    demo = DriverMonitoringDemo()
    demo.run()
