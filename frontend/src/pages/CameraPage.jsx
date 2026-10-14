import React from 'react';
import { Camera, User, Settings2, Sliders, CheckCircle2 } from 'lucide-react';
import { useEyeMouse } from '../context/EyeMouseContext';

const CameraPage = () => {
  const { isConnected, telemetry, settings, updateSettings } = useEyeMouse();

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Camera Feed & Diagnostics</h1>
        <p className="subtitle">Real-time video diagnostics, landmark mesh overlay, and camera parameters.</p>
      </div>

      <div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>
        {/* Main Video Stream */}
        <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            flex: 1, 
            backgroundColor: '#0f172a', 
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative',
            minHeight: '440px',
            overflow: 'hidden',
            border: '1px solid #1e293b'
          }}>
            {isConnected ? (
              <img 
                src="/video_feed" 
                alt="EyeBase Live Camera Preview" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                <User size={80} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>No Camera Stream Available</h3>
                <p style={{ fontSize: '0.875rem' }}>Start the EyeBase backend to enable OpenCV camera feed.</p>
              </div>
            )}

            <div style={{ 
              position: 'absolute', 
              top: '1rem', 
              right: '1rem', 
              background: 'rgba(15, 23, 42, 0.85)', 
              color: 'white', 
              padding: '0.35rem 0.85rem', 
              borderRadius: '4px', 
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              LIVE OPENCV STREAM
            </div>

            <div style={{ 
              position: 'absolute', 
              bottom: '1rem', 
              left: '1rem', 
              background: 'rgba(15, 23, 42, 0.85)', 
              color: '#38bdf8', 
              padding: '0.35rem 0.85rem', 
              borderRadius: '4px', 
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              Res: {telemetry.cameraResolution} | {telemetry.fps} FPS | Latency: {telemetry.latencyMs} ms
            </div>
          </div>
        </div>

        {/* Diagnostic Panels */}
        <div className="flex-col gap-6">
          {/* Camera Settings */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={18} color="var(--primary-color)" /> Camera Parameters
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Camera Source</label>
              <select style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', background: 'white' }}>
                <option>Camera Index 0 (Primary Webcam)</option>
              </select>
            </div>

            <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Camera Status</span>
              <div className="system-status">
                <span className={`status-dot ${isConnected ? 'status-active' : 'status-inactive'}`}></span>
                <span style={{ fontWeight: 600 }}>{isConnected ? 'Connected' : 'Offline'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Capture FPS</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{telemetry.fps}</span>
            </div>

            <div className="flex justify-between items-center">
              <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Resolution</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{telemetry.cameraResolution}</span>
            </div>
          </div>

          {/* Detection Toggles */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="var(--primary-color)" /> Detection Overlays
            </h3>
            
            <div className="flex-col gap-3">
              {[
                { key: 'showLandmarks', label: 'Draw Facial Landmarks', checked: settings.showLandmarks },
                { key: 'showHud', label: 'Draw Camera HUD Overlay', checked: settings.showHud },
                { key: 'leftClickOnBlink', label: 'Enable Blink Left Click', checked: settings.leftClickOnBlink },
                { key: 'scrollModeEnabled', label: 'Enable Mouth Scroll Mode', checked: settings.scrollModeEnabled },
                { key: 'stillnessLockEnabled', label: 'Enable Stillness Lock', checked: settings.stillnessLockEnabled },
                { key: 'oneEuroFilterEnabled', label: 'Enable 1-Euro Filter', checked: settings.oneEuroFilterEnabled },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</span>
                  <input 
                    type="checkbox" 
                    checked={item.checked} 
                    onChange={() => handleToggle(item.key)}
                    style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--primary-color)', cursor: 'pointer' }} 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Camera Environmental Quality */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} color="var(--success-color)" /> Feed Quality Checks
            </h3>
            
            <div className="flex-col gap-3">
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Lighting Condition</span>
                <span style={{ color: telemetry.lighting === 'Good' ? 'var(--success-color)' : '#eab308', fontWeight: 600 }}>
                  {telemetry.lighting}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Face Presence</span>
                <span style={{ color: telemetry.faceDetected ? 'var(--success-color)' : '#ef4444', fontWeight: 600 }}>
                  {telemetry.faceDetected ? 'Detected' : 'Searching'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>Calibration Quality</span>
                <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>
                  {telemetry.calibQuality}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraPage;
