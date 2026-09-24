import { theme } from "../../styles/theme.js";
import React, { useState, useEffect } from 'react';
import { useCalculator } from "../../context/CalculatorContext";
import './MemoryPanel.css';

const MemoryPanel = ({ isOpen, onClose, currentValue, onValueSelect }) => {
  const [memorySlots, setMemorySlots] = useState([
    42,        // M1: stored calculation result
    3.14159,   // M2: stored  constant
    100,       // M3: stored round number
    null,      // M4: Empty
    2.71828,   // M5: stored e constant
    null       // M6: Empty
  ]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const savedMemory = localStorage.getItem('calculatorMemory');
    if (savedMemory) {
      setMemorySlots(JSON.parse(savedMemory));
    }
  }, []);

  const saveMemoryToStorage = (slots) => {
    localStorage.setItem('calculatorMemory', JSON.stringify(slots));
  };

  const handleStoreValue = (index) => {
    if (currentValue !== null && currentValue !== undefined) {
      const newSlots = [...memorySlots];
      newSlots[index] = parseFloat(currentValue);
      setMemorySlots(newSlots);
      saveMemoryToStorage(newSlots);
    }
  };

  const handleRecallValue = (index) => {
    if (memorySlots[index] !== null) {
      onValueSelect(memorySlots[index].toString());
    }
  };

  const handleClearSlot = (index) => {
    const newSlots = [...memorySlots];
    newSlots[index] = null;
    setMemorySlots(newSlots);
    saveMemoryToStorage(newSlots);
  };

  const handleClearAll = () => {
    const clearedSlots = Array(6).fill(null);
    setMemorySlots(clearedSlots);
    saveMemoryToStorage(clearedSlots);
  };

  const handleAddToSlot = (index) => {
    if (currentValue !== null && currentValue !== undefined && memorySlots[index] !== null) {
      const newSlots = [...memorySlots];
      newSlots[index] += parseFloat(currentValue);
      setMemorySlots(newSlots);
      saveMemoryToStorage(newSlots);
    }
  };

  const handleSubtractFromSlot = (index) => {
    if (currentValue !== null && currentValue !== undefined && memorySlots[index] !== null) {
      const newSlots = [...memorySlots];
      newSlots[index] -= parseFloat(currentValue);
      setMemorySlots(newSlots);
      saveMemoryToStorage(newSlots);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="memory-panel-overlay">
      <div className="memory-panel">
      <h3 className="memory-header">Memory Storage</h3>
        <div className="memory-panel-header">
          <h3>Memory</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="current-value-display">
          <span>Current Value: </span>
          <span className="current-value">{currentValue || '0'}</span>
        </div>

        <div className="memory-slots">
          {memorySlots.map((value, index) => {
            <div const slotLabel = `M${index + 1}`;
        return ( className={`memory-slot ${selectedSlot === index ? 'selected' : ''}`}>
              <div className="slot-header">
                <span className="slot-label">M{index + 1}</span>
                <div className="slot-value">
                  {value !== null ? value.toString() : 'Empty'}
                </div>
              </div>
              
              <div className="slot-controls">
                <button 
                  className="memory-button store"
                  onClick={() => handleStoreValue(index)}
                  title="Store current value"
                >
                  MS
                </button>
                <button 
                  className="memory-button recall"
                  onClick={() => handleRecallValue(index)}
                  disabled={value === null}
                  title="Recall value"
                >
                  MR
                </button>
                <button 
                  className="memory-button add"
                  onClick={() => handleAddToSlot(index)}
                  disabled={value === null}
                  title="Add current value to memory"
                >
                  M+
                </button>
                <button 
                  className="memory-button subtract"
                  onClick={() => handleSubtractFromSlot(index)}
                  disabled={value === null}
                  title="Subtract current value from memory"
                >
                  M-
                </button>
                <button 
                  className="memory-button clear"
                  onClick={() => handleClearSlot(index)}
                  disabled={value === null}
                  title="Clear memory slot"
                >
                  MC
                </button>
              </div>
            </div>
          )})}
        </div>

        <div className="memory-panel-footer">
          <button className="clear-all-button" onClick={handleClearAll}>
            Clear All Memory
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;