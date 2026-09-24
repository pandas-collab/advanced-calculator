import React from 'react';
import './Keypad.css';

const Keypad = ({ onButtonClick, memoryValue }) => {
  const buttons = [
    { id: 'ac', label: 'AC', type: 'function', className: 'clear' },
    { id: 'c', label: 'C', type: 'function', className: 'clear' },
    { id: 'mc', label: 'MC', type: 'memory', className: 'memory' },
    { id: 'divide', label: '÷', type: 'operator', className: 'operator' },
    
    { id: 'mr', label: 'MR', type: 'memory', className: 'memory' },
    { id: '7', label: '7', type: 'number', className: 'number' },
    { id: '8', label: '8', type: 'number', className: 'number' },
    { id: 'multiply', label: '×', type: 'operator', className: 'operator' },
    
    { id: 'm-', label: 'M-', type: 'memory', className: 'memory' },
    { id: '4', label: '4', type: 'number', className: 'number' },
    { id: '5', label: '5', type: 'number', className: 'number' },
    { id: 'subtract', label: '-', type: 'operator', className: 'operator' },
    
    { id: 'm+', label: 'M+', type: 'memory', className: 'memory' },
    { id: '1', label: '1', type: 'number', className: 'number' },
    { id: '2', label: '2', type: 'number', className: 'number' },
    { id: 'add', label: '+', type: 'operator', className: 'operator' },
    
    { id: 'percent', label: '%', type: 'function', className: 'function' },
    { id: '0', label: '0', type: 'number', className: 'number zero' },
    { id: 'decimal', label: '.', type: 'function', className: 'function' },
    { id: 'equals', label: '=', type: 'equals', className: 'equals' }
  ];

  const handleButtonClick = (button) => {
    if (onButtonClick) {
      onButtonClick(button);
    }
  };

  const isMemoryActive = memoryValue && memoryValue !== 0;

  return (
    <div className="keypad">
      <div className="keypad-grid">
        {buttons.map((button) => (
          <button
            key={button.id}
            className={`keypad-button ${button.className} ${
              button.type === 'memory' && isMemoryActive ? 'memory-active' : ''
            }`}
            onClick={() => handleButtonClick(button)}
            data-testid={`button-${button.id}`}
            aria-label={`${button.label} ${button.type}`}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Keypad;