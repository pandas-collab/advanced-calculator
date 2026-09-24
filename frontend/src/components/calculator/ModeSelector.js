import React from 'react';
import Layout from "../common/Layout.js";
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from "../common/Layout.js";
import './ModeSelector.css';

const ModeSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const modes = [
    { key: 'basic', label: 'Basic', path: '/calculator/basic' },
    { key: 'scientific', label: 'Scientific', path: '/calculator/scientific' },
    { key: 'graphing', label: 'Graphing', path: '/calculator/graphing' }
  ];

  const handleModeChange = (path) => {
    navigate(path);
  };

  const isActiveMode = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="mode-selector">
      <div className="mode-buttons">
        {modes.map((mode) => (
          <button
            key={mode.key}
            className={`mode-button ${isActiveMode(mode.path) ? 'active' : ''}`}
            onClick={() => handleModeChange(mode.path)}
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;