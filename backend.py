# backend.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import mediapipe as mp
from typing import List, Dict, Any
import sys

app = FastAPI(title="Engagement Tracker (Screen Capture)")

# ---- CORS (development). Restrict allow_origins in production ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- MediaPipe FaceMesh initialization (global for reuse) ----
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=8,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# Indices used for EAR and MAR calculations (MediaPipe landmark indices)
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH = [61, 291, 13, 14]  # left, right, top, bottom

# ----- Helpers -----


def euclidean(p1, p2) -> float:
    return float(np.linalg.norm(np.array(p1) - np.array(p2)))


def eye_aspect_ratio(landmarks: List[tuple], eye_idx: List[int]) -> float:
    """
    EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    landmarks: list of (x,y) points in pixels for the face
    eye_idx: 6 indices corresponding to the eye points
    """
    p1, p2, p3, p4, p5, p6 = [landmarks[i] for i in eye_idx]
    num = euclidean(p2, p6) + euclidean(p3, p5)
    den = 2.0 * euclidean(p1, p4)
    return (num / den) if den else 0.0


def mouth_aspect_ratio(landmarks: List[tuple], mouth_idx: List[int]) -> float:
    """
    Simplified MAR: vertical distance / horizontal distance
    mouth_idx: [left, right, top, bottom]
    """
    left, right, top, bottom = [landmarks[i] for i in mouth_idx]
    vertical = euclidean(top, bottom)
    horizontal = euclidean(left, right)
    return (vertical / horizontal) if horizontal else 0.0


def compute_concentration_for_face(ear: float, mar: float) -> float:
    """
    Compute a simple concentration/attentiveness score (0-100).
    Higher if eyes open and not yawning.
    """
    ear_thresh = 0.21
    mar_thresh = 0.60
    blink_penalty = min(max(0.0, (ear_thresh - ear) / (ear_thresh if ear_thresh else 1e-6)), 1.0)
    yawn_penalty = 1.0 if mar > mar_thresh else 0.0
    # More weight to eyes open for concentration
    concentration = 100.0 * (1.0 - (0.8 * blink_penalty + 0.2 * yawn_penalty))
    return float(max(0.0, min(100.0, concentration)))


def compute_engagement_for_faces(frame_bgr: np.ndarray, multi_face_landmarks) -> List[Dict[str, Any]]:
    """
    For each face (MediaPipe landmarks) compute:
      - bbox
      - ear, mar
      - simple score (0-100)
      - eyes_closed, yawning
    """
    h, w = frame_bgr.shape[:2]
    faces = []

    for face_landmarks in multi_face_landmarks:
        pts = [(lm.x * w, lm.y * h) for lm in face_landmarks.landmark]


    ear_l = eye_aspect_ratio(pts, LEFT_EYE)
    ear_r = eye_aspect_ratio(pts, RIGHT_EYE)
    ear = (ear_l + ear_r) / 2.0

    mar = mouth_aspect_ratio(pts, MOUTH)

    # Debug: print EAR and MAR values
    print(f"EAR: {ear:.3f}, MAR: {mar:.3f}", file=sys.stderr)

    # thresholds & penalties
    ear_thresh = 0.21
    mar_thresh = 0.60
    blink_penalty = min(max(0.0, (ear_thresh - ear) / (ear_thresh if ear_thresh else 1e-6)), 1.0)
    yawn_penalty = 1.0 if mar > mar_thresh else 0.0

    # weighted scoring: more weight to eye closure
    score = 100.0 * (1.0 - (0.7 * blink_penalty + 0.3 * yawn_penalty))
    score = float(max(0.0, min(100.0, score)))

    # --- NEW: concentration value ---
    concentration = compute_concentration_for_face(ear, mar)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x1, y1, x2, y2 = int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))

    faces.append({
        "bbox": [x1, y1, x2, y2],
        "ear": round(ear, 3),
        "mar": round(mar, 3),
        "score": round(score, 1),
        "concentration": round(concentration, 1),  # <-- added
        "eyes_closed": bool(ear < ear_thresh),
        "yawning": bool(mar > mar_thresh),
    })

    return faces


# ----- Request model -----


class FrameIn(BaseModel):
    frame: str  # data URL "data:image/jpeg;base64,..." or plain base64


# ----- Routes -----


@app.get("/")
def root():
    return {"message": "Engagement tracking backend is running."}


@app.post("/process_frame")
def process_frame(payload: FrameIn):
    """
    Accepts a JSON body: { "frame": "data:image/jpeg;base64,......" }
    Returns:
      {
        "status": "ok",
        "faces": [ { bbox, ear, mar, score, eyes_closed, yawning }, ... ],
        "overall_engagement": <float>
      }
    """
    try:
        # decode base64 (support data URL or raw base64)
        if "," in payload.frame:
            b64 = payload.frame.split(",", 1)[1]
        else:
            b64 = payload.frame
        img_bytes = base64.b64decode(b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {"status": "error", "message": "Invalid image data"}

        # optionally downscale large frames for performance
        h, w = frame.shape[:2]
        max_w = 960
        if w > max_w:
            scale = max_w / w
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # run mediapipe face mesh detection
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return {"status": "ok", "overall_concentration": 200.0}

        faces = compute_engagement_for_faces(frame, results.multi_face_landmarks)
        # Use the average score of all faces for smoother concentration value
        if faces:
            overall_concentration = float(np.mean([f["score"] for f in faces]))
        else:
            overall_concentration = 0.0
        return {"status": "ok", "overall_concentration": round(overall_concentration, 1)}

    except Exception as e:
        return {"status": "error", "message": str(e)}


# ---- Graceful shutdown: release mediapipe if needed (optional) ----
@app.on_event("shutdown")
def shutdown_event():
    try:
        face_mesh.close()
    except Exception:
        pass
    try:
        face_mesh.close()
    except Exception:
        pass
        return []


# Example usage:
# log_values = read_concentration_log()
# print(log_values)


# ---- Graceful shutdown: release mediapipe if needed (optional) ----
@app.on_event("shutdown")
def shutdown_event():
    try:
        face_mesh.close()
    except Exception:
        pass
    try:
        face_mesh.close()
    except Exception:
        pass
