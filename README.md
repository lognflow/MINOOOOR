# EyeBase: Hands-Free Computer Control

EyeBase is an assistive-technology system designed to allow physically challenged users to operate a computer without using their hands. 

The system maps facial features and head movements to standard mouse inputs with real-time computer vision, homography perspective calibration, adaptive jitter filtering, and a modern interactive web dashboard.

---

## 🎯 How It Works

The system integrates real-time MediaPipe face landmarks, OpenCV video processing, and PyAutoGUI to deliver responsive, intuitive hands-free interaction:

- **Head Movement → Cursor Movement:** Maps nose and eyebrow landmarks through a calibrated 3×3 Homography Matrix directly to screen coordinates.
- **True Fullscreen 9-Point Calibration:** Calibrates across 100% of your physical display to compute the exact perspective homography matrix.
- **1-Euro Adaptive Filter:** Eliminates micro-jitters at slow speeds while remaining lag-free during quick head movements.
- **Stillness Lock:** Automatically freezes the cursor in place when the head is steady, making it easy to click and read without drifting.
- **Intentional Blink (0.55s) → Left Click:** Measures Eye Aspect Ratio across both eyes (EAR < 0.165). Freezes cursor anchor during the hold to eliminate eyelid closure drift and prevents natural blinks with a 1.0s cooldown.
- **Mouth Opening (0.2s) → Scroll Mode Toggle:** Measures Mouth Aspect Ratio (MAR > 0.55). Opening the mouth toggles between **MOVE** mode and **SCROLL** mode.
- **Head Tilt in Scroll Mode:** While in scroll mode, tilting your head up or down smoothly scrolls documents and web pages.

---

## 🏗️ Architecture & Integration

```
┌────────────────────────────────────────────────────────┐
│                   EyeBase React UI                     │
│  (Dashboard, Mouse Control, Calibration, Camera, ...)  │
└───────────▲───────────────────────────────┬────────────┘
            │ 30Hz WebSocket                │ REST Commands
            │ Telemetry & State             │ (Start/Stop/Settings)
┌───────────┴───────────────────────────────▼────────────┐
│              EyeBase FastAPI / Uvicorn Server          │
│                (eye-controlled-mouse/server.py)        │
├────────────────────────────────────────────────────────┤
│                 EyeEngine Pipeline                     │
│  - Threaded OpenCV Webcam Capture                      │
│  - MediaPipe FaceLandmarker Tasks (face_landmarker.task)│
│  - 9-Point Homography Perspective Calibration          │
│  - One-Euro Adaptive Filter & Stillness Lock           │
│  - EAR (Blink Click) & MAR (Scroll Mode) Detection     │
│  - PyAutoGUI OS Mouse Controller                       │
│  - Low-Latency MJPEG Annotated Video Feed (/video_feed) │
└────────────────────────────────────────────────────────┘
```

---

## 💻 System Requirements

- **OS:** Windows 10/11, macOS, or Linux
- **Python:** 3.10 or higher
- **Node.js:** v16.0.0 or higher
- **Webcam:** Any standard USB or integrated webcam

### Python Dependencies
All required packages are listed in `eye-controlled-mouse/requirements.txt`:
```bash
pip install opencv-python mediapipe numpy pyautogui fastapi uvicorn websockets
```

---

## 🚀 How to Run

### Method 1: One-Command Unified Launcher (Recommended)
From the repository root:
```bash
python run.py
```
*(On Windows, you can also simply double-click `start.bat`)*

This starts both:
1. **Python Eye Tracking Backend:** `http://127.0.0.1:8000`
2. **React Frontend Dev Server:** `http://localhost:5173`

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Method 2: Running Components Separately

#### 1. Start the Python Backend:
```bash
python eye-controlled-mouse/server.py
```
*(Or `python backend/server.py`)*

#### 2. Start the Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

---

### Method 3: Standalone OpenCV Window Mode
To run the pure OpenCV desktop window without the web browser:
```bash
python eye-controlled-mouse/eye_cursor.py
```

---

## ⌨️ Hotkeys & Safety Controls

| Hotkey | Action |
|---|---|
| **ESC** | **Emergency Stop:** Instantly halts mouse movement and tracking |
| **P** | **Pause / Resume:** Toggles tracking on and off |
| **R** | **Recalibrate:** Re-runs 9-point perspective calibration |
| **Mouth Open (0.2s)** | Toggles **MOVE** mode ↔ **SCROLL** mode |
| **Blink (0.55s)** | Triggers Left Click at locked anchor position |

---

## 📁 Repository Structure

```
minor-project1/
├── eye-controlled-mouse/       # Python CV Tracking Engine & Server
│   ├── eye_engine.py          # Modular core tracking pipeline & algorithms
│   ├── eye_cursor.py          # Standalone desktop OpenCV app
│   ├── server.py              # FastAPI server with WebSockets & MJPEG
│   ├── face_landmarker.task   # MediaPipe face landmarks model
│   ├── calibration_head.npy   # Saved 3x3 homography perspective matrix
│   └── requirements.txt       # Python dependencies
├── backend/
│   └── server.py              # Backend entrypoint alias
├── frontend/                  # React + Vite Interactive Web UI
│   ├── src/
│   │   ├── context/
│   │   │   └── EyeMouseContext.jsx  # Central WebSocket & telemetry context
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Central control hub with live video feed
│   │   │   ├── MouseControl.jsx     # Interactive gesture explanation & status
│   │   │   ├── Calibration.jsx      # 9-point interactive perspective calibration
│   │   │   ├── CameraPage.jsx       # Camera feed & diagnostic overlay toggles
│   │   │   ├── Settings.jsx         # Live tuning sliders (speed, thresholds)
│   │   │   ├── Monitoring.jsx       # Real-time metrics & cursor trajectory plot
│   │   │   ├── Help.jsx             # User manual & troubleshooting guide
│   │   │   └── Welcome.jsx          # Getting started landing page
│   │   ├── components/
│   │   │   ├── Header.jsx           # Live status badge & mode switch
│   │   │   └── Sidebar.jsx          # Persistent navigation
│   │   └── index.css                # Polished design system
│   ├── package.json
│   └── vite.config.js          # Proxies /api, /video_feed, /ws to backend
├── run.py                     # Unified launcher for both backend and frontend
├── start.bat                  # Windows one-click batch launcher
└── README.md
```
