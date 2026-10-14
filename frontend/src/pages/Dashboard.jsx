import React from 'react';
import { Play, Pause, Square, User, Video, Target, ArrowUpRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEyeMouse } from '../context/EyeMouseContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    isConnected, 
    telemetry, 
    settings, 
    startControl, 
    pauseControl, 
    resumeControl, 
    stopControl, 
    toggleMode,
    startCalibrationFlow
  } = useEyeMouse();

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Eye-Controlled Mouse</h1>
          <p className="subtitle">Real-time hands-free control with high-accuracy eye gaze tracking, zero-jitter stabilization, and facial gestures.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="secondary-button" 
            onClick={startCalibrationFlow} 
            title="Press C on keyboard anytime to start calibration"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <Target size={18} /> Calibrate (Press C)
          </button>
          <button 
            className="secondary-button" 
            onClick={() => navigate('/settings')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.5rem 1rem',
              borderColor: telemetry.stillnessLocked ? '#10b981' : undefined,
              color: telemetry.stillnessLocked ? '#10b981' : undefined
            }}
          >
            Stillness Lock: {telemetry.stillnessLocked ? 'Locked' : 'Active'}
          </button>
          <button 
            className="secondary-button" 
            onClick={toggleMode} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.5rem 1rem',
              borderColor: telemetry.mode === 'SCROLL' ? '#06b6d4' : undefined,
              color: telemetry.mode === 'SCROLL' ? '#0891b2' : undefined
            }}
          >
            Mode: {telemetry.mode}
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Camera Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} color="var(--primary-color)" />
              <h3 style={{ margin: 0, fontSize: '1rem', letterSpacing: '0.05em' }}>LIVE TRACKING FEED</h3>
            </div>
            <div className="system-status">
              <span 
                className="status-dot" 
                style={{ 
                  background: !isConnected 
                    ? '#ef4444' 
                    : (telemetry.isControlling ? (telemetry.isPaused ? '#eab308' : '#22c55e') : '#3b82f6') 
                }}
              ></span>
              <span className="rgb-text" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                {!isConnected 
                  ? 'OFFLINE' 
                  : (telemetry.isControlling 
                      ? (telemetry.isPaused ? 'CONTROL PAUSED' : 'TRACKING ACTIVE') 
                      : 'STANDBY')}
              </span>
            </div>
          </div>

          <div style={{ 
            flex: 1, 
            backgroundColor: '#0f172a', 
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative',
            minHeight: '340px',
            overflow: 'hidden',
            border: '1px solid #1e293b'
          }}>
            {isConnected ? (
              <img 
                src="/video_feed" 
                alt="EyeBase Live Tracking Stream" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                <User size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>Waiting for EyeBase Backend</p>
                <p style={{ fontSize: '0.875rem', maxWidth: '300px', margin: '0 auto' }}>
                  Make sure python backend is running on <code>http://127.0.0.1:8000</code>.
                </p>
              </div>
            )}

            {/* Live Detection Indicators */}
            {isConnected && (
              <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', zIndex: 10 }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Face: <span style={{ color: telemetry.faceDetected ? '#22c55e' : '#ef4444' }}>{telemetry.faceDetected ? '✓ Detected' : '✗ None'}</span>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Eyes: <span style={{ color: telemetry.eyesDetected ? '#22c55e' : '#ef4444' }}>{telemetry.eyesDetected ? `EAR ${telemetry.ear}` : '✗'}</span>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Mouth: <span style={{ color: telemetry.mouthDetected ? (telemetry.mar > settings.mouthOpenThreshold ? '#06b6d4' : '#22c55e') : '#ef4444' }}>
                    {telemetry.mouthDetected ? (telemetry.mar > settings.mouthOpenThreshold ? 'Open (Scroll)' : 'Closed') : '✗'}
                  </span>
                </div>
              </div>
            )}

            {/* Click Hold Progress Overlay */}
            {isConnected && telemetry.clickHoldRatio > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '0.75rem', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                background: 'rgba(15, 23, 42, 0.9)', 
                padding: '0.35rem 0.75rem', 
                borderRadius: '6px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                border: '1px solid #22c55e',
                zIndex: 10
              }}>
                <span style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 700 }}>HOLDING BLINK:</span>
                <div style={{ width: '100px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(telemetry.clickHoldRatio * 100)}%`, height: '100%', background: '#22c55e', transition: 'width 0.05s' }}></div>
                </div>
              </div>
            )}
            
            {/* Real-time FPS & Latency Overlay */}
            <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', background: 'rgba(15, 23, 42, 0.85)', color: '#f8fafc', padding: '0.35rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
              FPS: {telemetry.fps || 30} | Latency: {telemetry.latencyMs || 25} ms
            </div>
          </div>
        </div>

        {/* System Status Card */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', letterSpacing: '0.05em' }}>SYSTEM STATUS</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', background: 'var(--hover-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              Quality: {telemetry.calibQuality}
            </span>
          </div>
          <div className="flex-col gap-3">
            {[
              { label: 'Camera Device', status: isConnected ? telemetry.cameraResolution : 'Disconnected', active: isConnected },
              { label: 'Face Tracking', status: telemetry.faceDetected ? 'Locked (Nose+Brow)' : 'Searching', active: telemetry.faceDetected },
              { label: 'Tracking Mode', status: telemetry.mode === 'SCROLL' ? 'SCROLL (Head Tilt)' : 'MOVE (Cursor)', active: true },
              { label: 'One Euro Filter', status: settings.oneEuroFilterEnabled ? 'Active (Cutoff 0.2 / Beta 1.5)' : 'Disabled', active: settings.oneEuroFilterEnabled },
              { label: 'Stillness Lock', status: telemetry.stillnessLocked ? 'Locked (Steady)' : 'Dynamic Tracking', active: telemetry.stillnessLocked },
              { label: 'Blink EAR', status: telemetry.ear < settings.blinkEarThreshold ? 'Closed (Holding Click)' : `Open (${telemetry.ear})`, active: telemetry.eyesDetected },
              { label: 'Mouth MAR', status: telemetry.mar > settings.mouthOpenThreshold ? 'Open (Toggle Trigger)' : `Closed (${telemetry.mar})`, active: telemetry.mouthDetected },
              { label: 'Mouse Control', status: telemetry.isControlling ? (telemetry.isPaused ? 'Paused' : 'Active') : 'Standby', active: telemetry.isControlling && !telemetry.isPaused }
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center" style={{ paddingBottom: '0.55rem', borderBottom: index < 7 ? '1px solid var(--border-color)' : 'none' }}>
                <span style={{ color: 'var(--text-light)', fontWeight: 500, fontSize: '0.875rem' }}>{item.label}</span>
                <div className="system-status">
                  <span className={`status-dot ${item.active ? 'status-active' : 'status-inactive'}`}></span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Metrics Grid */}
      <div className="metrics-grid">
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>Cursor Position</h4>
            <span style={{ fontSize: '0.75rem', color: telemetry.stillnessLocked ? '#10b981' : 'var(--text-light)', fontWeight: 600 }}>
              {telemetry.stillnessLocked ? 'STILL LOCK' : 'MOVING'}
            </span>
          </div>
          <div className="flex justify-between" style={{ alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>X (pixels)</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-color)' }}>{telemetry.cursor.x}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Y (pixels)</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-color)' }}>{telemetry.cursor.y}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>Blink Left Click</h4>
            <div className="system-status">
              <span className={`status-dot ${telemetry.statusText === 'CLICK!' ? 'status-active' : (telemetry.clickHoldRatio > 0 ? 'status-warning' : 'status-active')}`}></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                {telemetry.statusText === 'CLICK!' ? 'CLICKED!' : (telemetry.clickHoldRatio > 0 ? `${Math.round(telemetry.clickHoldRatio * 100)}%` : 'READY')}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            {telemetry.statusText === 'CLICK!' ? 'Left Click Sent' : (telemetry.ear < settings.blinkEarThreshold ? 'Holding Click (0.4s)...' : 'Eyes Open')}
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', margin: 0 }}>
            EAR: {telemetry.ear} | Clicks: {telemetry.clickCount}
          </p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>Head Position</h4>
            <div className="system-status">
              <span className="status-dot status-active"></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>NOSE+BROW</span>
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', color: '#10b981' }}>
            [{telemetry.headPoint ? telemetry.headPoint[0] : 0.5}, {telemetry.headPoint ? telemetry.headPoint[1] : 0.5}]
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', margin: 0 }}>
            Mode: {telemetry.mode} | MAR: {telemetry.mar}
          </p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>Stillness & Calibration</h4>
            <div className="system-status">
              <span className="status-dot status-active"></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{telemetry.stillnessLocked ? 'LOCKED' : 'TRACKING'}</span>
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            {telemetry.stillnessLocked ? 'Steady Lock (0 Drift)' : (telemetry.faceDetected ? '1-Euro Smoothed' : 'Searching Face')}
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', margin: 0 }}>
            Hysteresis: 4px/8px | Quality: {telemetry.calibQuality}
          </p>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="controls-row" style={{ marginTop: '2rem' }}>
        {!telemetry.isControlling ? (
          <button 
            className="rgb-button" 
            style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }} 
            onClick={startControl}
          >
            <Play size={24} /> START MOUSE CONTROL
          </button>
        ) : telemetry.isPaused ? (
          <button 
            className="rgb-button" 
            style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }} 
            onClick={resumeControl}
          >
            <Play size={24} /> RESUME CONTROL
          </button>
        ) : (
          <button 
            className="secondary-button" 
            style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }} 
            onClick={pauseControl}
          >
            <Pause size={24} /> PAUSE CONTROL (P)
          </button>
        )}

        <button 
          className="danger-button" 
          style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }} 
          onClick={stopControl}
          title="Instantly halts mouse movement (ESC)"
        >
          <Square size={24} /> EMERGENCY STOP (ESC)
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
