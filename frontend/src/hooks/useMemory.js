import { useState, useEffect } from 'react';
import { apiService } from '../services/api.js';

export const useMemory = () => {
  const [memorySlots, setMemorySlots] = useState({});
  const [currentValue, setCurrentValue] = useState(0);

  // Load memory slots on component mount
  useEffect(() => {
    loadMemorySlots();
  }, []);

  const loadMemorySlots = async () => {
    try {
      const slots = await apiService.get('/memory/slots');
      setMemorySlots(slots || {});
    } catch (error) {
      console.error('Failed to load memory slots:', error);
    }
  };

  // M+ (Memory Add) operation
  const memoryAdd = async (slotName = 'default') => {
    try {
      const currentSlotValue = memorySlots[slotName] || 0;
      const newValue = currentSlotValue + currentValue;

      await apiService.post('/memory/add', {
        slotName,
        value: currentValue
      });

      setMemorySlots(prev => ({
        ...prev,
        [slotName]: newValue
      }));

      return newValue;
    } catch (error) {
      console.error('Memory add operation failed:', error);
      throw error;
    }
  };

  // M- (Memory Subtract) operation
  const memorySubtract = async (slotName = 'default') => {
    try {
      const currentSlotValue = memorySlots[slotName] || 0;
      const newValue = currentSlotValue - currentValue;

      await apiService.post('/memory/subtract', {
        slotName,
        value: currentValue
      });

      setMemorySlots(prev => ({
        ...prev,
        [slotName]: newValue
      }));

      return newValue;
    } catch (error) {
      console.error('Memory subtract operation failed:', error);
      throw error;
    }
  };

  // MR (Memory Recall) operation
  const memoryRecall = async (slotName = 'default') => {
    try {
      const slot = await apiService.get(`/memory/recall/${slotName}`);
      const value = slot?.value || 0;

      setCurrentValue(value);
      return value;
    } catch (error) {
      console.error('Memory recall operation failed:', error);
      throw error;
    }
  };

  // MC (Memory Clear) operation
  const memoryClear = async (slotName = 'default') => {
    try {
      await apiService.delete(`/memory/clear/${slotName}`);

      setMemorySlots(prev => ({
        ...prev,
        [slotName]: 0
      }));

      return 0;
    } catch (error) {
      console.error('Memory clear operation failed:', error);
      throw error;
    }
  };

  return {
    memorySlots,
    currentValue,
    setCurrentValue,
    memoryAdd,
    memorySubtract,
    memoryRecall,
    memoryClear,
    loadMemorySlots
  };
};
