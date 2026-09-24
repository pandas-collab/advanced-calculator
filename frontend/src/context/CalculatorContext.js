import React, { createContext, useContext, useReducer } from 'react';

const CalculatorContext = createContext();

const initialState = {
  display: '0',
  previousValue: null,
  operation: null,
  waitingForOperand: false,
  history: []
};

const calculatorReducer = (state, action) => {
  switch (action.type) {
    case 'INPUT_DIGIT':
      if (state.waitingForOperand) {
        return {
          ...state,
          display: String(action.digit),
          waitingForOperand: false
        };
      } else {
        return {
          ...state,
          display: state.display === '0' ? String(action.digit) : state.display + action.digit
        };
      }

    case 'INPUT_DOT':
      if (state.waitingForOperand) {
        return {
          ...state,
          display: '0.',
          waitingForOperand: false
        };
      } else if (state.display.indexOf('.') === -1) {
        return {
          ...state,
          display: state.display + '.'
        };
      }
      return state;

    case 'CLEAR':
      return initialState;

    case 'CLEAR_DISPLAY':
      return {
        ...state,
        display: '0'
      };

    case 'PERFORM_OPERATION':
      const inputValue = parseFloat(state.display);

      if (state.previousValue === null) {
        return {
          ...state,
          previousValue: inputValue,
          operation: action.operation,
          waitingForOperand: true
        };
      }

      if (state.operation) {
        const currentValue = state.previousValue || 0;
        const newValue = calculate(currentValue, inputValue, state.operation);

        const calculation = `${currentValue} ${getOperationSymbol(state.operation)} ${inputValue} = ${newValue}`;

        return {
          ...state,
          display: String(newValue),
          previousValue: newValue,
          operation: action.operation,
          waitingForOperand: true,
          history: [calculation, ...state.history.slice(0, 9)]
        };
      }

      return state;

    case 'CALCULATE':
      const inputVal = parseFloat(state.display);

      if (state.previousValue !== null && state.operation) {
        const currentValue = state.previousValue;
        const newValue = calculate(currentValue, inputVal, state.operation);

        const calculation = `${currentValue} ${getOperationSymbol(state.operation)} ${inputVal} = ${newValue}`;

        return {
          ...state,
          display: String(newValue),
          previousValue: null,
          operation: null,
          waitingForOperand: true,
          history: [calculation, ...state.history.slice(0, 9)]
        };
      }

      return state;

    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: []
      };

    default:
      return state;
  }
};

const calculate = (firstValue, secondValue, operation) => {
  switch (operation) {
    case 'ADD':
      return firstValue + secondValue;
    case 'SUBTRACT':
      return firstValue - secondValue;
    case 'MULTIPLY':
      return firstValue * secondValue;
    case 'DIVIDE':
      return secondValue !== 0 ? firstValue / secondValue : 0;
    default:
      return secondValue;
  }
};

const getOperationSymbol = (operation) => {
  switch (operation) {
    case 'ADD':
      return '+';
    case 'SUBTRACT':
      return '-';
    case 'MULTIPLY':
      return '×';
    case 'DIVIDE':
      return '÷';
    default:
      return '';
  }
};

export const CalculatorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  const inputDigit = (digit) => {
    dispatch({ type: 'INPUT_DIGIT', digit });
  };

  const inputDot = () => {
    dispatch({ type: 'INPUT_DOT' });
  };

  const clear = () => {
    dispatch({ type: 'CLEAR' });
  };

  const clearDisplay = () => {
    dispatch({ type: 'CLEAR_DISPLAY' });
  };

  const performOperation = (operation) => {
    dispatch({ type: 'PERFORM_OPERATION', operation });
  };

  const calculate = () => {
    dispatch({ type: 'CALCULATE' });
  };

  const clearHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
  };

  const value = {
    ...state,
    inputDigit,
    inputDot,
    clear,
    clearDisplay,
    performOperation,
    calculate,
    clearHistory
  };

  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};