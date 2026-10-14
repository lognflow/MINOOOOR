import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  MousePointer2,
  Target,
  Camera, 
  Settings, 
  Activity, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { useEyeMouse } from '../context/EyeMouseContext';

const Sidebar = () => {
  const { isConnected, telemetry } = useEyeMouse();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="EyeBase" style={{ height: '40px', width: 'auto' }} />
        </div>
        <div className="sidebar-title-container">
          <h2 className="sidebar-title">EyeBase</h2>
          <span className="sidebar-subtitle">Hands-Free Control</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Home size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/mouse-control" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <MousePointer2 size={20} />
          <span>Mouse Control</span>
        </NavLink>

        <NavLink to="/calibration" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Target size={20} />
          <span>Calibration</span>
        </NavLink>

        <NavLink to="/camera" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Camera size={20} />
          <span>Camera</span>
        </NavLink>

        <NavLink to="/settings" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <NavLink to="/monitoring" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Activity size={20} />
          <span>Monitoring</span>
        </NavLink>
        <NavLink to="/help" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <HelpCircle size={20} />
          <span>Help</span>
        </NavLink>
      </nav>
      
      <div className="sidebar-footer">
        <div className="system-status">
          <span className={`status-dot ${isConnected ? 'status-active' : 'status-inactive'}`}></span>
          <span>{isConnected ? (telemetry.isControlling ? 'Control Active' : 'Backend Connected') : 'Connecting Backend'}</span>
        </div>
        <div className="app-version">
          EyeBase v1.0
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
