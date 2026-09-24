import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api.js';

export const useMemory = () => {
    const [memorySlots, setMemorySlots] = useState({});
    const [currentSlot, setCurrentSlot] = useState('default');

    // Load memory slots on initialization
    useEffect(() => {
        loadMemorySlots();
    }, []);

    const loadMemorySlots = async () => {
        try {
            const response = await apiService.get('/api/memory/slots');
            const slots = {};
            response.data.forEach(slot => {
                slots[slot.name] = {
                    value: slot.value,
                    metadata: JSON.parse(slot.metadata || '{}')
                };
            });
            setMemorySlots(slots);
        } catch (error) {
            console.error('Failed to load memory slots:', error);
        }
    };

    const memoryStore = useCallback(async (value, slotName = currentSlot) => {
        try {
            await apiService.post('/api/memory/store', {
                name: slotName,
                value: value,
                metadata: { operation: 'store', timestamp: Date.now() }
            });
            setMemorySlots(prev => ({
                ...prev,
                [slotName]: {
                    value: value,
                    metadata: { operation: 'store', timestamp: Date.now() }
                }
            }));
        } catch (error) {
            console.error('Memory store failed:', error);
        }
    }, [currentSlot]);

    const memoryRecall = useCallback(async (slotName = currentSlot) => {
        try {
            const response = await apiService.get(`/api/memory/recall/${slotName}`);
            return response.data.value || 0;
        } catch (error) {
            console.error('Memory recall failed:', error);
            return 0;
        }
    }, [currentSlot]);

    const memoryAdd = useCallback(async (value, slotName = currentSlot) => {
        try {
            const currentValue = await memoryRecall(slotName);
            const newValue = currentValue + value;
            await memoryStore(newValue, slotName);
            return newValue;
        } catch (error) {
            console.error('Memory add failed:', error);
        }
    }, [currentSlot, memoryRecall, memoryStore]);

    const memorySubtract = useCallback(async (value, slotName = currentSlot) => {
        try {
            const currentValue = await memoryRecall(slotName);
            const newValue = currentValue - value;
            await memoryStore(newValue, slotName);
            return newValue;
        } catch (error) {
            console.error('Memory subtract failed:', error);
        }
    }, [currentSlot, memoryRecall, memoryStore]);

    const memoryClear = useCallback(async (slotName = currentSlot) => {
        try {
            await apiService.delete(`/api/memory/clear/${slotName}`);
            setMemorySlots(prev => {
                const updated = { ...prev };
                delete updated[slotName];
                return updated;
            });
        } catch (error) {
            console.error('Memory clear failed:', error);
        }
    }, [currentSlot]);

    const getCurrentMemoryValue = useCallback((slotName = currentSlot) => {
        return memorySlots[slotName]?.value || 0;
    }, [memorySlots, currentSlot]);

    const getMemorySlotNames = useCallback(() => {
        return Object.keys(memorySlots);
    }, [memorySlots]);

    return {
        memoryStore,
        memoryRecall,
        memoryAdd,
        memorySubtract,
        memoryClear,
        getCurrentMemoryValue,
        getMemorySlotNames,
        currentSlot,
        setCurrentSlot,
        memorySlots,
        loadMemorySlots
    };
};
