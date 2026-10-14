import React, { useState, useEffect, useRef } from 'react';
import { Activity, Clock, Shield, Move, Eye, Smile, RefreshCw } from 'lucide-react';
import { useEyeMouse } from '../context/EyeMouseContext';

const Monitoring = () => {
  const { isConnected, telemetry, settings } = useEyeMouse();
  const [history, setHistory] = useState([]);
  const maxHistory = 40;

  useEffect(() => {
    if (telemetry.cursor) {
      setHistory((prev) => {
        const next = [...prev, { x: telemetry.cursor.x, y: telemetry.cursor.y, time: Date.now() }];
        return next.slice(-maxHistory);
      });
    }
  }, [telemetry.cursor?.x, telemetry.cursor?.y]);

  // Compute SVG polyline points
  const screenW = window.screen.width || 1920;
  const screenH = window.screen.height || 1080;

  const getPoints = (coordKey, svgH) => {
    if (history.length < 2) return '';
    return history
      .map((item, idx) => {
        const px = (idx / (maxHistory - 1)) * 800;
        const norm = coordKey === 'x' ? item.x / screenW : item.y / screenH;
        const py = (1 - Math.min(Math.max(norm, 0), 1)) * (svgH - 20) + 10;
        return `${px},${py}`;
      })
      .join(' ');
  };

  const earPercent = Math.min(Math.round((telemetry.ear / 0.35) * 100), 100);
  const marPercent = Math.min(Math.round((telemetry.mar / 0.70) * 100), 100);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Real-Time Performance & Diagnostics</h1>
        <p className="subtitle">High-frequency system metrics, detection confidence, and cursor trajectory tracking.</p>
      </div>

      <div className="metrics-grid">
        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} color="var(--primary-color)" /> CAPTURE FPS
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-color)' }}>
            {telemetry.fps || 0}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--primary-color)" /> INFERENCE LATENCY
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-color)' }}>
            {telemetry.latencyMs || 0} <span style={{ fontSize: '1rem', color: 'var(--text-light)', fontWeight: 500 }}>ms</span>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} color="var(--primary-color)" /> ENGINE TRACKING STATE
          </div>
          <div className="system-status" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span 
              className="status-dot" 
              style={{ 
                width: '16px', 
                height: '16px', 
                background: !isConnected 
                  ? '#ef4444' 
                  : (telemetry.isControlling ? (telemetry.isPaused ? '#eab308' : '#22c55e') : '#3b82f6') 
              }}
            ></span>
            <span className="rgb-text" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {!isConnected 
                ? 'OFFLINE' 
                : (telemetry.isControlling 
                    ? (telemetry.isPaused ? 'CONTROL PAUSED' : 'TRACKING ACTIVE') 
                    : 'STANDBY READY')}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginLeft: 'auto', background: 'var(--hover-bg)', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
              Quality: {telemetry.calibQuality}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Detection Status Bars */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Gesture Detection Confidence</h3>
          <div className="flex-col gap-4">
            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>Face Detection</span>
                <span style={{ fontWeight: 700, color: telemetry.faceDetected ? 'var(--success-color)' : '#ef4444' }}>
                  {telemetry.faceDetected ? '100%' : '0%'}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--hover-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: telemetry.faceDetected ? '100%' : '0%', height: '100%', background: 'var(--success-color)', transition: 'width 0.2s' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>Eye Openness (EAR: {telemetry.ear})</span>
                <span style={{ fontWeight: 700, color: telemetry.ear < settings.blinkEarThreshold ? '#eab308' : 'var(--success-color)' }}>
                  {earPercent}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--hover-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${earPercent}%`, height: '100%', background: telemetry.ear < settings.blinkEarThreshold ? '#eab308' : '#3b82f6', transition: 'width 0.1s' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>Blink Click Hold Ratio</span>
                <span style={{ fontWeight: 700, color: telemetry.statusText === 'CLICK!' ? 'var(--success-color)' : 'var(--primary-color)' }}>
                  {Math.round(telemetry.clickHoldRatio * 100)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--hover-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(telemetry.clickHoldRatio * 100)}%`, height: '100%', background: 'var(--success-color)', transition: 'width 0.05s' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>Mouth Opening (MAR: {telemetry.mar})</span>
                <span style={{ fontWeight: 700, color: telemetry.mode === 'SCROLL' ? '#06b6d4' : 'var(--text-light)' }}>
                  {marPercent}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--hover-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${marPercent}%`, height: '100%', background: '#06b6d4', transition: 'width 0.1s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* System States Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Active System Pipeline</h3>
          <div className="flex-col gap-3">
            {[
              { label: 'Camera Thread', value: isConnected ? telemetry.cameraResolution : 'Offline', active: isConnected },
              { label: 'Tracking Mode Engine', value: `${telemetry.trackingMode || 'HYBRID'} Fusion`, active: true },
              { label: 'Eye Gaze Vector', value: telemetry.gazeVector ? `[${telemetry.gazeVector[0]}, ${telemetry.gazeVector[1]}]` : '[0.0, 0.0]', active: telemetry.eyesDetected },
              { label: 'Pupils (Left / Right Iris)', value: telemetry.leftIris ? `${telemetry.leftIris[0]}, ${telemetry.rightIris[0]}` : 'Tracking', active: telemetry.eyesDetected },
              { label: 'Head Pose (Nose & Brow)', value: `[${telemetry.headPoint ? telemetry.headPoint[0] : 0.5}, ${telemetry.headPoint ? telemetry.headPoint[1] : 0.5}]`, active: telemetry.faceDetected },
              { label: 'Adaptive Jitter Filter', value: settings.oneEuroFilterEnabled ? `Active (Deadzone: ${settings.jitterDeadzone || 2.5}px)` : 'Bypassed', active: settings.oneEuroFilterEnabled },
              { label: 'Stillness Stabilizer', value: telemetry.stillnessLocked ? 'Locked (Rock Solid)' : 'Tracking Aim', active: telemetry.stillnessLocked },
              { label: 'Homography Calibration', value: telemetry.calibQuality ? `Active (${telemetry.calibQuality})` : 'Uncalibrated', active: !!telemetry.calibQuality },
              { label: 'Interaction Mode', value: telemetry.mode, active: telemetry.mode === 'SCROLL' }
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center" style={{ padding: '0.45rem 0', borderBottom: index < 8 ? '1px solid var(--border-color)' : 'none' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-light)' }}>{item.label}</span>
                <div className="system-status">
                  <span className={`status-dot ${item.active ? 'status-active' : 'status-inactive'}`}></span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Cursor Movement Trajectory Plot */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Live Cursor Trajectory History</h3>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '3px', background: '#3b82f6', borderRadius: '2px' }}></div>
                X Axis (0 - {screenW})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '3px', background: '#10b981', borderRadius: '2px' }}></div>
                Y Axis (0 - {screenH})
              </div>
            </div>
          </div>

          <div style={{ height: '220px', width: '100%', background: '#090d16', borderRadius: 'var(--radius-md)', position: 'relative', overflow: 'hidden', padding: '10px' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="50" x2="800" y2="50" stroke="#1e293b" strokeDasharray="4" />
              <line x1="0" y1="100" x2="800" y2="100" stroke="#1e293b" strokeDasharray="4" />
              <line x1="0" y1="150" x2="800" y2="150" stroke="#1e293b" strokeDasharray="4" />

              {/* X Trajectory */}
              {history.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPoints('x', 200)}
                />
              )}

              {/* Y Trajectory */}
              {history.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPoints('y', 200)}
                />
              )}
            </svg>

            <div style={{ position: 'absolute', bottom: '0.75rem', right: '1rem', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              Current: X: {telemetry.cursor.x} | Y: {telemetry.cursor.y}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
