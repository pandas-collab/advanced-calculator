import { ICONS, CALCULATOR_TYPES } from "../../utils/constants";
import { theme } from "../../styles/theme";
import React from 'react';
import './HistoryItem.css';

const HistoryItem = ({ 
  item, 
  onLoad, 
  className = '' 
}) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      'basic': '🔢',
      'scientific': '🧮',
      'programmer': '💻',
      'unit': '📏',
      'currency': '💰',
      'graphing': '📊',
      'matrix': '📋',
      'statistics': '📈'
    };
    return icons[type] || '🔢';
  };

  const truncateExpression = (expression, maxLength = 40) => {
    if (expression.length <= maxLength) {
      return expression;
    }
    return expression.substring(0, maxLength - 3) + '...';
  };

  const handleLoad = () => {
    if (onLoad && typeof onLoad === 'function') {
      onLoad(item);
    }
  };

  if (!item) {
    return null;
  }

  return (
    <div className={`history-item ${className}`}>
      <div className="history-item-header">
        <div className="history-item-type">
          <span className="type-icon" title={item.type}>
            {getTypeIcon(item.type)}
          </span>
        </div>
        <div className="history-item-timestamp">
          {formatTimestamp(item.timestamp)}
        </div>
      </div>
      
      <div className="history-item-content">
        <div className="history-item-expression" title={item.expression}>
          {truncateExpression(item.expression)}
        </div>
        <div className="history-item-equals">=</div>
        <div className="history-item-result" title={item.result}>
          {item.result}
        </div>
      </div>
      
      <div className="history-item-actions">
        <button 
          className="load-button"
          onClick={handleLoad}
          title="Load this calculation"
          aria-label="Load calculation"
        >
          ↻
        </button>
      </div>
    </div>
  );
};

export default HistoryItem;