import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import numpy as np
import pyautogui
import time
import os
import math
import threading
import urllib.request
from collections import deque
import sys
import ctypes

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0


def move_mouse_cursor(x, y):
    try:
        pyautogui.moveTo(int(x), int(y))
    except Exception:
        pass
    if sys.platform == "win32":
        try:
            ctypes.windll.user32.SetCursorPos(int(x), int(y))
        except Exception:
            pass


def click_mouse():
    try:
        pyautogui.click()
    except Exception:
        pass


def scroll_mouse(amount):
    try:
        pyautogui.scroll(int(amount))
    except Exception:
        pass


# ============================================
# CONFIG & PATHS
# ============================================

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "face_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
CALIBRATION_FILE = os.path.join(CURRENT_DIR, "calibration_head.npy")

# Landmark indices
NOSE_TIP = 1
BETWEEN_EYEBROWS = 168

LEFT_EYE_CORNERS = (33, 133)
LEFT_EYE_VERT = (159, 145)

RIGHT_EYE_CORNERS = (362, 263)
RIGHT_EYE_VERT = (386, 374)

MOUTH_CORNERS = (61, 291)
MOUTH_VERT = (13, 14)

CALIB_SETTLE_TIME = 0.6
CALIB_SAMPLE_TIME = 1.0


# ============================================
# ONE EURO FILTER
# ============================================

class OneEuroFilter:
    def __init__(self, min_cutoff=0.2, beta=1.5, d_cutoff=1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = None
        self.dx_prev = 0.0
        self.t_prev = None

    @staticmethod
    def _alpha(cutoff, te):
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / te)

    def __call__(self, x, t):
        if self.t_prev is None:
            self.t_prev = t
            self.x_prev = x
            return x

        te = max(t - self.t_prev, 1e-3)
        freq = 1.0 / te

        dx = (x - self.x_prev) * freq
        a_d = self._alpha(self.d_cutoff, te)
        dx_hat = a_d * dx + (1 - a_d) * self.dx_prev

        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        a = self._alpha(cutoff, te)
        x_hat = a * x + (1 - a) * self.x_prev

        self.x_prev = x_hat
        self.dx_prev = dx_hat
        self.t_prev = t

        return x_hat

    def reset(self):
        self.x_prev = None
        self.dx_prev = 0.0
        self.t_prev = None


# ============================================
# THREADED CAMERA
# ============================================

class ThreadedCamera:
    def __init__(self, resolutions=[(1280, 720), (960, 540), (640, 480)]):
        self.resolutions = resolutions
        self.cap = None
        self.width = 640
        self.height = 480
        self.frame = None
        self.ok = False
        self.lock = threading.Lock()
        self.stopped = False
        self._open_camera()

        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()
        time.sleep(0.3)

    def _open_camera(self):
        backends = [cv2.CAP_DSHOW, cv2.CAP_ANY] if sys.platform == "win32" else [cv2.CAP_ANY]
        for backend in backends:
            for idx in [0, 1, 2]:
                try:
                    cap = cv2.VideoCapture(idx, backend) if backend != cv2.CAP_ANY else cv2.VideoCapture(idx)
                    if not cap.isOpened():
                        cap.release()
                        continue

                    # Verify camera actually reads a valid frame
                    ok, test_frame = cap.read()
                    if not ok or test_frame is None or getattr(test_frame, "size", 0) == 0:
                        cap.release()
                        continue

                    # Found a working camera! Configure best resolution
                    for w, h in self.resolutions:
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
                        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        ok2, frame2 = cap.read()
                        if ok2 and frame2 is not None and getattr(frame2, "size", 0) > 0:
                            self.width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or w
                            self.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or h
                            self.cap = cap
                            self.ok = True
                            print(f"[Camera] Opened device {idx} at {self.width}x{self.height} (backend={backend})")
                            return

                    self.width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
                    self.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
                    self.cap = cap
                    self.ok = True
                    print(f"[Camera] Opened device {idx} with fallback resolution {self.width}x{self.height}")
                    return
                except Exception as e:
                    print(f"[Camera] Scan error on index {idx}: {e}")

        print("[Camera] Warning: Could not find or open any working webcam (tried indices 0, 1, 2).")
        self.ok = False

    def _update(self):
        while not self.stopped:
            if self.cap is None or not self.cap.isOpened():
                time.sleep(0.1)
                continue
            ok, frame = self.cap.read()
            if ok and frame is not None:
                with self.lock:
                    self.frame = frame
                    self.ok = True
            else:
                time.sleep(0.01)

    def read(self):
        with self.lock:
            if self.frame is None:
                return False, None
            return self.ok, self.frame.copy()

    def stop(self):
        self.stopped = True
        if self.thread.is_alive():
            self.thread.join(timeout=1.0)
        with self.lock:
            if self.cap:
                self.cap.release()
                self.cap = None
        print("[Camera] Stopped and released.")


