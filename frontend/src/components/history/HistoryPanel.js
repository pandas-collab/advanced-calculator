import { ICONS, CALCULATOR_TYPES } from "../../utils/constants";
import { theme } from "../../styles/theme";
import { useCalculator } from "../../context/CalculatorContext";
import React, { useState, useEffect, useMemo } from 'react';
import './HistoryPanel.css';

const HistoryPanel = ({ 
  isOpen, 
  onClose, 
  historyItems = [], 
  onHistorySelect,
  onClearHistory 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return historyItems;
    
    return historyItems.filter(item => 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [historyItems, searchTerm]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      onClearHistory();
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupHistoryByDate = (items) => {
    const groups = {};
    
    items.forEach(item => {
      const dateKey = formatDate(item.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return groups;
  };

  const groupedHistory = useMemo(() => {
    return groupHistoryByDate(filteredHistory);
  }, [filteredHistory]);

  if (!isOpen) return null;

  return (
    <div 
      className={`history-panel-backdrop ${isAnimating ? 'open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`history-panel ${isAnimating ? 'slide-in' : ''}`}>
        <div className="history-panel-header">
          <h2>History</h2>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close history panel"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M18 6L6 18M6 6L18 18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="history-panel-controls">
          <div className="search-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          {historyItems.length > 0 && (
            <button 
              className="clear-all-button"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="history-panel-content">
          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p>No results found for "{searchTerm}"</p>
                </>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p>No history yet</p>
                  <span>Your browsing history will appear here</span>
                </>
              )}
            </div>
          ) : (
            <div className="history-list">
              {Object.entries(groupedHistory).map(([dateGroup, items]) => (
                <div key={dateGroup} className="history-group">
                  <div className="history-group-header">
                    <h3>{dateGroup}</h3>
                    <span className="history-group-count">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  
                  <div className="history-items">
                    {items.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="history-item"
                        onClick={() => onHistorySelect && onHistorySelect(item)}
                      >
                        <div className="history-item-icon">
                          {item.favicon ? (
                            <img src={item.favicon} alt="" width="16" height="16" />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        
                        <div className="history-item-content">
                          <div className="history-item-title">
                            {item.title || item.url || 'Untitled'}
                          </div>
                          {item.url && (
                            <div className="history-item-url">
                              {item.url}
                            </div>
                          )}
                          {item.description && (
                            <div className="history-item-description">
                              {item.description}
                            </div>
                          )}
                        </div>
                        
                        <div className="history-item-time">
                          {new Date(item.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { HistoryPanel };