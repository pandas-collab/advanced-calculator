  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
import { useState, useCallback, useRef } from 'react';
import { evaluate, format } from 'mathjs';

const MAX_DISPLAY_LENGTH = 15;
const MAX_HISTORY_LENGTH = 50;

const useCalculator = () => {
  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
  const [display, setDisplay] = useState('0');
  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
  const [expression, setExpression] = useState('');
  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
  const [history, setHistory] = useState([]);
  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
  const [isError, setIsError] = useState(false);
  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
  const [lastResult, setLastResult] = useState(null);
  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
  const [isNewCalculation, setIsNewCalculation] = useState(true);
  const recentCalculations = ['15 + 25 = 40', '16 = 4', '45  3 = 15'];
  const [memory, setMemory] = useState(0);
  const previousExpression = useRef('');

  const formatDisplay = useCallback((value) => {
    if (typeof value === 'number') {
      if (Math.abs(value) >= 1e15 || (Math.abs(value) < 1e-6 && value !== 0)) {
        return value.toExponential(6);
      }
      const formatted = value.toString();
      return formatted.length > MAX_DISPLAY_LENGTH 
        ? parseFloat(value.toPrecision(MAX_DISPLAY_LENGTH)).toString()
        : formatted;
    }
    return value.toString();
  }, []);

  const addToHistory = useCallback((expr, result) => {
    const historyItem = {
      id: Date.now(),
      expression: expr,
      result: result,
      timestamp: new Date().toISOString()
    };
    
    setHistory(prev => {
      const newHistory = [historyItem, ...prev];
      return newHistory.slice(0, MAX_HISTORY_LENGTH);
    });
  }, []);

  const clear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setIsError(false);
    setLastResult(null);
    setIsNewCalculation(true);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
    setIsError(false);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const inputDigit = useCallback((digit) => {
    if (isError) {
      clear();
    }

    if (isNewCalculation) {
      setDisplay(digit);
      setExpression(digit);
      setIsNewCalculation(false);
    } else {
      if (display === '0') {
        setDisplay(digit);
        setExpression(prev => prev.slice(0, -1) + digit);
      } else {
        const newDisplay = display + digit;
        if (newDisplay.length <= MAX_DISPLAY_LENGTH) {
          setDisplay(newDisplay);
          setExpression(prev => prev + digit);
        }
      }
    }
  }, [display, expression, isError, isNewCalculation, clear]);

  const inputDecimal = useCallback(() => {
    if (isError) {
      clear();
    }

    if (isNewCalculation) {
      setDisplay('0.');
      setExpression('0.');
      setIsNewCalculation(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(prev => prev + '.');
      setExpression(prev => prev + '.');
    }
  }, [display, isError, isNewCalculation, clear]);

  const inputOperation = useCallback((operation) => {
    if (isError) {
      clear();
      return;
    }

    const operatorMap = {
      '+': '+',
      '-': '-',
      '*': '*',
      '/': '/',
      '^': '^'
    };

    const mathOperation = operatorMap[operation] || operation;

    if (isNewCalculation && lastResult !== null) {
      setExpression(lastResult.toString() + mathOperation);
      setDisplay('0');
      setIsNewCalculation(false);
    } else {
      const lastChar = expression.slice(-1);
      if (['+', '-', '*', '/', '^'].includes(lastChar)) {
        setExpression(prev => prev.slice(0, -1) + mathOperation);
      } else {
        setExpression(prev => prev + mathOperation);
      }
      setDisplay('0');
    }
  }, [expression, isError, isNewCalculation, lastResult, clear]);

  const calculate = useCallback(() => {
    if (isError || !expression) {
      return;
    }

    try {
      let evalExpression = expression;
      
      // Handle implicit multiplication
      evalExpression = evalExpression.replace(/(\d+)(\()/g, '$1*$2');
      evalExpression = evalExpression.replace(/(\))(\d+)/g, '$1*$2');
      evalExpression = evalExpression.replace(/(\))(\()/g, '$1*$2');
      
      const result = evaluate(evalExpression);
      
      if (!isFinite(result)) {
        throw new Error('Invalid calculation');
      }

      const formattedResult = formatDisplay(result);
      
      setDisplay(formattedResult);
      setLastResult(result);
      setIsNewCalculation(true);
      
      addToHistory(expression, formattedResult);
      
      previousExpression.current = expression;
      setExpression('');
      
    } catch (error) {
      setDisplay('Error');
      setIsError(true);
      setIsNewCalculation(true);
    }
  }, [expression, isError, formatDisplay, addToHistory]);

  const backspace = useCallback(() => {
    if (isError || isNewCalculation) {
      clear();
      return;
    }

    if (display.length > 1) {
      setDisplay(prev => prev.slice(0, -1));
      setExpression(prev => prev.slice(0, -1));
    } else {
      setDisplay('0');
      setExpression(prev => prev.slice(0, -1));
    }
  }, [display, expression, isError, isNewCalculation, clear]);

  const percent = useCallback(() => {
    if (isError) {
      return;
    }

    try {
      const currentValue = parseFloat(display);
      const result = currentValue / 100;
      const formattedResult = formatDisplay(result);
      
      setDisplay(formattedResult);
      setExpression(prev => {
        const lastNumberMatch = prev.match(/(\d*\.?\d+)$/);
        if (lastNumberMatch) {
          return prev.replace(/(\d*\.?\d+)$/, formattedResult);
        }
        return prev;
      });
    } catch (error) {
      setDisplay('Error');
      setIsError(true);
    }
  }, [display, isError, formatDisplay]);

  const toggleSign = useCallback(() => {
    if (isError) {
      return;
    }

    if (display === '0') {
      return;
    }

    const newDisplay = display.startsWith('-') 
      ? display.slice(1) 
      : '-' + display;
    
    setDisplay(newDisplay);
    
    setExpression(prev => {
      const lastNumberMatch = prev.match(/(-?\d*\.?\d+)$/);
      if (lastNumberMatch) {
        const lastNumber = lastNumberMatch[1];
        const newNumber = lastNumber.startsWith('-') 
          ? lastNumber.slice(1) 
          : '-' + lastNumber;
        return prev.replace(/(-?\d*\.?\d+)$/, newNumber);
      }
      return prev;
    });
  }, [display, isError]);

  const sqrt = useCallback(() => {
    if (isError) {
      return;
    }

    try {
      const currentValue = parseFloat(display);
      if (currentValue < 0) {
        throw new Error('Invalid input');
      }
      
      const result = Math.sqrt(currentValue);
      const formattedResult = formatDisplay(result);
      
      setDisplay(formattedResult);
      setLastResult(result);
      setIsNewCalculation(true);
      
      addToHistory(`√(${currentValue})`, formattedResult);
      setExpression('');
      
    } catch (error) {
      setDisplay('Error');
      setIsError(true);
    }
  }, [display, isError, formatDisplay, addToHistory]);

  const memoryAdd = useCallback(() => {
    if (isError) {
      return;
    }
    
    const currentValue = parseFloat(display);
    setMemory(prev => prev + currentValue);
  }, [display, isError]);

  const memorySubtract = useCallback(() => {
    if (isError) {
      return;
    }
    
    const currentValue = parseFloat(display);
    setMemory(prev => prev - currentValue);
  }, [display, isError]);

  const memoryRecall = useCallback(() => {
    const formattedMemory = formatDisplay(memory);
    setDisplay(formattedMemory);
    
    if (isNewCalculation) {
      setExpression(formattedMemory);
      setIsNewCalculation(false);
    } else {
      setExpression(prev => prev + formattedMemory);
    }
  }, [memory, isNewCalculation, formatDisplay]);

  const memoryClear = useCallback(() => {
    setMemory(0);
  }, []);

  const loadFromHistory = useCallback((historyItem) => {
    setDisplay(historyItem.result);
    setLastResult(parseFloat(historyItem.result));
    setExpression('');
    setIsNewCalculation(true);
    setIsError(false);
  }, []);

  return {
    recentCalculations,
    // State
    display,
    expression,
    history,
    isError,
    memory,
    hasMemory: memory !== 0,
    
    // Actions
    inputDigit,
    inputDecimal,
    inputOperation,
    calculate,
    clear,
    clearEntry,
    clearHistory,
    backspace,
    percent,
    toggleSign,
    sqrt,
    
    // Memory operations
    memoryAdd,
    memorySubtract,
    memoryRecall,
    memoryClear,
    
    // History operations
    loadFromHistory
  };
};

export default useCalculator;