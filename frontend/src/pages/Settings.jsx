import React, { useState } from 'react';
import { Save, RotateCcw, Check, Sliders, Eye, Smile, MousePointer, ShieldCheck, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEyeMouse } from '../context/EyeMouseContext';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, telemetry } = useEyeMouse();
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [savedFeedback, setSavedFeedback] = useState(false);

  React.useEffect(() => {
    setLocalSettings((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const handleChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value });
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleReset = () => {
    const defaults = {
      oneEuroMinCutoff: 0.2,
      oneEuroBeta: 1.5,
      oneEuroDcutoff: 1.0,
      oneEuroFilterEnabled: true,
      blinkEarThreshold: 0.17,
      blinkHoldSeconds: 0.4,
      clickCooldown: 0.8,
      leftClickOnBlink: true,
      mouthOpenThreshold: 0.55,
      modeToggleHoldSeconds: 0.2,
      modeToggleCooldown: 1.0,
      scrollModeEnabled: true,
      scrollSensitivity: 15,
      scrollDeadZone: 0.02,
      scrollMaxOffset: 0.15,
      stillnessLockEnabled: true,
      stillnessEnterRadius: 4.0,
      stillnessExitRadius: 8.0,
      stillnessHoldTime: 0.2,
      showLandmarks: true,
      showHud: true,
    };
    setLocalSettings(defaults);
    updateSettings(defaults);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Settings & Tuning</h1>
          <p className="subtitle">Fine-tune head tracking, One Euro smoothing, stillness lock, and facial gesture triggers.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="secondary-button" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}>
            <RotateCcw size={16} /> Reset Defaults
          </button>
          <button className="rgb-button" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem' }}>
            {savedFeedback ? <Check size={16} /> : <Save size={16} />}
            {savedFeedback ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Architecture Overview Card */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)' }}>
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#10b981" /> High-Accuracy Head & Facial Gesture Pipeline
            </h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Head Point (Nose Tip + Eyebrow Center) → 3×3 Homography Matrix → 1-Euro Filter + Stillness Lock → PyAutoGUI
            </p>
          </div>
          <button 
            className="secondary-button"
            onClick={() => navigate('/calibration')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderColor: '#3b82f6', color: '#2563eb' }}
          >
            <Target size={16} /> Calibration Status: {telemetry.calibQuality || 'Good'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
        {/* 1. One Euro Filter Card */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="var(--primary-color)" /> One Euro Filter (Anti-Jitter)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={localSettings.oneEuroFilterEnabled ?? true} 
                onChange={(e) => handleChange('oneEuroFilterEnabled', e.target.checked)}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--success-color)' }} 
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enabled</span>
            </label>
          </div>

          <div className="flex-col gap-6">
            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Minimum Cutoff Frequency (min_cutoff)</label>
                <span style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                  {localSettings.oneEuroMinCutoff || 0.2} Hz
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>0.05 (Smooth)</span>
                <input 
                  type="range" 
                  min="0.05" 
                  max="1.0" 
                  step="0.05" 
                  value={localSettings.oneEuroMinCutoff || 0.2} 
                  onChange={(e) => handleChange('oneEuroMinCutoff', parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary-color)' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>1.0 (Raw)</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                Low cutoff eliminates slow drifting and tremors when your head is stationary. Default: 0.2.
              </span>
            </div>

            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Speed Coefficient (beta)</label>
                <span style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                  {localSettings.oneEuroBeta || 1.5}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>0.1 (Gentle)</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="4.0" 
                  step="0.1" 
                  value={localSettings.oneEuroBeta || 1.5} 
                  onChange={(e) => handleChange('oneEuroBeta', parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary-color)' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>4.0 (Instant)</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                Increases filter cutoff dynamically during fast head motions to eliminate lag. Default: 1.5.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Stillness Lock Card */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MousePointer size={18} color="#10b981" /> Stillness Lock (Zero Drift)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={localSettings.stillnessLockEnabled ?? true} 
                onChange={(e) => handleChange('stillnessLockEnabled', e.target.checked)}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--success-color)' }} 
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {telemetry.stillnessLocked ? '🔒 Locked' : 'Unlocked'}
              </span>
            </label>
          </div>

          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
            Freezes the cursor completely when your head is steady, giving 100% rock-solid stability for reading or clicking without involuntary pixel flutter.
          </p>

          <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Enter Radius (px)
              </label>
              <input 
                type="number" 
                min="1"
                max="15"
                value={localSettings.stillnessEnterRadius || 4.0}
                onChange={(e) => handleChange('stillnessEnterRadius', parseFloat(e.target.value))}
                style={{ width: '100%', padding: '0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: 600 }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                Steady threshold (default 4px)
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Exit Radius (px)
              </label>
              <input 
                type="number" 
                min="3"
                max="30"
                value={localSettings.stillnessExitRadius || 8.0}
                onChange={(e) => handleChange('stillnessExitRadius', parseFloat(e.target.value))}
                style={{ width: '100%', padding: '0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: 600 }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                Break-lock threshold (default 8px)
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Hold Time (s)
              </label>
              <input 
                type="number" 
                step="0.05"
                min="0.1"
                max="1.0"
                value={localSettings.stillnessHoldTime || 0.2}
                onChange={(e) => handleChange('stillnessHoldTime', parseFloat(e.target.value))}
                style={{ width: '100%', padding: '0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: 600 }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                Hold duration (default 0.2s)
              </span>
            </div>
          </div>
        </div>

        {/* 3. Blink Click Card */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} color="#22c55e" /> Blink Left Click
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={localSettings.leftClickOnBlink ?? true} 
                onChange={(e) => handleChange('leftClickOnBlink', e.target.checked)}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--success-color)' }} 
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enabled</span>
            </label>
          </div>

          <div className="flex-col gap-5">
            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Blink Threshold (EAR)</label>
                <span style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                  {localSettings.blinkEarThreshold || 0.17} (Current EAR: {telemetry.ear})
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>0.12 (Tight)</span>
                <input 
                  type="range" 
                  min="0.12" 
                  max="0.24" 
                  step="0.005" 
                  value={localSettings.blinkEarThreshold || 0.17} 
                  onChange={(e) => handleChange('blinkEarThreshold', parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary-color)' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>0.24 (Loose)</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600 }}>Hold Time Before Click</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Holding eyes closed triggers click; normal blinks are ignored</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  step="0.05"
                  min="0.2"
                  max="1.5"
                  value={localSettings.blinkHoldSeconds || 0.4} 
                  onChange={(e) => handleChange('blinkHoldSeconds', parseFloat(e.target.value))}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', width: '80px', fontWeight: 700 }} 
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>sec</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600 }}>Click Cooldown</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Minimum gap after click before next click can fire</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.3"
                  max="2.0"
                  value={localSettings.clickCooldown || 0.8} 
                  onChange={(e) => handleChange('clickCooldown', parseFloat(e.target.value))}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', width: '80px', fontWeight: 700 }} 
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Mouth Mode Toggle & Scroll Card */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smile size={18} color="#06b6d4" /> Mouth Gesture & Scroll Mode
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={localSettings.scrollModeEnabled ?? true} 
                onChange={(e) => handleChange('scrollModeEnabled', e.target.checked)}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--success-color)' }} 
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enabled</span>
            </label>
          </div>

          <div className="flex-col gap-5">
            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Mouth Opening Threshold (MAR)</label>
                <span style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                  {localSettings.mouthOpenThreshold || 0.55} (Current MAR: {telemetry.mar})
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>0.40</span>
                <input 
                  type="range" 
                  min="0.40" 
                  max="0.75" 
                  step="0.02" 
                  value={localSettings.mouthOpenThreshold || 0.55} 
                  onChange={(e) => handleChange('mouthOpenThreshold', parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary-color)' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>0.75</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600 }}>Mode Toggle Hold Duration</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Hold mouth open to toggle between MOVE and SCROLL</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={localSettings.modeToggleHoldSeconds || 0.2} 
                  onChange={(e) => handleChange('modeToggleHoldSeconds', parseFloat(e.target.value))}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', width: '80px', fontWeight: 700 }} 
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>sec</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Head Tilt Scroll Sensitivity</label>
                <span style={{ fontSize: '0.875rem', color: '#0891b2', fontWeight: 700 }}>
                  {localSettings.scrollSensitivity || 15}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>5 (Slow)</span>
                <input 
                  type="range" 
                  min="5" 
                  max="35" 
                  value={localSettings.scrollSensitivity || 15} 
                  onChange={(e) => handleChange('scrollSensitivity', parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: '#0891b2' }} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>35 (Fast)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
