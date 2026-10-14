import React from 'react';
import { AlertTriangle, Info, Keyboard, Sparkles, Target, MousePointer2 } from 'lucide-react';

const Help = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">EyeBase Guide & Controls</h1>
        <p className="subtitle">Master hands-free computer control using pupil eye tracking, smart fusion, intentional blinks, and mouth gestures.</p>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
        <div className="flex-col gap-6">
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <div style={{ background: 'var(--rgb-gradient)', width: '28px', height: '28px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>
                1
              </div>
              Hands-Free Interaction Steps
            </h3>
            
            <div className="flex-col gap-4">
              {[
                { title: 'Camera & Lighting', desc: 'Sit 50–70 cm directly facing your webcam in steady, comfortable lighting.' },
                { title: '9-Point Calibration', desc: 'Point your head at each dot (0.6s settle on red, 1.0s sample on green) to map your head range to full screen bounds.' },
                { title: 'Head-Motion Tracking', desc: 'Move your head naturally; the midpoint between nose tip and eyebrows controls cursor coordinates via homography.' },
                { title: 'One Euro Filter + Stillness Lock', desc: 'One Euro filter (cutoff 0.2 / beta 1.5) smooths motions; Stillness Lock freezes the cursor completely when steady (0.2s hold).' },
                { title: 'Intentional Blink → Left Click', desc: 'Hold eyes closed for 0.4s to trigger a left click (EAR < 0.17). Normal blinks will not click.' },
                { title: 'Mouth Opening → Scroll Mode', desc: 'Open your mouth briefly (0.2s) to toggle between MOVE mode and SCROLL mode.' },
                { title: 'Tilt Head to Scroll', desc: 'In SCROLL mode, tilt your head slightly up or down relative to baseline to scroll pages smoothly.' }
              ].map((step, index) => (
                <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>
                    {index + 1}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{step.title}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: '1.4' }}>{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ border: '1px solid #fca5a5', background: '#fef2f2' }}>
            <h3 style={{ marginBottom: '0.75rem', color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <AlertTriangle size={22} />
              Safety & Emergency Stop
            </h3>
            <p style={{ color: '#991b1b', lineHeight: 1.5, margin: 0, fontSize: '0.9rem' }}>
              Press <strong>ESC</strong> on your keyboard at any moment, or click the red <strong>EMERGENCY STOP</strong> button in the UI. 
              The system immediately releases cursor control and enters safety standby.
            </p>
          </div>
        </div>

        <div className="flex-col gap-6">
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <Keyboard size={22} color="var(--primary-color)" />
              Keyboard Shortcuts
            </h3>
            
            <div className="flex-col gap-3">
              {[
                { key: 'ESC', action: 'Emergency Stop / Halt Mouse Control immediately' },
                { key: 'P', action: 'Pause / Resume Mouse Control' },
                { key: 'R', action: 'Quick Recalibrate Head Position' },
                { key: 'Mouth Open', action: 'Gesture shortcut: Toggle MOVE ↔ SCROLL' },
                { key: '0.4s Blink', action: 'Gesture shortcut: Left Mouse Click' },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center" style={{ padding: '0.6rem 0', borderBottom: index < 4 ? '1px solid var(--border-color)' : 'none' }}>
                  <span style={{ background: '#0f172a', color: '#f8fafc', padding: '0.25rem 0.6rem', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                    {item.key}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', textAlign: 'right' }}>{item.action}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <Info size={22} color="var(--primary-color)" />
              Troubleshooting FAQ
            </h3>
            
            <div className="flex-col gap-4">
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Cursor drifts or doesn't reach screen corners?</h4>
                <div style={{ background: 'var(--hover-bg)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    Run the 9-point <strong>Homography Calibration</strong>. Make sure you point your head firmly toward each target dot. You can also increase <strong>Cursor Speed Multiplier</strong> in Settings.
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Blinks are triggering accidentally?</h4>
                <div style={{ background: 'var(--hover-bg)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    Increase <strong>Hold Duration for Click</strong> in Settings from 0.4s to 0.5s or lower the <strong>Blink Threshold (EAR)</strong> to 0.15 so normal blinks don't trigger clicks.
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Eliminating micro-jitters when trying to read or click?</h4>
                <div style={{ background: 'var(--hover-bg)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    Ensure <strong>Stillness Lock</strong> is enabled (default 4px enter / 8px exit with 0.2s hold). It automatically freezes cursor motion completely when your head is steady, eliminating any sensor noise.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
