import React, { useState, useEffect } from 'react';
import { useCalculator } from "../../context/CalculatorContext";
import './MemoryItem.css';

const MemoryItem = ({ 
  slotNumber, 
  value, 
  onStore, 
  onRecall, 
  onAdd, 
  onClear,
  currentValue 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState('');

  const triggerAnimation = (type) => {
    setAnimationType(type);
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setAnimationType('');
    }, 300);
  };

  const handleStore = () => {
    onStore(slotNumber, currentValue);
    triggerAnimation('store');
  };

  const handleRecall = () => {
    if (value !== null && value !== undefined) {
      onRecall(slotNumber);
      triggerAnimation('recall');
    }
  };

  const handleAdd = () => {
    if (value !== null && value !== undefined) {
      onAdd(slotNumber);
      triggerAnimation('add');
    }
  };

  const handleClear = () => {
    onClear(slotNumber);
    triggerAnimation('clear');
  };

  const isEmpty = value === null || value === undefined || value === '';
  const displayValue = isEmpty ? '0' : value.toString();

  return (
    <div className={`memory-item ${isAnimating ? `animating ${animationType}` : ''}`}>
      <div className="memory-header">
        <span className="memory-slot-label">M{slotNumber}</span>
        <span className={`memory-indicator ${!isEmpty ? 'active' : ''}`}>●</span>
      </div>
      
      <div className="memory-display">
        <span className={`memory-value ${isEmpty ? 'empty' : ''}`}>
          {displayValue}
        </span>
      </div>
      
      <div className="memory-controls">
        <button 
          className="memory-btn store-btn"
          onClick={handleStore}
          title={`Store current value in M${slotNumber}`}
        >
          MS
        </button>
        
        <button 
          className="memory-btn recall-btn"
          onClick={handleRecall}
          disabled={isEmpty}
          title={`Recall value from M${slotNumber}`}
        >
          MR
        </button>
        
        <button 
          className="memory-btn add-btn"
          onClick={handleAdd}
          disabled={isEmpty}
          title={`Add M${slotNumber} to current value`}
        >
          M+
        </button>
        
        <button 
          className="memory-btn clear-btn"
          onClick={handleClear}
          disabled={isEmpty}
          title={`Clear M${slotNumber}`}
        >
          MC
        </button>
      </div>
    </div>
  );
};

export default MemoryItem;