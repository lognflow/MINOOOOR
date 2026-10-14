import React from 'react';
import { Play, Pause, Square, ArrowRight, MousePointer2, Move, Eye, Smile, RefreshCw } from 'lucide-react';
import { useEyeMouse } from '../context/EyeMouseContext';

const MouseControl = () => {
  const { 
    isConnected, 
    telemetry, 
    settings, 
    startControl, 
    pauseControl, 
    resumeControl, 
    stopControl, 
    toggleMode 
  } = useEyeMouse();

  const isBlinking = telemetry.eyesDetected && telemetry.ear < settings.blinkEarThreshold;
  const isMouthOpen = telemetry.mouthDetected && telemetry.mar > settings.mouthOpenThreshold;
  const isHeadActive = telemetry.faceDetected && !telemetry.stillnessLocked;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Mouse Control</h1>
          <p className="subtitle">Real-time mapping of natural head tracking and facial gestures to mouse actions.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="secondary-button" 
            onClick={toggleMode}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              borderColor: telemetry.mode === 'SCROLL' ? '#06b6d4' : undefined,
              color: telemetry.mode === 'SCROLL' ? '#0891b2' : undefined
            }}
          >
            <RefreshCw size={16} /> Switch to {telemetry.mode === 'MOVE' ? 'SCROLL' : 'MOVE'} Mode
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div className="system-status" style={{ 
            background: telemetry.isControlling ? 'rgba(34, 197, 94, 0.1)' : 'var(--hover-bg)', 
            padding: '0.5rem 1.25rem', 
            borderRadius: 'var(--radius-full)',
            border: telemetry.isControlling ? '1px solid #22c55e' : '1px solid var(--border-color)'
          }}>
            <span className={`status-dot ${telemetry.isControlling ? (telemetry.isPaused ? 'status-warning' : 'status-active') : 'status-inactive'}`}></span>
            <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>
              {!isConnected 
                ? 'BACKEND OFFLINE' 
                : (telemetry.isControlling 
                    ? (telemetry.isPaused ? 'MOUSE CONTROL PAUSED' : 'MOUSE CONTROL ACTIVE') 
                    : 'MOUSE CONTROL STANDBY')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3" style={{ gap: '2rem', marginTop: '2rem' }}>
          {/* Eye Gaze & Head Aim */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-lg)',
            background: isHeadActive ? 'rgba(59, 130, 246, 0.08)' : 'var(--hover-bg)',
            border: isHeadActive ? '2px solid var(--primary-color)' : '1px solid transparent',
            transition: 'all 0.2s'
          }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '2.25rem' }}>🎯</span>
            </div>
            <h3 style={{ margin: 0 }}>Head Motion Tracking</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              {telemetry.stillnessLocked ? '🔒 Stillness Locked' : (telemetry.faceDetected ? `🟢 Head [${telemetry.headPoint ? telemetry.headPoint[0] : 0.5}, ${telemetry.headPoint ? telemetry.headPoint[1] : 0.5}]` : '⚪ Searching Face')}
            </span>
            <ArrowRight color="var(--text-light)" />
            <div className="rgb-border" style={{ padding: '0.75rem', width: '100%', background: 'white' }}>
              <span style={{ fontWeight: 700 }}>Cursor (1-Euro + Stillness Lock)</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                X: {telemetry.cursor.x} | Y: {telemetry.cursor.y}
              </div>
            </div>
          </div>

          {/* Intentional Blink */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-lg)',
            background: isBlinking ? 'rgba(34, 197, 94, 0.12)' : 'var(--hover-bg)',
            border: isBlinking ? '2px solid #22c55e' : '1px solid transparent',
            transition: 'all 0.2s'
          }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '2.25rem' }}>👁️</span>
            </div>
            <h3 style={{ margin: 0 }}>Intentional Blink</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              EAR: {telemetry.ear} (Threshold: {settings.blinkEarThreshold})
            </span>
            <ArrowRight color="var(--text-light)" />
            <div className="rgb-border" style={{ padding: '0.75rem', width: '100%', background: 'white' }}>
              <span style={{ fontWeight: 700, color: telemetry.statusText === 'CLICK!' ? '#15803d' : 'inherit' }}>
                {telemetry.statusText === 'CLICK!' ? '✨ LEFT CLICK SENT!' : (telemetry.clickHoldRatio > 0 ? `Holding (${Math.round(telemetry.clickHoldRatio * 100)}%)` : 'Left Click (Hold 0.4s)')}
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                Total Clicks: {telemetry.clickCount}
              </div>
            </div>
          </div>

          {/* Mouth Opening */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius-lg)',
            background: isMouthOpen || telemetry.mode === 'SCROLL' ? 'rgba(6, 182, 212, 0.12)' : 'var(--hover-bg)',
            border: telemetry.mode === 'SCROLL' ? '2px solid #06b6d4' : '1px solid transparent',
            transition: 'all 0.2s'
          }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '2.25rem' }}>👄</span>
            </div>
            <h3 style={{ margin: 0 }}>Mouth Opening</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              MAR: {telemetry.mar} | Mode: {telemetry.mode}
            </span>
            <ArrowRight color="var(--text-light)" />
            <div className="rgb-border" style={{ padding: '0.75rem', width: '100%', background: 'white' }}>
              <span style={{ fontWeight: 700, color: telemetry.mode === 'SCROLL' ? '#0891b2' : 'inherit' }}>
                {telemetry.mode === 'SCROLL' ? '📜 SCROLL MODE ACTIVE' : 'Switch Mode (Hold 0.2s)'}
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                {telemetry.mode === 'SCROLL' ? (telemetry.scrollAmount !== 0 ? `Tilt head (${telemetry.scrollAmount})` : 'Tilt head up/down') : 'Move cursor mode'}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Cursor Coordinates Card */}
        <div style={{ marginTop: '3rem', padding: '1.5rem 3rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', display: 'inline-block', minWidth: '360px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <MousePointer2 color="var(--primary-color)" size={20} />
            <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>Live Cursor Screen Coordinates</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '1.75rem', fontWeight: 800 }}>
            <span>X: <span style={{ color: 'var(--primary-color)' }}>{telemetry.cursor.x}</span></span>
            <span>Y: <span style={{ color: 'var(--primary-color)' }}>{telemetry.cursor.y}</span></span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
            Raw tracking: ({telemetry.cursor.rawX}, {telemetry.cursor.rawY}) • Quality: {telemetry.calibQuality}
          </div>
        </div>
      </div>

      <div className="controls-row">
        {!telemetry.isControlling ? (
          <button className="rgb-button" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }} onClick={startControl}>
            <Play size={24} /> START MOUSE CONTROL
          </button>
        ) : telemetry.isPaused ? (
          <button className="rgb-button" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }} onClick={resumeControl}>
            <Play size={24} /> RESUME CONTROL
          </button>
        ) : (
          <button className="secondary-button" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }} onClick={pauseControl}>
            <Pause size={24} /> PAUSE CONTROL (P)
          </button>
        )}
        <button className="danger-button" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }} onClick={stopControl}>
          <Square size={24} /> EMERGENCY STOP (ESC)
        </button>
      </div>
    </div>
  );
};

export default MouseControl;
