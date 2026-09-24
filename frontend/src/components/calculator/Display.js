import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';
import './Display.css';

const Display = ({ 
  currentValue = '0', 
  previousValue = '', 
  operation = '', 
  history = [],
  isResult = false 
}) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isResult) {
      setAnimationClass('result-animation');
      const timer = setTimeout(() => setAnimationClass(''), 300);
      return () => clearTimeout(timer);
    }
  }, [isResult]);

  const formatNumber = (num) => {
    if (num === '' || num === undefined || num === null) return '';
    
    const numStr = num.toString();
    
    // Handle exponential notation
    if (numStr.includes('e')) {
      return parseFloat(num).toExponential(6);
    }
    
    // Handle very long numbers
    if (numStr.length > 12) {
      return parseFloat(num).toPrecision(8);
    }
    
    // Add thousand separators for display
    if (!numStr.includes('.')) {
      return parseInt(num).toLocaleString();
    }
    
    const [integer, decimal] = numStr.split('.');
    return `${parseInt(integer).toLocaleString()}.${decimal}`;
  };

  const formatExpression = () => {
    if (!previousValue && !operation) return '';
    return `${formatNumber(previousValue)} ${operation}`;
  };

  const truncateHistory = (historyItem, maxLength = 25) => {
    if (historyItem.length <= maxLength) return historyItem;
    return historyItem.substring(0, maxLength) + '...';
  };

  return (
    <div className="calculator-display">
      {/* History Panel */}
      <div className="display-history">
        {history.slice(-3).map((item, index) => (
          <div key={index} className="history-item">
            {truncateHistory(item)}
          </div>
        ))}
      </div>

      {/* Main Display */}
      <div className="display-main">
        {/* Expression Line */}
        <div className="display-expression">
          {formatExpression()}
        </div>
        
        {/* Current Value */}
        <div className={`display-value ${animationClass}`}>
          <div className="value-container">
            <span className="value-text">
              {formatNumber(currentValue)}
            </span>
            <div className="cursor-blink"></div>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="display-indicators">
        <div className={`indicator ${operation ? 'active' : ''}`}>
          OP
        </div>
        <div className={`indicator ${isResult ? 'active' : ''}`}>
          =
        </div>
      </div>
    </div>
  );
};

export default Display;