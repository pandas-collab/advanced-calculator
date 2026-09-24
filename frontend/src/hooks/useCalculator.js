import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { useState, useCallback, useEffect } from 'react';
import { calculationService } from '../services/calculationService';

const initialState = {
  display: '0',
  previousValue: null,
  operation: null,
  waitingForOperand: false,
  isCalculating: false,
  error: null,
  history: []
};

export const useCalculatorState = () => {
  const { user, token } = useContext(AuthContext);
  const [state, setState] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const updateState = useCallback((updates) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    updateState,
    resetState
  };
};

export const useCalculatorActions = (state, updateState) => {
  const { user, token } = useContext(AuthContext);
  const formatResult = useCallback((result) => {
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return 'Error';
    }
    
    const formatted = parseFloat(result.toPrecision(12));
    return formatted.toString();
  }, []);

  const addToHistory = useCallback((calculation) => {
    const historyEntry = {
      id: Date.now(),
      expression: calculation.expression,
      result: calculation.result,
      timestamp: new Date().toISOString()
    };

    updateState({
      history: [historyEntry, ...state.history.slice(0, 49)]
    });
  }, [state.history, updateState]);

  const performCalculation = useCallback(async (expression, previousValue, operation, currentValue) => {
    try {
      updateState({ isCalculating: true, error: null });

      const calculationData = {
        expression: `${previousValue} ${operation} ${currentValue}`,
        operand1: previousValue,
        operator: operation,
        operand2: currentValue
      };

      const result = await calculationService.calculate(calculationData);
      const formattedResult = formatResult(result.result);

      addToHistory({
        expression: calculationData.expression,
        result: formattedResult
      });

      updateState({
        display: formattedResult,
        previousValue: null,
        operation: null,
        waitingForOperand: false,
        isCalculating: false
      });

      return formattedResult;
    } catch (error) {
      console.error('Calculation error:', error);
      updateState({
        error: error.message || 'Calculation failed',
        isCalculating: false,
        display: 'Error'
      });
      return 'Error';
    }
  }, [updateState, formatResult, addToHistory]);

  const inputNumber = useCallback((num) => {
    if (state.error) {
      updateState({ error: null });
    }

    if (state.waitingForOperand) {
      updateState({
        display: String(num),
        waitingForOperand: false
      });
    } else {
      const newDisplay = state.display === '0' ? String(num) : state.display + num;
      updateState({ display: newDisplay });
    }
  }, [state.display, state.waitingForOperand, state.error, updateState]);

  const inputDecimal = useCallback(() => {
    if (state.error) {
      updateState({ error: null });
    }

    if (state.waitingForOperand) {
      updateState({
        display: '0.',
        waitingForOperand: false
      });
    } else if (state.display.indexOf('.') === -1) {
      updateState({
        display: state.display + '.'
      });
    }
  }, [state.display, state.waitingForOperand, state.error, updateState]);

  const inputOperation = useCallback(async (nextOperation) => {
    const inputValue = parseFloat(state.display);

    if (state.previousValue === null) {
      updateState({
        previousValue: inputValue,
        operation: nextOperation,
        waitingForOperand: true
      });
    } else if (state.operation && !state.waitingForOperand) {
      const result = await performCalculation(
        `${state.previousValue} ${state.operation} ${inputValue}`,
        state.previousValue,
        state.operation,
        inputValue
      );

      if (result !== 'Error') {
        updateState({
          previousValue: parseFloat(result),
          operation: nextOperation,
          waitingForOperand: true
        });
      }
    } else {
      updateState({
        operation: nextOperation,
        waitingForOperand: true
      });
    }
  }, [state.display, state.previousValue, state.operation, state.waitingForOperand, updateState, performCalculation]);

  const calculate = useCallback(async () => {
    const inputValue = parseFloat(state.display);

    if (state.previousValue !== null && state.operation) {
      await performCalculation(
        `${state.previousValue} ${state.operation} ${inputValue}`,
        state.previousValue,
        state.operation,
        inputValue
      );
    }
  }, [state.display, state.previousValue, state.operation, performCalculation]);

  const clear = useCallback(() => {
    updateState({
      display: '0',
      previousValue: null,
      operation: null,
      waitingForOperand: false,
      error: null
    });
  }, [updateState]);

  const clearEntry = useCallback(() => {
    updateState({
      display: '0',
      error: null
    });
  }, [updateState]);

  const clearHistory = useCallback(async () => {
    try {
      await calculationService.clearHistory();
      updateState({ history: [] });
    } catch (error) {
      console.error('Failed to clear history:', error);
      updateState({ error: 'Failed to clear history' });
    }
  }, [updateState]);

  const loadHistory = useCallback(async () => {
    try {
      const history = await calculationService.getHistory();
      updateState({ history: history || [] });
    } catch (error) {
      console.error('Failed to load history:', error);
      updateState({ error: 'Failed to load history' });
    }
  }, [updateState]);

  return {
    inputNumber,
    inputDecimal,
    inputOperation,
    calculate,
    clear,
    clearEntry,
    clearHistory,
    loadHistory,
    formatResult
  };
};

export const useCalculator = () => {
  const { user, token } = useContext(AuthContext);
  const { state, updateState, resetState } = useCalculatorState();
  const actions = useCalculatorActions(state, updateState);

  useEffect(() => {
    actions.loadHistory();
  }, []);

  const handleKeyPress = useCallback((event) => {
    const { key } = event;

    if (key >= '0' && key <= '9') {
      event.preventDefault();
      actions.inputNumber(parseInt(key));
    } else if (key === '.') {
      event.preventDefault();
      actions.inputDecimal();
    } else if (['+', '-', '*', '/'].includes(key)) {
      event.preventDefault();
      actions.inputOperation(key);
    } else if (key === 'Enter' || key === '=') {
      event.preventDefault();
      actions.calculate();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
      event.preventDefault();
      actions.clear();
    } else if (key === 'Backspace') {
      event.preventDefault();
      if (state.display.length > 1) {
        updateState({ display: state.display.slice(0, -1) });
      } else {
        updateState({ display: '0' });
      }
    }
  }, [actions, state.display, updateState]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return {
    ...state,
    ...actions,
    resetState,
    handleKeyPress
  };
};