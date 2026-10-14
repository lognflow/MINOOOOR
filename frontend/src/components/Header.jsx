import React from 'react';
import { Settings, Square, Play, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEyeMouse } from '../context/EyeMouseContext';

const Header = () => {
  const { isConnected, telemetry, startControl, pauseControl, stopControl, toggleMode } = useEyeMouse();

  return (
    <div className="header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 className="header-title">EyeBase</h1>
        {isConnected && (
          <button 
            onClick={toggleMode}
            title="Click to toggle MOVE / SCROLL mode (or open mouth)"
            style={{
              background: telemetry.mode === 'SCROLL' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: telemetry.mode === 'SCROLL' ? '#0891b2' : '#15803d',
              border: `1px solid ${telemetry.mode === 'SCROLL' ? '#06b6d4' : '#22c55e'}`,
              borderRadius: 'var(--radius-full)',
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            MODE: {telemetry.mode}
          </button>
        )}
      </div>
      
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="header-status">
          <span 
            className="status-dot" 
            style={{ 
              background: !isConnected ? '#ef4444' : (telemetry.isControlling ? (telemetry.isPaused ? '#eab308' : '#22c55e') : '#3b82f6') 
            }}
          ></span>
          <span style={{ fontWeight: 600 }}>
            {!isConnected 
              ? 'Backend Offline' 
              : (telemetry.isControlling 
                  ? (telemetry.isPaused ? 'Control Paused' : 'Tracking Active') 
                  : (telemetry.faceDetected ? 'Face Ready' : 'System Ready'))}
          </span>
        </div>

        {isConnected && telemetry.isControlling && (
          <button 
            onClick={stopControl} 
            className="danger-button" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Emergency Stop (ESC)"
          >
            <Square size={14} /> STOP
          </button>
        )}

        <Link to="/settings" className="header-action">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
};

export default Header;
