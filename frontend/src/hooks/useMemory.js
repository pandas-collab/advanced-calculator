import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api.js';

export const useMemory = () => {
    const [memorySlots, setMemorySlots] = useState({});
    const [currentSlot, setCurrentSlot] = useState('default');
    const [currentValue, setCurrentValue] = useState(0);

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
            try {
                const fallbackSlots = await apiService.get('/memory/slots');
                setMemorySlots(fallbackSlots || {});
            } catch (fallbackError) {
                console.error('Fallback memory slots load failed:', fallbackError);
            }
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
            try {
                const slot = await apiService.get(`/memory/recall/${slotName}`);
                const value = slot?.value || 0;
                setCurrentValue(value);
                return value;
            } catch (fallbackError) {
                console.error('Fallback memory recall failed:', fallbackError);
                return 0;
            }
        }
    }, [currentSlot]);

    const memoryAdd = useCallback(async (value, slotName = currentSlot) => {
        try {
            if (value !== undefined) {
                const currentSlotValue = await memoryRecall(slotName);
                const newValue = currentSlotValue + value;
                await memoryStore(newValue, slotName);
                return newValue;
            } else {
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
            }
        } catch (error) {
            console.error('Memory add failed:', error);
            throw error;
        }
    }, [currentSlot, currentValue, memoryRecall, memoryStore, memorySlots]);

    const memorySubtract = useCallback(async (value, slotName = currentSlot) => {
        try {
            if (value !== undefined) {
                const currentSlotValue = await memoryRecall(slotName);
                const newValue = currentSlotValue - value;
                await memoryStore(newValue, slotName);
                return newValue;
            } else {
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
            }
        } catch (error) {
            console.error('Memory subtract failed:', error);
            throw error;
        }
    }, [currentSlot, currentValue, memoryRecall, memoryStore, memorySlots]);

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
            try {
                await apiService.delete(`/memory/clear/${slotName}`);
                setMemorySlots(prev => ({
                    ...prev,
                    [slotName]: 0
                }));
                return 0;
            } catch (fallbackError) {
                console.error('Fallback memory clear failed:', fallbackError);
                throw fallbackError;
            }
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
        currentValue,
        setCurrentValue,
        loadMemorySlots
    };
};
