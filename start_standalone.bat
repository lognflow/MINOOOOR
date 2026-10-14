@echo off
title Eye-Controlled Mouse (Standalone Desktop App)
echo =========================================================
echo    Starting Eye-Controlled Mouse (Standalone Native Window)
echo    100% Offline - Direct OpenCV + MediaPipe Engine
echo =========================================================

cd /d "%~dp0eye-controlled-mouse"
python eye_cursor.py
pause
