import React, { useContext }, { useState, useCallback, useEffect } from 'react';
import { CalculatorContext } from '../../context/CalculatorContext';
import Display from './Display';
import Keypad from './Keypad';
import History from './History';
import { useAuth } from '../../contexts/AuthContext';
import { useCalculator } from '../../hooks/useCalculator';
import { saveCalculation, getCalculationHistory } from '../../services/calculatorService';

const BasicCalculator = () => {
  const calculatorContext = useContext(CalculatorContext);
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('basic');
  
  const {
    display,
    equation,
    result,
    error,
    handleNumber,
    handleOperator,
    handleEquals,
    handleClear,
    handleClearEntry,
    handleDecimal,
    handleBackspace,
    handleMemoryStore,
    handleMemoryRecall,
    handleMemoryClear,
    memoryValue
  } = useCalculator();

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const historyData = await getCalculationHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load calculation history:', error);
    }
  };

  const handleEqualsWithHistory = useCallback(async () => {
    const calculationResult = handleEquals();
    
    if (calculationResult && !error && user) {
      try {
        const calculation = {
          expression: equation,
          result: calculationResult,
          timestamp: new Date().toISOString(),
          mode: 'basic'
        };
        
        await saveCalculation(calculation);
        setHistory(prev => [calculation, ...prev.slice(0, 99)]);
      } catch (error) {
        console.error('Failed to save calculation:', error);
      }
    }
    
    return calculationResult;
  }, [handleEquals, equation, error, user]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    handleClear();
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory && user) {
      loadHistory();
    }
  };

  const handleHistorySelect = (calculation) => {
    // Load selected calculation into display
    handleClear();
    // Set display to show the result
    setTimeout(() => {
      calculation.expression.split('').forEach(char => {
        if (/\d/.test(char)) {
          handleNumber(char);
        } else if (['+', '-', '*', '/'].includes(char)) {
          handleOperator(char);
        } else if (char === '.') {
          handleDecimal();
        }
      });
    }, 50);
  };

  const clearHistory = async () => {
    if (user) {
      try {
        // Implement clear history service call
        setHistory([]);
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  return (
    <div className="basic-calculator">
      <div className="calculator-header">
        <div className="mode-selector">
          <button 
            className={mode === 'basic' ? 'active' : ''}
            onClick={() => handleModeChange('basic')}
          >
            Basic
          </button>
          <button 
            className={mode === 'scientific' ? 'active' : ''}
            onClick={() => handleModeChange('scientific')}
          >
            Scientific
          </button>
          <button 
            className={mode === 'graphing' ? 'active' : ''}
            onClick={() => handleModeChange('graphing')}
          >
            Graphing
          </button>
        </div>
        
        {user && (
          <div className="calculator-controls">
            <button 
              className="history-toggle"
              onClick={toggleHistory}
              title="Toggle History"
            >
              <span className="icon-history">📋</span>
            </button>
          </div>
        )}
      </div>

      <div className="calculator-body">
        <div className="calculator-main">
          <Display 
            value={display}
            equation={equation}
            result={result}
            error={error}
            memoryValue={memoryValue}
          />
          
          <Keypad
            onNumber={handleNumber}
            onOperator={handleOperator}
            onEquals={handleEqualsWithHistory}
            onClear={handleClear}
            onClearEntry={handleClearEntry}
            onDecimal={handleDecimal}
            onBackspace={handleBackspace}
            onMemoryStore={handleMemoryStore}
            onMemoryRecall={handleMemoryRecall}
            onMemoryClear={handleMemoryClear}
            mode={mode}
            hasMemory={memoryValue !== null}
          />
        </div>

        {showHistory && user && (
          <div className="calculator-history">
            <History
              history={history}
              onHistorySelect={handleHistorySelect}
              onClearHistory={clearHistory}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>

      {!user && (
        <div className="calculator-footer">
          <p className="auth-prompt">
            Sign in to save your calculations and access history
          </p>
        </div>
      )}
    </div>
  );
};

export default BasicCalculator;