import React, { useState } from 'react';
import Layout from "../common/Layout.js";
import Display from './Display';
import Keypad from './Keypad';
import { useCalculator } from '../../hooks/useCalculator';
import './ScientificCalculator.css';

const ScientificCalculator = () => {
  const {
    display,
    result,
    history,
    handleNumber,
    handleOperator,
    handleEquals,
    handleClear,
    handleClearAll,
    handleDecimal,
    handleBackspace,
    handleFunction,
    error
  } = useCalculator();

  const [angleMode, setAngleMode] = useState('DEG'); // DEG or RAD
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toRadians = (angle) => {
    return angleMode === 'DEG' ? (angle * Math.PI) / 180 : angle;
  };

  const fromRadians = (radians) => {
    return angleMode === 'DEG' ? (radians * 180) / Math.PI : radians;
  };

  const scientificFunctions = {
    'sin': (x) => Math.sin(toRadians(x)),
    'cos': (x) => Math.cos(toRadians(x)),
    'tan': (x) => Math.tan(toRadians(x)),
    'asin': (x) => fromRadians(Math.asin(x)),
    'acos': (x) => fromRadians(Math.acos(x)),
    'atan': (x) => fromRadians(Math.atan(x)),
    'log': (x) => Math.log10(x),
    'ln': (x) => Math.log(x),
    'exp': (x) => Math.exp(x),
    'sqrt': (x) => Math.sqrt(x),
    'cbrt': (x) => Math.cbrt(x),
    'pow': (x, y) => Math.pow(x, y),
    'factorial': (n) => {
      if (n < 0 || !Number.isInteger(n)) return NaN;
      if (n <= 1) return 1;
      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }
      return result;
    },
    'abs': (x) => Math.abs(x),
    'floor': (x) => Math.floor(x),
    'ceil': (x) => Math.ceil(x),
    'round': (x) => Math.round(x)
  };

  const constants = {
    'π': Math.PI,
    'e': Math.E,
    'φ': (1 + Math.sqrt(5)) / 2 // Golden ratio
  };

  const handleScientificFunction = (func) => {
    handleFunction(func, scientificFunctions[func]);
  };

  const handleConstant = (constant) => {
    if (display === '0' || display === '') {
      handleFunction('constant', () => constants[constant]);
    } else {
      handleOperator('×');
      handleFunction('constant', () => constants[constant]);
    }
  };

  const toggleAngleMode = () => {
    setAngleMode(prev => prev === 'DEG' ? 'RAD' : 'DEG');
  };

  const toggleAdvanced = () => {
    setShowAdvanced(prev => !prev);
  };

  const basicButtons = [
    [
      { label: 'C', action: () => handleClear(), className: 'function' },
      { label: 'CE', action: () => handleClearAll(), className: 'function' },
      { label: '⌫', action: () => handleBackspace(), className: 'function' },
      { label: '÷', action: () => handleOperator('÷'), className: 'operator' }
    ],
    [
      { label: '7', action: () => handleNumber('7'), className: 'number' },
      { label: '8', action: () => handleNumber('8'), className: 'number' },
      { label: '9', action: () => handleNumber('9'), className: 'number' },
      { label: '×', action: () => handleOperator('×'), className: 'operator' }
    ],
    [
      { label: '4', action: () => handleNumber('4'), className: 'number' },
      { label: '5', action: () => handleNumber('5'), className: 'number' },
      { label: '6', action: () => handleNumber('6'), className: 'number' },
      { label: '-', action: () => handleOperator('-'), className: 'operator' }
    ],
    [
      { label: '1', action: () => handleNumber('1'), className: 'number' },
      { label: '2', action: () => handleNumber('2'), className: 'number' },
      { label: '3', action: () => handleNumber('3'), className: 'number' },
      { label: '+', action: () => handleOperator('+'), className: 'operator' }
    ],
    [
      { label: '±', action: () => handleFunction('negate', x => -x), className: 'function' },
      { label: '0', action: () => handleNumber('0'), className: 'number' },
      { label: '.', action: () => handleDecimal(), className: 'number' },
      { label: '=', action: () => handleEquals(), className: 'equals' }
    ]
  ];

  const scientificButtons = [
    [
      { label: angleMode, action: toggleAngleMode, className: 'mode' },
      { label: 'π', action: () => handleConstant('π'), className: 'constant' },
      { label: 'e', action: () => handleConstant('e'), className: 'constant' },
      { label: '(', action: () => handleOperator('('), className: 'parenthesis' },
      { label: ')', action: () => handleOperator(')'), className: 'parenthesis' }
    ],
    [
      { label: 'sin', action: () => handleScientificFunction('sin'), className: 'scientific' },
      { label: 'cos', action: () => handleScientificFunction('cos'), className: 'scientific' },
      { label: 'tan', action: () => handleScientificFunction('tan'), className: 'scientific' },
      { label: 'x²', action: () => handleFunction('square', x => x * x), className: 'scientific' },
      { label: 'x³', action: () => handleFunction('cube', x => x * x * x), className: 'scientific' }
    ],
    [
      { label: 'asin', action: () => handleScientificFunction('asin'), className: 'scientific' },
      { label: 'acos', action: () => handleScientificFunction('acos'), className: 'scientific' },
      { label: 'atan', action: () => handleScientificFunction('atan'), className: 'scientific' },
      { label: '√', action: () => handleScientificFunction('sqrt'), className: 'scientific' },
      { label: '∛', action: () => handleScientificFunction('cbrt'), className: 'scientific' }
    ],
    [
      { label: 'log', action: () => handleScientificFunction('log'), className: 'scientific' },
      { label: 'ln', action: () => handleScientificFunction('ln'), className: 'scientific' },
      { label: 'exp', action: () => handleScientificFunction('exp'), className: 'scientific' },
      { label: 'x!', action: () => handleScientificFunction('factorial'), className: 'scientific' },
      { label: '|x|', action: () => handleScientificFunction('abs'), className: 'scientific' }
    ]
  ];

  const advancedButtons = showAdvanced ? [
    [
      { label: '⌊x⌋', action: () => handleScientificFunction('floor'), className: 'advanced' },
      { label: '⌈x⌉', action: () => handleScientificFunction('ceil'), className: 'advanced' },
      { label: 'round', action: () => handleScientificFunction('round'), className: 'advanced' },
      { label: 'xʸ', action: () => handleOperator('^'), className: 'advanced' },
      { label: '10ˣ', action: () => handleFunction('pow10', x => Math.pow(10, x)), className: 'advanced' }
    ]
  ] : [];

  return (
    <div className="scientific-calculator">
      <div className="calculator-header">
        <h2>Scientific Calculator</h2>
        <button 
          className="toggle-advanced"
          onClick={toggleAdvanced}
          title={showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        >
          {showAdvanced ? '◀' : '▶'}
        </button>
      </div>
      
      <Display 
        value={display} 
        result={result} 
        error={error}
        history={history}
        showHistory={true}
      />
      
      <div className="calculator-body">
        <div className="scientific-panel">
          {scientificButtons.map((row, rowIndex) => (
            <div key={rowIndex} className="button-row">
              {row.map((button, buttonIndex) => (
                <button
                  key={buttonIndex}
                  className={`calc-button ${button.className}`}
                  onClick={button.action}
                  title={button.label}
                >
                  {button.label}
                </button>
              ))}
            </div>
          ))}
          
          {advancedButtons.map((row, rowIndex) => (
            <div key={`advanced-${rowIndex}`} className="button-row advanced-row">
              {row.map((button, buttonIndex) => (
                <button
                  key={buttonIndex}
                  className={`calc-button ${button.className}`}
                  onClick={button.action}
                  title={button.label}
                >
                  {button.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        
        <div className="basic-panel">
          <Keypad buttons={basicButtons} />
        </div>
      </div>
      
      <div className="calculator-footer">
        <div className="mode-indicator">
          Mode: {angleMode}
        </div>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScientificCalculator;