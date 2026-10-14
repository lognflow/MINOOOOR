# EyeBase: Hands-Free Computer Control

> **Assistive computer control system powered by real-time computer vision, homography perspective calibration, adaptive jitter filtering, and a modern local web dashboard.**  
> Designed to enable physically challenged individuals and accessibility users to control their computer cursor, click, and scroll completely hands-free — **100% locally and offline**.

---

## 📑 Table of Contents

- [🎯 System Capabilities](#-system-capabilities)
- [💻 System Requirements](#-system-requirements)
- [🗺️ Complete Setup Roadmap (From Scratch)](#️-complete-setup-roadmap-from-scratch)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Set Up Python Environment](#step-2-set-up-python-environment)
  - [Step 3: Install Frontend Dependencies](#step-3-install-frontend-dependencies)
  - [Step 4: Launch EyeBase](#step-4-launch-eyebase)
- [🎯 Calibration Roadmap (Hotkey: C)](#-calibration-roadmap-hotkey-c)
- [🕹️ Hands-Free Gestures & Control](#️-hands-free-gestures--control)
- [⌨️ Keyboard Shortcuts & Safety](#️-keyboard-shortcuts--safety)
- [🏗️ System Architecture](#️-system-architecture)
- [📁 Repository Structure](#-repository-structure)
- [🔧 Troubleshooting & Common Issues](#-troubleshooting--common-issues)

---

## 🎯 System Capabilities

- **Head-Gaze Tracking → Cursor Motion:** Maps nose tip and eyebrow midpoint landmarks via a calibrated **3×3 Homography Matrix** directly to physical screen coordinates.
- **On-Demand Fullscreen Calibration (<kbd>C</kbd>):** Pressing <kbd>C</kbd> anywhere activates a **3-second fullscreen webcam alignment check** (with 3... 2... 1 countdown and biometric reticle), immediately followed by **9-point true fullscreen perspective calibration**.
- **Adaptive 1-Euro Filter:** Dynamically adjusts cutoff frequencies to eliminate micro-tremors and sensor noise at low speeds while remaining responsive during fast motions.
- **Stillness Lock:** Freezes the cursor when your head is steady (0.2s hold), completely eliminating drift when reading or preparing to click.
- **Intentional Blink → Left Click:** Measures Eye Aspect Ratio (EAR < 0.17) for 0.4s to trigger a left click. Eyelid closure drift is prevented by locking the cursor anchor during hold, and normal eye blinks are ignored with a cooldown.
- **Mouth Opening → Scroll Mode Toggle:** Measures Mouth Aspect Ratio (MAR > 0.55) for 0.2s to smoothly toggle between **MOVE** mode and **SCROLL** mode.
- **Head Tilt in Scroll Mode:** While in scroll mode, tilting your head slightly up or down relative to baseline scrolls documents and web pages.

---

## 💻 System Requirements

Before running the project, verify that your machine meets the following requirements:

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **Operating System** | Windows 10/11, macOS 12+, or Ubuntu 20.04+ | Windows 11 (64-bit) |
| **Python** | Python 3.10 or higher | Python 3.11 |
| **Node.js** | Node.js v18.0.0 or higher | Node.js v20 LTS |
| **Webcam** | 640×480 @ 30 FPS USB or built-in webcam | 720p (1280×720) @ 30 FPS |
| **RAM** | 4 GB | 8 GB or more |

---

## 🗺️ Complete Setup Roadmap (From Scratch)

Follow this step-by-step roadmap when cloning the repository to a new machine:

### Step 1: Clone the Repository

Open your terminal or PowerShell and clone the project:

```bash
git clone https://github.com/your-username/minor-project1.git
cd minor-project1
```

---

### Step 2: Set Up Python Environment

It is recommended to use a Python virtual environment to avoid package conflicts:

#### On Windows (PowerShell / Command Prompt):
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install all backend dependencies
pip install -r requirements.txt
```

#### On macOS / Linux:
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install all backend dependencies
pip install -r requirements.txt
```

> **Note:** The backend dependencies include `opencv-python`, `mediapipe`, `numpy`, `pyautogui`, `fastapi`, `uvicorn`, `websockets`, and `pydantic`.

---

### Step 3: Install Frontend Dependencies

Navigate to the `frontend/` directory and install the required npm packages:

```bash
cd frontend
npm install
cd ..
```

---

### Step 4: Launch EyeBase

You can run EyeBase using any of the following three execution modes:

#### Option A: Unified One-Command Launcher (Recommended)
From the repository root with your virtual environment active:

```bash
python run.py
```
*(On Windows, you can also simply double-click **`start.bat`**)*

This script automatically:
1. Initializes the Python computer-vision backend engine on `http://127.0.0.1:8000`.
2. Starts the Vite React dashboard on `http://localhost:5173`.
3. Opens your default web browser to the EyeBase Dashboard.

---

#### Option B: Running Components in Separate Terminals (For Development / Debugging)

If you prefer to see dedicated terminal logs for backend and frontend:

**Terminal 1 (Backend):**
```bash
# From project root:
python eye-controlled-mouse/server.py
```
*Backend runs on `http://127.0.0.1:8000` with live MJPEG stream at `/video_feed` and telemetry over `/ws`.*

**Terminal 2 (Frontend):**
```bash
# From project root:
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173` with automatic API and WebSocket proxying.*

---

#### Option C: Standalone Native Desktop Window (No Web Browser)

If you want to run the computer vision mouse control directly in a native OpenCV window without the web dashboard:

```bash
python eye-controlled-mouse/eye_cursor.py
```
*(On Windows, double-click **`start_standalone.bat`**)*

---

## 🎯 Calibration Roadmap (Hotkey: C)

EyeBase utilizes a **9-Point Homography Perspective Calibration** that maps head movements to the full physical resolution of your screen:

```
(Top-Left)       (Top-Center)       (Top-Right)
     ●                ●                  ●
     
(Mid-Left)         (Center)          (Mid-Right)
     ●                ●                  ●
     
(Bottom-Left)   (Bottom-Center)    (Bottom-Right)
     ●                ●                  ●
```

### How to Calibrate:
1. With the dashboard open, simply press **<kbd>C</kbd>** on your keyboard (from any page). You can also click the **Calibrate (Press C)** button on the Dashboard or Settings page.
2. **Phase 1 — 3-Second Fullscreen Camera Alignment Check:**
   - The screen expands to true fullscreen with your live camera view.
   - A biometric reticle and a large **3... 2... 1... countdown** will appear.
   - Center your head and sit comfortably facing the webcam (50–70 cm distance).
3. **Phase 2 — 9-Point Target Sampling:**
   - Red Circle (0.6s): Settle your head pointing directly at the red target.
   - Green Circle (1.0s): Hold your head steady while green to record facial landmarks.
   - The dot will automatically cycle through all 9 screen positions.
4. **Phase 3 — Automatic Calculation & Save:**
   - The computed 3×3 perspective matrix is saved locally to `eye-controlled-mouse/calibration_head.npy`.
   - The overlay summarizes your calibration quality and closes automatically.
5. **Cancel Anytime:** Press **<kbd>ESC</kbd>** or click the cancel button to abort.

---

## 🕹️ Hands-Free Gestures & Control

| Gesture | Action | Description |
|---|---|---|
| **Head Movement** | **Cursor Position** | Nose tip + eyebrow center mapped to screen pixels through the calibrated 3×3 matrix. |
| **Blink & Hold (0.4s)** | **Left Click** | Close eyes for 0.4s (EAR < 0.17). Cursor freezes at anchor to prevent eyelid closure drift. |
| **Open Mouth (0.2s)** | **Mode Toggle** | Open mouth (MAR > 0.55) to toggle between **MOVE** mode and **SCROLL** mode. |
| **Head Tilt (in Scroll)** | **Scroll Up / Down** | Tilt head upward to scroll up, or downward to scroll down smoothly. |
| **Head Stillness (0.2s)** | **Stillness Lock** | Automatically locks the cursor in place to eliminate micro-jitters when clicking or reading. |

---

## ⌨️ Keyboard Shortcuts & Safety

| Shortcut | Function | Description |
|---|---|---|
| **<kbd>C</kbd>** | **Start Calibration** | Triggers 3s fullscreen webcam check followed by 9-point calibration. |
| **<kbd>ESC</kbd>** | **Emergency Stop** | Instantly releases cursor control and halts tracking (safety standby). |
| **<kbd>P</kbd>** | **Pause / Resume** | Temporarily suspends or resumes mouse movement. |
| **<kbd>R</kbd>** | **Recalibrate** | Recalibrate prompt in standalone desktop mode (`eye_cursor.py`). |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EyeBase Web Application                         │
│   React 19 • Vite • Lucide Icons • Responsive Glassmorphic Dashboard   │
│   (Dashboard, Mouse Control, Camera Feed, Settings, Monitoring, Help)  │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │ 30Hz WebSocket                 │ REST Commands
                    │ Real-Time Telemetry            │ (Control, Settings)
┌───────────────────┴────────────────────────────────▼───────────────────┐
│                     EyeBase FastAPI Backend Server                     │
│                        (eye-controlled-mouse/server.py)                │
├────────────────────────────────────────────────────────────────────────┤
│                          EyeEngine Core Pipeline                       │
│   • Threaded OpenCV Webcam Ingestion (720p / 30 FPS)                   │
│   • MediaPipe FaceLandmarker Tasks (478 Landmark Mesh)                 │
│   • Fullscreen Gaze Alignment Check (3-Second Live Stream Overlay)     │
│   • 9-Point Perspective Homography (cv2.findHomography)                │
│   • 1-Euro Adaptive Low-Pass Filter (MinCutoff: 0.2, Beta: 1.5)        │
│   • Stillness Lock Hysteresis State Machine (4px Enter / 8px Exit)     │
│   • Eye Aspect Ratio (EAR) Blink Click Detector                        │
│   • Mouth Aspect Ratio (MAR) Scroll Mode Toggle                        │
│   • Native Windows/OS Cursor Dispatcher (ctypes user32 / PyAutoGUI)   │
│   • High-Performance MJPEG Stream Producer (/video_feed)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
minor-project1/
├── eye-controlled-mouse/               # Python Computer Vision Core & API
│   ├── eye_engine.py                  # Core tracking pipeline, homography & filters
│   ├── eye_cursor.py                  # Standalone desktop OpenCV window mode
│   ├── server.py                      # FastAPI server (WebSocket telemetry & MJPEG stream)
│   ├── face_landmarker.task           # MediaPipe float16 face landmark model (auto-downloaded)
│   ├── calibration_head.npy           # Calibrated 3×3 perspective homography matrix
│   └── requirements.txt               # Backend dependencies
├── backend/
│   └── server.py                      # Backend launcher alias
├── frontend/                          # React + Vite Interactive Web Dashboard
│   ├── src/
│   │   ├── context/
│   │   │   └── EyeMouseContext.jsx    # Global WebSocket connection & state management
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Live telemetry, status badges, & quick controls
│   │   │   ├── MouseControl.jsx       # Gesture guides, action visualizer, & manual controls
│   │   │   ├── Calibration.jsx        # 3-second camera check + 9-point fullscreen overlay
│   │   │   ├── CameraPage.jsx         # Live video feed, diagnostics, & overlay toggles
│   │   │   ├── Settings.jsx           # Real-time threshold, filter, & sensitivity sliders
│   │   │   ├── Monitoring.jsx         # Live performance graphs, FPS, & trajectory plots
│   │   │   ├── Help.jsx               # Keyboard shortcuts, FAQ, & troubleshooting
│   │   │   └── Welcome.jsx            # Getting started guide
│   │   ├── components/
│   │   │   ├── Header.jsx             # Top bar status indicator & mode toggle
│   │   │   └── Sidebar.jsx            # Clean navigation menu
│   │   ├── App.jsx                    # Root app routing & global overlay registration
│   │   └── index.css                  # Custom styling, dark mode tokens, & animations
│   ├── package.json                   # Frontend npm dependencies
│   └── vite.config.js                  # Proxy configuration (/api, /video_feed, /ws)
├── requirements.txt                   # Root Python dependencies file
├── run.py                             # Unified launcher (starts backend + frontend)
├── start.bat                          # Windows one-click batch launcher
├── start_standalone.bat               # Windows standalone desktop launcher
└── README.md                          # Project documentation & roadmap
```

---

## 🔧 Troubleshooting & Common Issues

### 1. Camera Fails to Open or Black Screen
- **Issue:** `Could not open webcam index 0` or no video preview appears.
- **Fix:**
  - Close any other applications currently using your webcam (Zoom, Teams, Skype, Discord, Chrome).
  - If you have an external USB webcam, ensure it is plugged into a USB 3.0 port.
  - If your computer has multiple cameras, you can change the index in `eye-controlled-mouse/eye_engine.py` (line 141) from `cv2.VideoCapture(0)` to `cv2.VideoCapture(1)`.

### 2. MediaPipe Model Download Error
- **Issue:** `Could not auto-download model` on very first run.
- **Fix:** The system attempts to download `face_landmarker.task` (~few MB) on initial startup. If your internet connection was restricted during first run:
  1. Download the file manually from:  
     `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
  2. Save it directly inside the `eye-controlled-mouse/` folder as `face_landmarker.task`.
  3. Once placed, EyeBase operates **100% offline with zero internet access**.

### 3. PyAutoGUI FailSafeException
- **Issue:** Cursor hits a screen corner and stops tracking.
- **Fix:** EyeBase sets `pyautogui.FAILSAFE = False` to prevent interruption during corner navigation. If you ever need to stop control instantly, press **<kbd>ESC</kbd>** on your keyboard.

### 4. Port 8000 or 5173 Already in Use
- **Issue:** `Address already in use` or connection refused.
- **Fix:** Terminate any dangling processes from prior sessions:
  ```powershell
  # Windows PowerShell:
  Get-Process python, node -ErrorAction SilentlyContinue | Stop-Process
  ```
  ```bash
  # Linux / macOS:
  killall python python3 node
  ```

---

## 🔒 Privacy & Offline Guarantee

- **Zero Cloud Processing:** All computer vision pipelines, neural landmark models, homography calculations, and mouse dispatchers execute entirely on your local CPU.
- **Zero Telemetry Transferred:** Video frames and facial landmarks never leave your local machine (`127.0.0.1`).
- **Complete Offline Operation:** After the one-time model file is present, EyeBase requires **no internet connection** whatsoever.
