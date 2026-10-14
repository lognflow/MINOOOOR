"""
EyeBase Unified Launcher (100% Offline)
Starts both the Python Eye Tracking Backend and the React Frontend on your local machine.
NO INTERNET ACCESS REQUIRED.
"""

import os
import sys
import subprocess
import time
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "eye-controlled-mouse")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")


def main():
    print("=" * 65)
    print("      EyeBase: Hands-Free Computer Control (100% OFFLINE)")
    print("=" * 65)
    print(" [LOCAL] All computer vision models run locally on your device.")
    print(" [LOCAL] NO internet connection is required or used.")
    print("=" * 65)
    print("\n[1/2] Starting EyeBase Backend Engine (OpenCV + MediaPipe)...")

    # Start Backend process
    backend_cmd = [sys.executable, os.path.join(BACKEND_DIR, "server.py")]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR
    )

    print("      Waiting for local engine to initialize camera...")
    time.sleep(3)

    print("\n[2/2] Starting EyeBase Frontend Local UI...")
    # Determine npm command on Windows vs POSIX
    if sys.platform == "win32":
        npm_path = shutil.which("npm.cmd") or shutil.which("npm") or "npm.cmd"
        frontend_cmd = [npm_path, "run", "dev"]
    else:
        frontend_cmd = ["npm", "run", "dev"]

    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        shell=(sys.platform == "win32")
    )

    import webbrowser
    time.sleep(2)
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

    print("\n" + "=" * 65)
    print(" EyeBase is running locally:")
    print(" -> Frontend Dashboard: http://localhost:5173")
    print(" -> Local Backend API:  http://127.0.0.1:8000")
    print(" -> Local Video Stream: http://127.0.0.1:8000/video_feed")
    print(" (Both addresses are your local PC loopback. Zero internet used.)")
    print(" Press Ctrl+C in this terminal to stop.")
    print("=" * 65 + "\n")

    try:
        while True:
            time.sleep(1)
            # If backend crashes, exit
            if backend_proc.poll() is not None:
                print("\n[Notice] Backend process stopped.")
                break
    except KeyboardInterrupt:
        print("\nStopping EyeBase...")
    finally:
        try:
            frontend_proc.terminate()
            backend_proc.terminate()
        except Exception:
            pass
        print("EyeBase stopped cleanly.")


if __name__ == "__main__":
    main()
