import os
import sys

# Add eye-controlled-mouse directory to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EYE_DIR = os.path.join(PROJECT_ROOT, "eye-controlled-mouse")
if EYE_DIR not in sys.path:
    sys.path.insert(0, EYE_DIR)

from server import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
