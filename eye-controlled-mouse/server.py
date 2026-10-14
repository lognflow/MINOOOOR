import asyncio
from contextlib import asynccontextmanager
import json
import os
import sys
from typing import Set, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

# Ensure eye-controlled-mouse directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from eye_engine import EyeEngine

engine: Optional[EyeEngine] = None
connected_websockets: Set[WebSocket] = set()
broadcaster_task: Optional[asyncio.Task] = None


async def broadcast_telemetry():
    if not connected_websockets or engine is None:
        return
    data = json.dumps({"type": "telemetry", **engine.get_telemetry()})
    disconnected = set()
    for ws in list(connected_websockets):
        try:
            await ws.send_text(data)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        connected_websockets.discard(ws)


async def telemetry_broadcaster_task():
    """Background task to broadcast telemetry over WebSocket at 30Hz"""
    while True:
        try:
            if connected_websockets and engine is not None:
                await broadcast_telemetry()
            await asyncio.sleep(0.033)
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(0.1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, broadcaster_task
    print("[Server] Initializing EyeBase Engine...")
    engine = EyeEngine()
    broadcaster_task = asyncio.create_task(telemetry_broadcaster_task())
    print("[Server] EyeBase Backend ready on http://127.0.0.1:8000")
    yield
    if broadcaster_task:
        broadcaster_task.cancel()
    if engine:
        engine.close()
    print("[Server] EyeBase Backend stopped.")


app = FastAPI(title="EyeBase API", description="Backend service for hands-free eye/head controlled mouse", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ControlRequest(BaseModel):
    action: str  # "start", "pause", "resume", "stop", "toggle_mode"


class SettingsRequest(BaseModel):
    settings: dict


class CalibrationSampleRequest(BaseModel):
    targetX: int
    targetY: int


@app.get("/api/status")
async def get_status():
    if engine is None:
        return {"connected": False}
    return {
        "connected": True,
        "telemetry": engine.get_telemetry(),
        "settings": engine.settings
    }


@app.post("/api/control")
async def control_action(req: ControlRequest):
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    act = req.action.lower()
    if act == "start":
        engine.start_control()
    elif act == "pause":
        engine.pause_control()
    elif act == "resume":
        if engine.is_paused:
            engine.pause_control()
    elif act in ("stop", "emergency_stop"):
        engine.stop_control()
    elif act == "toggle_mode":
        engine.toggle_mode()
    else:
        return JSONResponse(status_code=400, content={"error": f"Unknown action: {act}"})

    await broadcast_telemetry()
    return {"success": True, "action": act, "telemetry": engine.get_telemetry()}


@app.get("/api/settings")
async def get_settings():
    if engine is None:
        return {}
    return engine.settings


@app.post("/api/settings")
async def update_settings(req: SettingsRequest):
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    updated = engine.update_settings(req.settings)
    await broadcast_telemetry()
    return {"success": True, "settings": updated}


@app.post("/api/calibration/start")
async def calib_start():
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    res = engine.start_calibration()
    await broadcast_telemetry()
    return res


@app.post("/api/calibration/point_start")
async def calib_point_start():
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    res = engine.start_point_sampling()
    await broadcast_telemetry()
    return res


@app.post("/api/calibration/sample")
async def calib_sample(req: CalibrationSampleRequest):
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    res = engine.record_calibration_sample(req.targetX, req.targetY)
    await broadcast_telemetry()
    return res


@app.post("/api/calibration/finish")
async def calib_finish():
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    res = engine.finish_calibration()
    await broadcast_telemetry()
    return res


@app.post("/api/calibration/cancel")
async def calib_cancel():
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    res = engine.cancel_calibration()
    await broadcast_telemetry()
    return res


@app.post("/api/calibration/native")
async def calib_native():
    if engine is None:
        return JSONResponse(status_code=503, content={"error": "Engine initializing"})
    loop = asyncio.get_event_loop()
    res = await loop.run_in_executor(None, engine.run_native_calibration)
    await broadcast_telemetry()
    return res


async def gen_frames():
    """MJPEG video streamer generator"""
    while True:
        if engine is not None:
            jpeg = engine.get_jpeg()
            if jpeg is not None:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n")
        await asyncio.sleep(0.033)


@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        gen_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.add(websocket)
    if engine is not None:
        try:
            init_payload = json.dumps({
                "type": "init",
                "telemetry": engine.get_telemetry(),
                "settings": engine.settings
            })
            await websocket.send_text(init_payload)
        except Exception:
            pass

    try:
        while True:
            text = await websocket.receive_text()
            if engine is None:
                continue
            try:
                msg = json.loads(text)
                cmd = msg.get("command")
                if cmd == "start":
                    engine.start_control()
                elif cmd == "pause":
                    engine.pause_control()
                elif cmd == "resume":
                    if engine.is_paused:
                        engine.pause_control()
                elif cmd in ("stop", "emergency_stop"):
                    engine.stop_control()
                elif cmd == "toggle_mode":
                    engine.toggle_mode()
                elif cmd == "update_settings":
                    new_settings = msg.get("settings", {})
                    engine.update_settings(new_settings)
                elif cmd == "start_calibration":
                    engine.start_calibration()
                elif cmd == "point_start":
                    engine.start_point_sampling()
                elif cmd == "calibration_sample":
                    tx = msg.get("targetX", 0)
                    ty = msg.get("targetY", 0)
                    engine.record_calibration_sample(tx, ty)
                elif cmd == "finish_calibration":
                    engine.finish_calibration()
                elif cmd == "cancel_calibration":
                    engine.cancel_calibration()

                await broadcast_telemetry()
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        connected_websockets.discard(websocket)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False, log_level="info")