# ============================================
# MODEL VERIFICATION
# ============================================

def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("Downloading face landmarker model (one-time, ~few MB)...")
    try:
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model downloaded.")
    except Exception as e:
        print("Could not auto-download model:", e)
        print(f"Please manually download it from:\n{MODEL_URL}\nand place it as '{MODEL_PATH}' in this folder.")
        raise SystemExit(1)


# ============================================
# HELPERS
# ============================================

def aspect_ratio(landmarks, vert_pair, corner_pair, w, h):
    top = landmarks[vert_pair[0]]
    bottom = landmarks[vert_pair[1]]
    left = landmarks[corner_pair[0]]
    right = landmarks[corner_pair[1]]

    vert_dist = np.hypot((top.x - bottom.x) * w, (top.y - bottom.y) * h)
    horiz_dist = np.hypot((left.x - right.x) * w, (left.y - right.y) * h)

    if horiz_dist == 0:
        return 0.0

    return float(vert_dist / horiz_dist)


def get_head_point(landmarks):
    nose = landmarks[NOSE_TIP]
    brow = landmarks[BETWEEN_EYEBROWS]
    return float((nose.x + brow.x) / 2.0), float((nose.y + brow.y) / 2.0)


def draw_hud(frame, mode, fps, status_text, status_color, click_hold_ratio, calib_quality, paused):
    h, w = frame.shape[:2]

    # TOP LEFT : MODE
    mode_color = (0, 200, 255) if mode == "SCROLL" else (0, 255, 120)

    cv2.putText(
        frame,
        f"MODE: {mode}",
        (12, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        mode_color,
        2,
        cv2.LINE_AA,
    )

    # TOP RIGHT : STATUS
    status_size = cv2.getTextSize(
        status_text,
        cv2.FONT_HERSHEY_SIMPLEX,
        0.60,
        2
    )[0]

    status_x = max(12, w - status_size[0] - 12)

    cv2.putText(
        frame,
        status_text,
        (status_x, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.60,
        status_color,
        2,
        cv2.LINE_AA,
    )

    # CLICK HOLD BAR
    bar_w = 180
    bar_h = 10

    bar_x = (w - bar_w) // 2
    bar_y = 42

    cv2.rectangle(
        frame,
        (bar_x, bar_y),
        (bar_x + bar_w, bar_y + bar_h),
        (180, 180, 180),
        1,
    )

    fill = int(bar_w * np.clip(click_hold_ratio, 0, 1))

    if fill > 0:
        cv2.rectangle(
            frame,
            (bar_x, bar_y),
            (bar_x + fill, bar_y + bar_h),
            (0, 255, 0),
            -1,
        )

    # BOTTOM
    cv2.putText(
        frame,
        "ESC quit | mouth-open : toggle scroll",
        (12, h - 12),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (255, 255, 255),
        1,
        cv2.LINE_AA,
    )

    return frame


# ============================================
# EYE ENGINE CLASS (BACKEND CONTROLLER)
# ============================================

class EyeEngine:
    def __init__(self):
        ensure_model()
        self.screen_w, self.screen_h = pyautogui.size()

        # Tuning configuration directly matching eye_cursor.py
        self.settings = {
            # --- One Euro Filter tuning ---
            "oneEuroMinCutoff": 0.2,
            "oneEuroBeta": 1.5,
            "oneEuroDcutoff": 1.0,
            "oneEuroFilterEnabled": True,

            # --- Blink click ---
            "blinkEarThreshold": 0.17,
            "blinkHoldSeconds": 0.4,
            "clickCooldown": 0.8,
            "leftClickOnBlink": True,

            # --- Mouth-open mode toggle (MOVE <-> SCROLL) ---
            "mouthOpenThreshold": 0.55,
            "modeToggleHoldSeconds": 0.2,
            "modeToggleCooldown": 1.0,
            "scrollModeEnabled": True,

            # --- Scroll (active only in SCROLL mode) ---
            "scrollDeadZone": 0.02,
            "scrollSensitivity": 15,
            "scrollMaxOffset": 0.15,

            # --- Stillness Lock ---
            "stillnessLockEnabled": True,
            "stillnessEnterRadius": 4.0,
            "stillnessExitRadius": 8.0,
            "stillnessHoldTime": 0.2,

            # --- UI Display ---
            "showLandmarks": True,
            "showHud": True,
        }

        # One Euro Filters
        self.filter_x = OneEuroFilter(
            self.settings["oneEuroMinCutoff"],
            self.settings["oneEuroBeta"],
            self.settings["oneEuroDcutoff"]
        )
        self.filter_y = OneEuroFilter(
            self.settings["oneEuroMinCutoff"],
            self.settings["oneEuroBeta"],
            self.settings["oneEuroDcutoff"]
        )

        # Calibration
        self.homography = self.load_calibration()
        self.calib_quality = "Good" if self.homography is not None else "Uncalibrated"

        # MediaPipe Face Landmarker
        base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=0.6,
            min_face_presence_confidence=0.6,
            min_tracking_confidence=0.6,
        )
        self.landmarker = vision.FaceLandmarker.create_from_options(options)

        # Camera
        self.camera = ThreadedCamera([(1280, 720), (960, 540), (640, 480)])
        self.start_time = time.time()

        # States matching eye_cursor.py
        self.is_controlling = True
        self.is_paused = False

        self.blink_start_time = None
        self.last_click_time = 0.0
        self.click_message_until = 0.0
        self.eyes_closed = False

        self.mouth_open_start = None
        self.last_mode_toggle = 0.0
        self.mode = "MOVE"
        self.scroll_baseline_y = None

        # Stillness Lock state
        self.stillness_locked = False
        self.lock_anchor = None
        self.still_ref_point = None
        self.still_ref_time = None

        # Calibration states (Web & Native)
        self.calibration_active = False
        self.is_sampling_calibration = False
        self.calibration_step = 0
        self.calibration_samples = []
        self.calibration_points_head = []
        self.calibration_points_screen = []
        self.native_calibrating = False

        self.click_counter = 0
        self.frame_times = deque(maxlen=30)
        self.latest_annotated_jpeg = None
        self.state_lock = threading.Lock()

        # Telemetry Cache
        self.telemetry = {
            "isControlling": True,
            "isPaused": False,
            "mode": "MOVE",
            "statusText": "Tracking",
            "statusColor": "#00ff00",
            "cursor": {"x": int(self.screen_w / 2), "y": int(self.screen_h / 2), "rawX": int(self.screen_w / 2), "rawY": int(self.screen_h / 2)},
            "clickHoldRatio": 0.0,
            "ear": 0.0,
            "mar": 0.0,
            "faceDetected": False,
            "eyesDetected": False,
            "mouthDetected": False,
            "headPoint": [0.5, 0.5],
            "fps": 0.0,
            "stillnessLocked": False,
            "calibQuality": self.calib_quality,
            "scrollAmount": 0,
            "clickCount": 0,
            "cameraResolution": f"{self.camera.width}x{self.camera.height}",
            "screenWidth": self.screen_w,
            "screenHeight": self.screen_h,
            "settings": dict(self.settings)
        }

        # Background Worker Thread
        self.running = True
        self.worker_thread = threading.Thread(target=self._process_loop, daemon=True)
        self.worker_thread.start()

    def load_calibration(self):
        if os.path.exists(CALIBRATION_FILE):
            try:
                h = np.load(CALIBRATION_FILE)
                if h is not None and h.shape == (3, 3):
                    print(f"[Calibration] Loaded calibration from {CALIBRATION_FILE}")
                    return h
            except Exception as e:
                print(f"[Calibration] Error loading file: {e}")
        return None

    def save_calibration(self, h):
        try:
            np.save(CALIBRATION_FILE, h)
            self.homography = h
            print(f"[Calibration] Saved calibration matrix to {CALIBRATION_FILE}")
            return True
        except Exception as e:
            print(f"[Calibration] Error saving file: {e}")
            return False

    def now_ts(self):
        return time.time() - self.start_time

    def get_timestamp_ms(self):
        return int(self.now_ts() * 1000)

    def reset_stillness(self):
        self.stillness_locked = False
        self.lock_anchor = None
        self.still_ref_point = None
        self.still_ref_time = None

    def update_settings(self, new_settings):
        with self.state_lock:
            for k, v in new_settings.items():
                if k in self.settings:
                    self.settings[k] = v

            # Update One Euro Filter settings
            min_cutoff = float(self.settings.get("oneEuroMinCutoff", 0.2))
            beta = float(self.settings.get("oneEuroBeta", 1.5))
            d_cutoff = float(self.settings.get("oneEuroDcutoff", 1.0))

            self.filter_x.min_cutoff = min_cutoff
            self.filter_x.beta = beta
            self.filter_x.d_cutoff = d_cutoff

            self.filter_y.min_cutoff = min_cutoff
            self.filter_y.beta = beta
            self.filter_y.d_cutoff = d_cutoff

            self.telemetry["settings"] = dict(self.settings)
        return self.settings

    def start_control(self):
        with self.state_lock:
            self.is_controlling = True
            self.is_paused = False
            self.filter_x.reset()
            self.filter_y.reset()
            self.reset_stillness()
        print("[Control] Mouse control started.")

    def pause_control(self):
        with self.state_lock:
            self.is_paused = not self.is_paused
            if self.is_paused:
                self.blink_start_time = None
                self.eyes_closed = False
            else:
                self.filter_x.reset()
                self.filter_y.reset()
                self.reset_stillness()
        print(f"[Control] Mouse control pause toggled: {self.is_paused}")

    def stop_control(self):
        with self.state_lock:
            self.is_controlling = False
            self.is_paused = False
            self.blink_start_time = None
            self.eyes_closed = False
            self.filter_x.reset()
            self.filter_y.reset()
            self.reset_stillness()
        print("[Control] Mouse control stopped (Emergency Stop).")

    def toggle_mode(self):
        with self.state_lock:
            self.mode = "SCROLL" if self.mode == "MOVE" else "MOVE"
            if self.mode == "SCROLL":
                self.scroll_baseline_y = self.telemetry["headPoint"][1]
            else:
                self.filter_x.reset()
                self.filter_y.reset()
                self.reset_stillness()
        print(f"[Mode] Toggled mode to {self.mode}")

    # ================= Web Calibration =================
    def start_calibration(self):
        with self.state_lock:
            self.calibration_active = True
            self.is_sampling_calibration = False
            self.calibration_step = 1
            self.calibration_samples = []
            self.calibration_points_head = []
            self.calibration_points_screen = []
        return {"status": "started", "totalPoints": 9}

    def start_point_sampling(self):
        with self.state_lock:
            self.calibration_samples = []
            self.is_sampling_calibration = True
        return {"status": "sampling"}

    def record_calibration_sample(self, target_x, target_y):
        with self.state_lock:
            self.is_sampling_calibration = False
            if len(self.calibration_samples) > 0:
                mean_pt = np.mean(self.calibration_samples, axis=0).tolist()
            else:
                hp = self.telemetry["headPoint"]
                mean_pt = [hp[0], hp[1]]

            self.calibration_points_head.append(mean_pt)
            self.calibration_points_screen.append([target_x, target_y])
            self.calibration_samples = []
            self.calibration_step += 1
            step = self.calibration_step
        return {"step": step, "recorded": len(self.calibration_points_head)}

    def finish_calibration(self):
        with self.state_lock:
            self.calibration_active = False
            self.is_sampling_calibration = False
            if len(self.calibration_points_head) < 4:
                return {"success": False, "error": "Not enough calibration points recorded. Please ensure your face is clearly visible to the camera."}

            src = np.array(self.calibration_points_head, dtype=np.float32)
            dst = np.array(self.calibration_points_screen, dtype=np.float32)

            # Check if head points actually moved (prevent all default [0.5, 0.5] if face wasn't detected)
            head_spread = np.ptp(src, axis=0)
            if head_spread[0] < 0.005 and head_spread[1] < 0.005:
                return {
                    "success": False,
                    "error": "Face movements were not detected during calibration. Please position your face in the camera frame with good lighting."
                }

            homography, _ = cv2.findHomography(src, dst, method=0)
            if homography is None:
                homography, _ = cv2.findHomography(src, dst, method=cv2.RANSAC, ransacReprojThreshold=20.0)

            if homography is None:
                return {"success": False, "error": "Could not compute calibration matrix. Please try again with steady head positioning."}

            reproj = cv2.perspectiveTransform(src.reshape(-1, 1, 2), homography).reshape(-1, 2)
            errors = np.linalg.norm(reproj - dst, axis=1)
            mean_err = float(np.mean(errors))
            screen_diag = math.hypot(self.screen_w, self.screen_h)
            err_ratio = mean_err / screen_diag

            if err_ratio < 0.01:
                quality = "Good"
            elif err_ratio < 0.025:
                quality = "Fair"
            else:
                quality = "Poor - consider recalibrating (R) with steadier head positioning"

            self.save_calibration(homography)
            self.calib_quality = quality
            self.filter_x.reset()
            self.filter_y.reset()
            self.reset_stillness()
            self.is_controlling = True
            self.is_paused = False

        print(f"[Calibration] Complete. Mean reprojection error: {mean_err:.1f}px -> Quality: {quality}")
        return {"success": True, "quality": quality, "meanError": round(mean_err, 1)}

    def cancel_calibration(self):
        with self.state_lock:
            self.calibration_active = False
            self.is_sampling_calibration = False
            self.calibration_samples = []
            self.calibration_points_head = []
            self.calibration_points_screen = []
            self.is_controlling = True
            self.is_paused = False
        return {"status": "cancelled"}

    # ================= Native Calibration =================
    def run_native_calibration(self):
        """Runs the native OpenCV fullscreen desktop window calibration from eye_cursor.py"""
        self.native_calibrating = True
        try:
            print("Starting calibration. Turn/move your HEAD to point at each red dot.")
            cv2.namedWindow("Calibration", cv2.WND_PROP_FULLSCREEN)
            cv2.setWindowProperty("Calibration", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

            # 3-Second Fullscreen Webcam View before calibration dots begin
            preview_start = time.time()
            while time.time() - preview_start < 3.0:
                success, frame = self.camera.read()
                if not success:
                    time.sleep(0.01)
                    continue

                frame = cv2.flip(frame, 1)
                full_frame = cv2.resize(frame, (self.screen_w, self.screen_h))

                elapsed = time.time() - preview_start
                remaining = max(1, int(math.ceil(3.0 - elapsed)))

                # Center face guidance reticle
                cx, cy = self.screen_w // 2, self.screen_h // 2
                cv2.ellipse(full_frame, (cx, cy), (int(self.screen_w * 0.16), int(self.screen_h * 0.28)), 0, 0, 360, (0, 255, 200), 2, cv2.LINE_AA)
                cv2.drawMarker(full_frame, (cx, cy), (0, 255, 200), cv2.MARKER_CROSS, 30, 2)

                # Top banner overlay
                overlay = full_frame.copy()
                cv2.rectangle(overlay, (0, 0), (self.screen_w, 100), (15, 23, 42), -1)
                cv2.addWeighted(overlay, 0.75, full_frame, 0.25, 0, full_frame)

                cv2.putText(full_frame, "WEBCAM PREVIEW - CENTER YOUR FACE & HEAD", (50, 45),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(full_frame, f"CALIBRATION STARTING IN {remaining}s (ESC to Cancel)", (50, 80),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2, cv2.LINE_AA)

                # Large countdown circle badge
                cv2.circle(full_frame, (cx, cy + int(self.screen_h * 0.35)), 46, (0, 255, 255), -1)
                cv2.putText(full_frame, str(remaining), (cx - 14, cy + int(self.screen_h * 0.35) + 16),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.6, (15, 23, 42), 3, cv2.LINE_AA)

                cv2.imshow("Calibration", full_frame)
                key = cv2.waitKey(1) & 0xFF
                if key == 27:
                    cv2.destroyWindow("Calibration")
                    return {"success": False, "error": "Calibration cancelled by user"}

            margin = 0.08
            xs = [margin, 0.5, 1 - margin]
            ys = [margin, 0.5, 1 - margin]

            screen_points = []
            head_points = []

            for gy in ys:
                for gx in xs:
                    target_x = int(gx * self.screen_w)
                    target_y = int(gy * self.screen_h)

                    settle_start = time.time()
                    samples = []

                    while True:
                        success, frame = self.camera.read()
                        if not success:
                            continue

                        frame = cv2.flip(frame, 1)
                        canvas = np.zeros((self.screen_h, self.screen_w, 3), dtype=np.uint8)
                        elapsed = time.time() - settle_start

                        cv2.circle(canvas, (target_x, target_y), 22, (0, 0, 255), -1)
                        cv2.circle(canvas, (target_x, target_y), 22, (255, 255, 255), 2)

                        if elapsed > CALIB_SETTLE_TIME:
                            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                            result = self.landmarker.detect_for_video(mp_image, self.get_timestamp_ms())
                            if result.face_landmarks and len(result.face_landmarks) > 0:
                                samples.append(get_head_point(result.face_landmarks[0]))
                            cv2.circle(canvas, (target_x, target_y), 10, (0, 255, 0), -1)

                        cv2.putText(canvas, "Point your HEAD at the dot - ESC to cancel", (40, 50),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

                        cv2.imshow("Calibration", canvas)
                        key = cv2.waitKey(1) & 0xFF

                        if key == 27:
                            cv2.destroyWindow("Calibration")
                            return {"success": False, "error": "Calibration cancelled by user"}

                        if elapsed > CALIB_SETTLE_TIME + CALIB_SAMPLE_TIME:
                            break

                    if len(samples) == 0:
                        print("Warning: no face detected for a calibration point, skipping.")
                        continue

                    head_points.append(np.mean(samples, axis=0))
                    screen_points.append((target_x, target_y))

            cv2.destroyWindow("Calibration")

            if len(head_points) < 4:
                return {"success": False, "error": "Not enough valid points."}

            src = np.array(head_points, dtype=np.float32)
            dst = np.array(screen_points, dtype=np.float32)

            homography, _ = cv2.findHomography(src, dst, method=0)

            reproj = cv2.perspectiveTransform(src.reshape(-1, 1, 2), homography).reshape(-1, 2)
            errors = np.linalg.norm(reproj - dst, axis=1)
            mean_err = float(np.mean(errors))
            screen_diag = math.hypot(self.screen_w, self.screen_h)
            err_ratio = mean_err / screen_diag

            if err_ratio < 0.01:
                quality = "Good"
            elif err_ratio < 0.025:
                quality = "Fair"
            else:
                quality = "Poor - consider recalibrating (R) with steadier head positioning"

            self.save_calibration(homography)
            self.calib_quality = quality
            self.filter_x.reset()
            self.filter_y.reset()
            self.reset_stillness()
            self.is_controlling = True
            self.is_paused = False

            return {"success": True, "quality": quality, "meanError": round(mean_err, 1)}
        finally:
            self.native_calibrating = False

    # ================= Processing Loop =================
    def _process_loop(self):
        while self.running:
            if self.native_calibrating:
                time.sleep(0.05)
                continue

            loop_start = time.time()
            ok, frame = self.camera.read()
            if not ok or frame is None:
                time.sleep(0.01)
                continue

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            t = self.now_ts()

            status_text = "No face detected"
            status_color = (0, 0, 255)
            click_hold_ratio = 0.0

            cursor_x = self.telemetry["cursor"]["x"]
            cursor_y = self.telemetry["cursor"]["y"]
            raw_x = cursor_x
            raw_y = cursor_y

            avg_ear = 0.0
            mar = 0.0
            head_point = (0.5, 0.5)
            scroll_amount = 0
            face_detected = False

            if not self.is_paused:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                try:
                    result = self.landmarker.detect_for_video(mp_image, self.get_timestamp_ms())
                    landmarks_list = result.face_landmarks
                except Exception:
                    landmarks_list = None

                if landmarks_list and len(landmarks_list) > 0:
                    landmarks = landmarks_list[0]
                    face_detected = True
                    head_point = get_head_point(landmarks)

                    left_ear = aspect_ratio(landmarks, LEFT_EYE_VERT, LEFT_EYE_CORNERS, w, h)
                    right_ear = aspect_ratio(landmarks, RIGHT_EYE_VERT, RIGHT_EYE_CORNERS, w, h)
                    avg_ear = (left_ear + right_ear) / 2.0
                    mar = aspect_ratio(landmarks, MOUTH_VERT, MOUTH_CORNERS, w, h)

                    is_closed = avg_ear < self.settings["blinkEarThreshold"]
                    is_mouth_open = mar > self.settings["mouthOpenThreshold"]

                    # Calibration sampling (Web calibration)
                    if self.calibration_active and getattr(self, "is_sampling_calibration", False):
                        self.calibration_samples.append(head_point)

                    # ---- Mode toggle (mouth open, held briefly) ----
                    if self.settings.get("scrollModeEnabled", True) and is_mouth_open:
                        if self.mouth_open_start is None:
                            self.mouth_open_start = t
                        held_mouth = t - self.mouth_open_start
                        if held_mouth >= self.settings["modeToggleHoldSeconds"] and (t - self.last_mode_toggle > self.settings["modeToggleCooldown"]):
                            self.mode = "SCROLL" if self.mode == "MOVE" else "MOVE"
                            self.last_mode_toggle = t
                            self.mouth_open_start = t
                            if self.mode == "SCROLL":
                                self.scroll_baseline_y = head_point[1]
                            else:
                                self.filter_x.reset()
                                self.filter_y.reset()
                                self.reset_stillness()
                    else:
                        self.mouth_open_start = None

                    if self.mode == "SCROLL":
                        # ---- Scroll mode: tilt head up/down, clicking disabled ----
                        if self.scroll_baseline_y is not None:
                            offset = head_point[1] - self.scroll_baseline_y
                            if abs(offset) > self.settings["scrollDeadZone"]:
                                clamped = float(np.clip(offset, -self.settings["scrollMaxOffset"], self.settings["scrollMaxOffset"]))
                                scroll_amount = -int(clamped * self.settings["scrollSensitivity"] / self.settings["scrollMaxOffset"] * 10)
                                if scroll_amount != 0:
                                    if not self.is_paused and self.is_controlling:
                                        scroll_mouse(scroll_amount)
                                    status_text = "Scrolling up" if scroll_amount > 0 else "Scrolling down"
                                    status_color = (0, 200, 255)
                                else:
                                    status_text = "Scroll ready"
                                    status_color = (0, 200, 255)
                            else:
                                status_text = "Scroll ready"
                                status_color = (0, 200, 255)
                        else:
                            self.scroll_baseline_y = head_point[1]
                            status_text = "Scroll ready"
                            status_color = (0, 200, 255)

                        self.blink_start_time = None
                        self.eyes_closed = False

                    else:
                        # ---- MOVE mode: blink click + filtered cursor movement ----
                        if self.settings.get("leftClickOnBlink", True):
                            if is_closed:
                                if self.blink_start_time is None:
                                    self.blink_start_time = t
                                held = t - self.blink_start_time
                                click_hold_ratio = held / self.settings["blinkHoldSeconds"]

                                if held >= self.settings["blinkHoldSeconds"] and not self.eyes_closed:
                                    if t - self.last_click_time > self.settings["clickCooldown"]:
                                        if not self.is_paused and self.is_controlling:
                                            click_mouse()
                                        self.click_counter += 1
                                        self.last_click_time = t
                                        self.click_message_until = t + 0.50
                                        self.eyes_closed = True
                            else:
                                self.blink_start_time = None
                                self.eyes_closed = False

                        if not is_closed and not self.calibration_active:
                            if self.homography is not None:
                                point = np.array([[[head_point[0], head_point[1]]]], dtype=np.float32)
                                mapped = cv2.perspectiveTransform(point, self.homography)[0][0]
                                raw_x = float(np.clip(mapped[0], 0, self.screen_w - 1))
                                raw_y = float(np.clip(mapped[1], 0, self.screen_h - 1))
                            else:
                                raw_x = float(np.clip((head_point[0] - 0.5) * 2.2 * self.screen_w + self.screen_w / 2, 0, self.screen_w - 1))
                                raw_y = float(np.clip((head_point[1] - 0.5) * 2.2 * self.screen_h + self.screen_h / 2, 0, self.screen_h - 1))

                            # ---- Stillness Lock: freeze cursor completely when head is steady ----
                            newly_locked = False

                            if self.settings.get("stillnessLockEnabled", True):
                                if not self.stillness_locked:
                                    if self.still_ref_point is None:
                                        self.still_ref_point = (raw_x, raw_y)
                                        self.still_ref_time = t
                                    else:
                                        d_ref = math.hypot(raw_x - self.still_ref_point[0], raw_y - self.still_ref_point[1])
                                        if d_ref > self.settings["stillnessEnterRadius"]:
                                            self.still_ref_point = (raw_x, raw_y)
                                            self.still_ref_time = t
                                        elif t - self.still_ref_time >= self.settings["stillnessHoldTime"]:
                                            self.stillness_locked = True
                                            self.lock_anchor = self.still_ref_point
                                            newly_locked = True

                                if self.stillness_locked:
                                    d_lock = math.hypot(raw_x - self.lock_anchor[0], raw_y - self.lock_anchor[1])
                                    if d_lock > self.settings["stillnessExitRadius"]:
                                        self.stillness_locked = False
                                        self.still_ref_point = (raw_x, raw_y)
                                        self.still_ref_time = t
                                        self.filter_x.reset()
                                        self.filter_y.reset()
                                    else:
                                        cursor_x = int(self.lock_anchor[0])
                                        cursor_y = int(self.lock_anchor[1])
                                        if newly_locked and not self.is_paused and self.is_controlling:
                                            move_mouse_cursor(cursor_x, cursor_y)
                                        if status_text != "CLICK!":
                                            status_text = "Locked (still)"
                                            status_color = (150, 255, 150)

                            if not self.stillness_locked:
                                if self.settings.get("oneEuroFilterEnabled", True):
                                    fx = self.filter_x(raw_x, t)
                                    fy = self.filter_y(raw_y, t)
                                else:
                                    fx, fy = raw_x, raw_y

                                cursor_x = int(round(fx))
                                cursor_y = int(round(fy))

                                if not self.is_paused and self.is_controlling:
                                    move_mouse_cursor(cursor_x, cursor_y)

                                if status_text != "CLICK!":
                                    status_text = "Tracking"
                                    status_color = (0, 255, 255)

                            if t < self.click_message_until:
                                status_text = "CLICK!"
                                status_color = (0, 255, 0)
            else:
                status_text = "Paused"
                status_color = (0, 0, 255)

            # ---- FPS ----
            self.frame_times.append(time.time() - loop_start)
            avg_frame_time = sum(self.frame_times) / len(self.frame_times) if self.frame_times else 0.033
            fps = 1.0 / avg_frame_time if avg_frame_time > 0 else 0.0

            # Convert status color to hex for web telemetry
            if isinstance(status_color, tuple):
                hex_color = f"#{status_color[2]:02x}{status_color[1]:02x}{status_color[0]:02x}"
            else:
                hex_color = "#10b981"

            with self.state_lock:
                self.telemetry = {
                    "isControlling": self.is_controlling,
                    "isPaused": self.is_paused,
                    "mode": self.mode,
                    "statusText": status_text,
                    "statusColor": hex_color,
                    "cursor": {"x": cursor_x, "y": cursor_y, "rawX": int(raw_x), "rawY": int(raw_y)},
                    "clickHoldRatio": float(click_hold_ratio),
                    "ear": round(float(avg_ear), 3),
                    "mar": round(float(mar), 3),
                    "faceDetected": face_detected,
                    "eyesDetected": face_detected,
                    "mouthDetected": face_detected,
                    "headPoint": [round(head_point[0], 4), round(head_point[1], 4)],
                    "fps": round(fps, 1),
                    "stillnessLocked": self.stillness_locked,
                    "calibQuality": self.calib_quality,
                    "scrollAmount": scroll_amount,
                    "clickCount": self.click_counter,
                    "cameraResolution": f"{self.camera.width}x{self.camera.height}",
                    "settings": dict(self.settings)
                }

            # Generate Display / Preview Frame with exact HUD
            display_frame = cv2.resize(frame, (480, 360))

            if self.settings.get("showLandmarks", True) and face_detected:
                h_p, w_p = display_frame.shape[:2]
                landmarks = landmarks_list[0]
                # Nose & brow tracking anchor
                hx, hy = int(head_point[0] * w_p), int(head_point[1] * h_p)
                cv2.circle(display_frame, (hx, hy), 4, (0, 255, 255), -1)

                # Eye and mouth contours
                for idx in [NOSE_TIP, BETWEEN_EYEBROWS, 33, 133, 159, 145, 362, 263, 386, 374, 61, 291, 13, 14]:
                    pt = landmarks[idx]
                    px, py = int(pt.x * w_p), int(pt.y * h_p)
                    cv2.circle(display_frame, (px, py), 2, (0, 255, 120), -1)

            if self.settings.get("showHud", True):
                display_frame = draw_hud(
                    display_frame, self.mode, fps, status_text, status_color,
                    click_hold_ratio, self.calib_quality, self.is_paused
                )

            ret, jpeg = cv2.imencode(".jpg", display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ret:
                self.latest_annotated_jpeg = jpeg.tobytes()

    def get_jpeg(self):
        return self.latest_annotated_jpeg

    def get_telemetry(self):
        with self.state_lock:
            return dict(self.telemetry)

    def close(self):
        self.running = False
        if self.worker_thread.is_alive():
            self.worker_thread.join(timeout=1.0)
        self.camera.stop()
        if hasattr(self, "landmarker") and self.landmarker:
            try:
                self.landmarker.close()
            except Exception:
                pass
