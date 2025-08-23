from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import base64
import mediapipe as mp

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your frontend URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

class FrameData(BaseModel):
    frame: str

@app.post("/process_frame")
async def process_frame(data: FrameData):
    try:
        # Decode base64
        img_str = data.frame.split(",")[1]
        img_bytes = base64.b64decode(img_str)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Run face mesh
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        engagement = {
            "face_detected": results.multi_face_landmarks is not None,
            "eyes_open": False,
            "engaged": False
        }

        if results.multi_face_landmarks:
            engagement["engaged"] = True
            engagement["eyes_open"] = True  # (basic, improve later)

        return {"status": "ok", "engagement": engagement}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
