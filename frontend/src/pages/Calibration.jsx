import React, { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react';
import { useEyeMouse } from '../context/EyeMouseContext';

const Calibration = () => {
  const { 
    isCalibrationOpen,
    closeCalibrationFlow,
    isConnected, 
    telemetry, 
    startCalibration, 
    startPointSampling,
    recordCalibrationSample, 
    finishCalibration, 
    cancelCalibration,
    startControl
  } = useEyeMouse();

  const [calibrationState, setCalibrationState] = useState('webcam_preview'); // 'webcam_preview', 'calibrating', 'complete'
  const [previewCountdown, setPreviewCountdown] = useState(3);
  const [currentPoint, setCurrentPoint] = useState(1);
  const [isSampling, setIsSampling] = useState(false);
  const [calibResult, setCalibResult] = useState(null);
  const totalPoints = 9;

  // Exact 9-point grid from eye_cursor.py: margin=0.08, 0.50, 0.92
  const gridPositions = [
    { xRatio: 0.08, yRatio: 0.08, label: 'Top-Left' },
    { xRatio: 0.50, yRatio: 0.08, label: 'Top-Center' },
    { xRatio: 0.92, yRatio: 0.08, label: 'Top-Right' },
    { xRatio: 0.08, yRatio: 0.50, label: 'Middle-Left' },
    { xRatio: 0.50, yRatio: 0.50, label: 'Center' },
    { xRatio: 0.92, yRatio: 0.50, label: 'Middle-Right' },
    { xRatio: 0.08, yRatio: 0.92, label: 'Bottom-Left' },
    { xRatio: 0.50, yRatio: 0.92, label: 'Bottom-Center' },
    { xRatio: 0.92, yRatio: 0.92, label: 'Bottom-Right' },
  ];

  const enterFullscreen = () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen exit failed:', e);
    }
  };

  // Reset & start whenever isCalibrationOpen becomes true
  useEffect(() => {
    if (isCalibrationOpen) {
      setCalibrationState('webcam_preview');
      setPreviewCountdown(3);
      setCurrentPoint(1);
      setIsSampling(false);
      setCalibResult(null);
    }
  }, [isCalibrationOpen]);

  const handleCancel = async () => {
    exitFullscreen();
    setCurrentPoint(1);
    setIsSampling(false);
    setPreviewCountdown(3);
    await cancelCalibration();
    closeCalibrationFlow();
  };

  const handleDone = () => {
    exitFullscreen();
    startControl();
    closeCalibrationFlow();
  };

  const handleRecalibrate = () => {
    setCalibrationState('webcam_preview');
    setPreviewCountdown(3);
    setCurrentPoint(1);
    setIsSampling(false);
    setCalibResult(null);
  };

  // 3-Second Fullscreen Webcam Preview Timer before calibration points
  useEffect(() => {
    if (!isCalibrationOpen || calibrationState !== 'webcam_preview') return;

    setPreviewCountdown(3);

    const interval = setInterval(() => {
      setPreviewCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // 3 seconds complete: transition directly to 9-point dot calibration
          setCurrentPoint(1);
          setIsSampling(false);
          setCalibrationState('calibrating');
          startCalibration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCalibrationOpen, calibrationState, startCalibration]);



  // Dedicated Escape key handler while calibration overlay is open
  useEffect(() => {
    if (!isCalibrationOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (calibrationState === 'complete') {
          handleDone();
        } else {
          handleCancel();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalibrationOpen, calibrationState]);

  // Exact timing from eye_cursor.py:
  // CALIB_SETTLE_TIME = 0.6s (Red dot + white ring)
  // CALIB_SAMPLE_TIME = 1.0s (Green dot, gathering head landmarks)
  useEffect(() => {
    let timer1, timer2;
    if (isCalibrationOpen && calibrationState === 'calibrating') {
      const ptIndex = currentPoint - 1;
      const ptConfig = gridPositions[ptIndex];
      const screenW = telemetry?.screenWidth || (window.screen.width * (window.devicePixelRatio || 1)) || 1920;
      const screenH = telemetry?.screenHeight || (window.screen.height * (window.devicePixelRatio || 1)) || 1080;
      const targetX = Math.round(ptConfig.xRatio * screenW);
      const targetY = Math.round(ptConfig.yRatio * screenH);

      // Phase 1: Settle time (0.6s) -> user points head at red dot
      setIsSampling(false);
      timer1 = setTimeout(() => {
        // Phase 2: Dot turns green -> start sampling for 1.0s
        setIsSampling(true);
        startPointSampling();

        // Phase 3: At end of 1.0s sampling window, record sample & advance
        timer2 = setTimeout(async () => {
          await recordCalibrationSample(targetX, targetY);

          if (currentPoint < totalPoints) {
            setCurrentPoint((prev) => prev + 1);
          } else {
            const res = await finishCalibration();
            exitFullscreen();
            setCalibResult(res);
            if (res && res.success === false) {
              setCalibrationState('failed');
            } else {
              setCalibrationState('complete');
            }
          }
        }, 1000); // 1.0s sample
      }, 600); // 0.6s settle
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isCalibrationOpen, calibrationState, currentPoint, startPointSampling, recordCalibrationSample, finishCalibration]);

  // Do not render anything when calibration overlay is closed
  if (!isCalibrationOpen) {
    return null;
  }

  // Target styling matching eye_cursor.py:
  const currentPos = gridPositions[(currentPoint - 1) % totalPoints];
  const targetStyle = {
    position: 'absolute',
    top: `${currentPos.yRatio * 100}%`,
    left: `${currentPos.xRatio * 100}%`,
    transform: 'translate(-50%, -50%)',
    width: isSampling ? '24px' : '44px',
    height: isSampling ? '24px' : '44px',
    borderRadius: '50%',
    backgroundColor: isSampling ? '#00ff00' : '#ff0000',
    border: isSampling ? '3px solid #ffffff' : '4px solid #ffffff',
    boxShadow: isSampling ? '0 0 35px rgba(0, 255, 0, 1)' : '0 0 30px rgba(255, 0, 0, 1)',
    transition: 'top 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.15s, height 0.15s, background-color 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000000
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. 3-SECOND FULLSCREEN WEBCAM PREVIEW (Before Calibration Dots) */}
      {/* ============================================================== */}
      {calibrationState === 'webcam_preview' && (
        <div 
          id="fullscreen-webcam-preview-overlay"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: '#05070f', 
            zIndex: 99999999,
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}
        >
          {/* Real-time OpenCV Camera Stream */}
          {isConnected ? (
            <img 
              src="/video_feed" 
              alt="Fullscreen Webcam View" 
              style={{
                width: '100vw',
                height: '100vh',
                objectFit: 'cover',
                display: 'block',
                filter: 'contrast(1.04) brightness(1.02)'
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 600 }}>Connecting to Camera Stream...</div>
            </div>
          )}

          {/* Vignette Edge Shadow for focus */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(5,7,15,0.05) 35%, rgba(5,7,15,0.7) 80%, rgba(5,7,15,0.95) 100%)',
            pointerEvents: 'none'
          }} />

          {/* TOP HUD BAR */}
          <div style={{ 
            position: 'absolute', 
            top: '24px', 
            left: '32px', 
            right: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10000001
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              padding: '0.6rem 1.25rem',
              borderRadius: '9999px',
              color: '#ffffff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: telemetry.faceDetected ? '#22c55e' : '#f59e0b',
                boxShadow: telemetry.faceDetected ? '0 0 10px #22c55e' : '0 0 10px #f59e0b'
              }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Full Screen Webcam Check
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>|</span>
              <span style={{ fontSize: '0.85rem', color: telemetry.faceDetected ? '#4ade80' : '#fcd34d', fontWeight: 600 }}>
                {telemetry.faceDetected ? 'Face Locked ✓' : 'Position Face in Frame'}
              </span>
            </div>

            {/* Cancel Button */}
            <button 
              onClick={handleCancel}
              style={{ 
                background: 'rgba(239, 68, 68, 0.25)', 
                color: '#fca5a5', 
                border: '1px solid #ef4444', 
                padding: '0.55rem 1.4rem', 
                borderRadius: '9999px', 
                fontSize: '0.875rem', 
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.45)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.25)'}
            >
              Cancel (ESC)
            </button>
          </div>

          {/* CENTER BIOMETRIC SCANNING GUIDE & RETICLE */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '360px',
            height: '460px',
            border: `2px dashed ${telemetry.faceDetected ? 'rgba(34, 197, 94, 0.7)' : 'rgba(56, 189, 248, 0.7)'}`,
            borderRadius: '180px / 230px',
            boxShadow: telemetry.faceDetected 
              ? '0 0 30px rgba(34, 197, 94, 0.25), inset 0 0 25px rgba(34, 197, 94, 0.15)' 
              : '0 0 30px rgba(56, 189, 248, 0.25), inset 0 0 25px rgba(56, 189, 248, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10000001,
            transition: 'border-color 0.3s, box-shadow 0.3s'
          }}>
            {/* Center Crosshair */}
            <div style={{
              position: 'absolute',
              width: '28px',
              height: '2px',
              backgroundColor: telemetry.faceDetected ? 'rgba(34, 197, 94, 0.8)' : 'rgba(56, 189, 248, 0.8)'
            }} />
            <div style={{
              position: 'absolute',
              width: '2px',
              height: '28px',
              backgroundColor: telemetry.faceDetected ? 'rgba(34, 197, 94, 0.8)' : 'rgba(56, 189, 248, 0.8)'
            }} />

            {/* Glowing Countdown Circle Badge */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.85)',
              border: `3px solid ${telemetry.faceDetected ? '#22c55e' : '#38bdf8'}`,
              boxShadow: telemetry.faceDetected 
                ? '0 0 35px rgba(34, 197, 94, 0.75)' 
                : '0 0 35px rgba(56, 189, 248, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '3.5rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              backdropFilter: 'blur(8px)',
              animation: 'scalePulse 1s infinite alternate'
            }}>
              {previewCountdown}
            </div>

            <div style={{
              marginTop: '1.25rem',
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '0.4rem 1.1rem',
              borderRadius: '9999px',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textAlign: 'center',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
            }}>
              Calibration Starts in {previewCountdown}s
            </div>
          </div>

          {/* BOTTOM INSTRUCTION CARD */}
          <div style={{ 
            position: 'absolute', 
            bottom: '36px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            textAlign: 'center', 
            width: '90%', 
            maxWidth: '650px', 
            zIndex: 10000001,
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '1rem 1.75rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
            }}>
              <div style={{
                color: '#38bdf8',
                fontSize: '1.05rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                marginBottom: '0.35rem',
                textTransform: 'uppercase'
              }}>
                Align Your Head & Relax Your Shoulders
              </div>
              <div style={{
                color: '#cbd5e1',
                fontSize: '0.875rem',
                lineHeight: 1.4
              }}>
                Sit directly in front of your camera (50–70 cm). When countdown ends, point your head at each target dot.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TRUE FULLSCREEN 9-POINT DOT CALIBRATION VIEWPORT OVERLAY    */}
      {/* ============================================================== */}
      {calibrationState === 'calibrating' && (
        <div 
          id="fullscreen-calibration-overlay"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: '#000000', 
            zIndex: 99999999,
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            cursor: 'crosshair',
            userSelect: 'none'
          }}
        >
          {/* Top Prompt Text */}
          <div style={{ 
            position: 'absolute', 
            top: '28px', 
            left: '36px', 
            color: '#ffffff', 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            zIndex: 10000001,
            textShadow: '0 2px 10px rgba(0,0,0,0.9)'
          }}>
            Look directly at the dot with your eyes & head - ESC to cancel
          </div>

          {/* Cancel Button in Top Right */}
          <button 
            onClick={handleCancel}
            style={{ 
              position: 'absolute', 
              top: '22px', 
              right: '36px', 
              background: 'rgba(239, 68, 68, 0.3)', 
              color: '#fca5a5', 
              border: '1px solid #ef4444', 
              padding: '0.55rem 1.4rem', 
              borderRadius: '8px', 
              fontSize: '0.875rem', 
              fontWeight: 600,
              cursor: 'pointer',
              zIndex: 10000001,
              backdropFilter: 'blur(6px)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.5)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.3)'}
          >
            Cancel (ESC)
          </button>

          {/* The Active Calibration Dot */}
          <div style={targetStyle}>
            {isSampling && (
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
            )}
          </div>

          {/* Bottom Progress & Instruction Indicator */}
          <div style={{ 
            position: 'absolute', 
            bottom: '36px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            textAlign: 'center', 
            width: '100%', 
            maxWidth: '750px', 
            zIndex: 10000001,
            pointerEvents: 'none'
          }}>
            <div style={{ 
              color: isSampling ? '#00ff00' : '#ff4444', 
              fontSize: '1.3rem', 
              fontWeight: 800, 
              marginBottom: '0.75rem', 
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              textShadow: '0 2px 12px rgba(0,0,0,0.95)'
            }}>
              {isSampling 
                ? 'SAMPLING EYE GAZE & HEAD (HOLD STEADY)...' 
                : `LOOK AT TARGET: ${currentPos.label.toUpperCase()}`}
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
              {Array.from({ length: totalPoints }).map((_, i) => (
                <div key={i} style={{ 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: i + 1 < currentPoint ? '#00ff00' : (i + 1 === currentPoint ? (isSampling ? '#00ff00' : '#ff0000') : '#334155'),
                  border: i + 1 === currentPoint ? '2px solid #ffffff' : 'none',
                  boxShadow: i + 1 === currentPoint ? '0 0 12px rgba(255,255,255,0.9)' : 'none',
                  transition: 'all 0.2s'
                }} />
              ))}
            </div>

            <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              Target Point {currentPoint} of {totalPoints} ({Math.round((currentPoint / totalPoints) * 100)}%)
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. COMPLETION MODAL OVERLAY                                    */}
      {/* ============================================================== */}
      {calibrationState === 'complete' && (
        <div 
          id="fullscreen-calibration-complete-overlay"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(5, 7, 15, 0.92)', 
            zIndex: 99999999,
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ 
            maxWidth: '560px', 
            width: '90%', 
            textAlign: 'center', 
            background: 'rgba(15, 23, 42, 0.95)', 
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '2px solid #22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)'
            }}>
              <CheckCircle2 size={46} style={{ color: '#22c55e' }} />
            </div>

            <h2 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '0.02em' }}>
              CALIBRATION COMPLETE
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
              3×3 Homography Matrix calculated and active. Head & gaze movements are now mapped to full screen cursor coordinates.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '1rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Quality</div>
                <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '1.15rem' }}>
                  {calibResult?.quality || telemetry.calibQuality || 'Good'}
                </div>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '1rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Reprojection</div>
                <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '1.15rem' }}>
                  {calibResult?.meanError ? `${calibResult.meanError} px` : '< 15 px'}
                </div>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '1rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Matrix</div>
                <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '1.15rem' }}>Saved & Active</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center' }}>
              <button 
                className="secondary-button" 
                onClick={handleRecalibrate} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '12px', 
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.2)' 
                }}
              >
                <RotateCcw size={16} /> Recalibrate
              </button>
              <button 
                className="rgb-button" 
                onClick={handleDone} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 2.25rem', 
                  borderRadius: '12px',
                  fontWeight: 700
                }}
              >
                Done (ESC) <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {calibrationState === 'failed' && (
        <div 
          id="fullscreen-calibration-failed-overlay"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(5, 7, 15, 0.94)', 
            zIndex: 99999999,
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ 
            maxWidth: '560px', 
            width: '90%', 
            textAlign: 'center', 
            background: 'rgba(15, 23, 42, 0.95)', 
            border: '1px solid rgba(239, 68, 68, 0.35)', 
            borderRadius: '24px', 
            padding: '2.5rem 2rem', 
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)' 
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)'
            }}>
              <AlertTriangle size={46} style={{ color: '#ef4444' }} />
            </div>

            <h2 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '0.02em' }}>
              CALIBRATION INCOMPLETE
            </h2>
            <p style={{ color: '#fca5a5', fontSize: '0.95rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              {calibResult?.error || 'Head movements were not recorded or face was not visible to the camera.'}
            </p>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem', textAlign: 'left', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>Tips for successful calibration:</div>
              • Center your head inside the biometric oval during the 3-second camera check.<br />
              • Turn your head slightly to face each red/green dot directly.<br />
              • Ensure your room has good frontal lighting and your webcam lens is clean.
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center' }}>
              <button 
                className="secondary-button" 
                onClick={handleCancel} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '12px', 
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.2)' 
                }}
              >
                Close
              </button>
              <button 
                className="rgb-button" 
                onClick={handleRecalibrate} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 2.25rem', 
                  borderRadius: '12px',
                  fontWeight: 700
                }}
              >
                <RotateCcw size={16} /> Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Calibration;
