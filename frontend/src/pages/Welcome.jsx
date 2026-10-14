import React from 'react';
import { Eye, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)' }}>
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div>
            <img src="/logo.png" alt="EyeBase Logo" style={{ height: '120px', width: 'auto' }} />
          </div>
        </div>
        
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>EyeBase</h1>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-light)', fontWeight: 400, marginBottom: '2rem' }}>
          Hands-Free Computer Control
        </h2>
        
        <p style={{ fontSize: '1.125rem', marginBottom: '3rem', color: 'var(--text-light)' }}>
          Control your computer using high-precision eye tracking, smart fusion, and facial gestures.
        </p>

        <button 
          className="rgb-button" 
          style={{ fontSize: '1.25rem', padding: '1rem 3rem', borderRadius: 'var(--radius-full)' }}
          onClick={() => navigate('/dashboard')}
        >
          GET STARTED <ChevronRight />
        </button>

        <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-light)' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>1</div>
            <span>Camera Setup</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-light)' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>2</div>
            <span>Position Check</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-light)' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>3</div>
            <span>Calibration</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-light)' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>4</div>
            <span>Start Control</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
