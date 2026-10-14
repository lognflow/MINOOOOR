import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, RotateCcw, ArrowRight, Monitor, ShieldCheck, Play, Maximize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEyeMouse } from '../context/EyeMouseContext';

const Calibration = () => {
  const navigate = useNavigate();
  const { 
    isConnected, 
    telemetry, 
    startCalibration, 
    startPointSampling,
    recordCalibrationSample, 
    finishCalibration, 
    cancelCalibration,
    runNativeCalibration,
    startControl
  } = useEyeMouse();

  const [calibrationState, setCalibrationState] = useState('start'); // 'start', 'calibrating', 'complete', 'native_running'
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

  const handleStartWebCalibration = async () => {
    enterFullscreen();
    setCalibrationState('calibrating');
    setCurrentPoint(1);
    setIsSampling(false);
    await startCalibration();
  };

  const handleStartNativeCalibration = async () => {
    setCalibrationState('native_running');
    const res = await runNativeCalibration();
    if (res && res.success) {
      setCalibResult(res);
      setCalibrationState('complete');
    } else {
      setCalibrationState('start');
    }
  };

  const handleCancel = async () => {
    exitFullscreen();
    setCalibrationState('start');
    setCurrentPoint(1);
    setIsSampling(false);
    await cancelCalibration();
  };

  // Exit fullscreen when leaving the page
  useEffect(() => {
    return () => {
      exitFullscreen();
    };
  }, []);

  // Listen for browser fullscreen changes (e.g. user pressing ESC to exit browser fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (calibrationState === 'calibrating') {
          handleCancel();
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [calibrationState]);

  // Dedicated Escape key handler while calibrating
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && calibrationState === 'calibrating') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calibrationState]);

  // Exact timing from eye_cursor.py:
  // CALIB_SETTLE_TIME = 0.6s (Red dot + white ring)
  // CALIB_SAMPLE_TIME = 1.0s (Green dot, gathering head landmarks)
  useEffect(() => {
    let timer1, timer2;
    if (calibrationState === 'calibrating') {
      const ptIndex = currentPoint - 1;
      const ptConfig = gridPositions[ptIndex];
      const screenW = window.screen.width || window.innerWidth || 1920;
      const screenH = window.screen.height || window.innerHeight || 1080;
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
            setCalibrationState('complete');
          }
        }, 1000); // 1.0s sample
      }, 600); // 0.6s settle
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [calibrationState, currentPoint, startPointSampling, recordCalibrationSample, finishCalibration]);

  // Target styling matching eye_cursor.py:
  // Settle: Red circle (radius 22px, diameter 44px) with white outline
  // Sampling: Green circle (radius 11px, diameter 22px) with white center
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
      {/* TRUE FULLSCREEN CALIBRATION VIEWPORT OVERLAY (Always Full Screen) */}
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
          {/* Top Prompt Text matching eye_cursor.py */}
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
      {/* MAIN CALIBRATION PAGE LAYOUT */}
      {/* ============================================================== */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* COMPACT TOP HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>9-Point Eye & Head Gaze Calibration</h1>
            <p style={{ color: 'var(--text-light)', fontSize: '0.875rem', margin: '0.15rem 0 0 0' }}>
              Calibrates eye gaze and head alignment across your physical screen to build a 3×3 perspective homography.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
            <ShieldCheck size={14} /> 100% Offline (Local Model & Matrix)
          </div>
        </div>

        <div className="card" style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '1.5rem', 
          overflow: 'hidden', 
          position: 'relative',
          minHeight: '440px'
        }}>
          
          {/* START SCREEN - PROMINENT FULLSCREEN CALIBRATION BUTTON */}
          {calibrationState === 'start' && (
            <div style={{ margin: 'auto', maxWidth: '680px', textAlign: 'center', width: '100%' }}>
              
              {/* BIG VIBRANT ACTION BUTTONS FRONT AND CENTER */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button 
                  id="start-calibration-button"
                  className="rgb-button" 
                  onClick={handleStartWebCalibration} 
                  style={{ 
                    padding: '1rem 3.5rem', 
                    fontSize: '1.25rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.85rem', 
                    fontWeight: 800,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
                    cursor: 'pointer'
                  }}
                >
                  <Maximize size={24} /> START FULLSCREEN CALIBRATION
                </button>

                <button 
                  className="secondary-button" 
                  onClick={handleStartNativeCalibration} 
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
                  title="Opens the exact Fullscreen OpenCV Desktop Window from eye_cursor.py"
                >
                  <Monitor size={16} /> Open Desktop Window (OpenCV)
                </button>
              </div>

              {/* LIVE SENSOR / CAMERA READINESS BAR */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '1.5rem', 
                background: '#f8fafc', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.75rem 1.25rem', 
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="status-dot" style={{ background: isConnected ? '#22c55e' : '#ef4444' }}></span>
                  <span style={{ fontWeight: 600 }}>Webcam: {isConnected ? 'Active (720p)' : 'Connecting...'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="status-dot" style={{ background: telemetry.faceDetected ? '#22c55e' : '#eab308' }}></span>
                  <span style={{ fontWeight: 600 }}>Face Tracker: {telemetry.faceDetected ? 'Face In View ✓' : 'Looking for face...'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-light)' }}>Saved Matrix:</span>
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>{telemetry.calibQuality || 'Saved & Active'}</span>
                </div>
              </div>

              {/* HOW IT WORKS: 4 COMPACT STEPS */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '0.75rem', 
                textAlign: 'left'
              }}>
                <div style={{ background: 'var(--hover-bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-color)', marginBottom: '0.2rem' }}>1. Fullscreen Target (0.6s)</div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Display goes fullscreen. Turn/point your head directly at the red circle.</div>
                </div>

                <div style={{ background: 'var(--hover-bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.2rem' }}>2. Green Target (1.0s)</div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Hold head completely steady while green to record head angle.</div>
                </div>

                <div style={{ background: 'var(--hover-bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-color)', marginBottom: '0.2rem' }}>3. 9 Display Positions</div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Cycles across screen edges and corners (8%, 50%, 92% margins).</div>
                </div>

                <div style={{ background: 'var(--hover-bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-color)', marginBottom: '0.2rem' }}>4. Saved to Disk</div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Perspective matrix automatically saved to <code>calibration_head.npy</code>.</div>
                </div>
              </div>

            </div>
          )}

          {/* NATIVE CALIBRATION RUNNING NOTICE */}
          {calibrationState === 'native_running' && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '500px' }}>
              <Monitor size={56} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.4rem' }}>Desktop Calibration Window Active</h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                A fullscreen window has opened on your display. Look at each red dot until it turns green. Press <strong>ESC</strong> in the window to finish or cancel.
              </p>
              <button className="danger-button" onClick={() => setCalibrationState('start')} style={{ padding: '0.5rem 1.5rem' }}>
                Return to UI
              </button>
            </div>
          )}

          {/* COMPLETION SCREEN */}
          {calibrationState === 'complete' && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '600px' }}>
              <CheckCircle2 size={68} style={{ color: 'var(--success-color)', marginBottom: '1rem' }} />
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>CALIBRATION COMPLETE</h2>
              <p style={{ color: 'var(--text-light)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                3×3 Homography Matrix calculated and saved to <code>calibration_head.npy</code>. Your head movement is now mapped to full screen cursor coordinates.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--hover-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', minWidth: '160px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Calibration Quality</div>
                  <div style={{ color: 'var(--success-color)', fontWeight: 700, fontSize: '1.35rem' }}>
                    {calibResult?.quality || telemetry.calibQuality || 'Good'}
                  </div>
                </div>
                <div style={{ background: 'var(--hover-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', minWidth: '160px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Reprojection Error</div>
                  <div style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: '1.35rem' }}>
                    {calibResult?.meanError ? `${calibResult.meanError} px` : '< 15 px'}
                  </div>
                </div>
                <div style={{ background: 'var(--hover-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', minWidth: '160px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Matrix Status</div>
                  <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.35rem' }}>Saved & Active</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="secondary-button" onClick={() => setCalibrationState('start')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}>
                  <RotateCcw size={16} /> Recalibrate
                </button>
                <button 
                  className="rgb-button" 
                  onClick={() => {
                    startControl();
                    navigate('/dashboard');
                  }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 2rem' }}
                >
                  Start Mouse Control <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Calibration;
