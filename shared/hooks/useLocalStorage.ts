import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                return JSON.parse(item);
            }
            return initialValue instanceof Function ? initialValue() : initialValue;
        } catch (error) {
            // console.error(error);
            return initialValue instanceof Function ? initialValue() : initialValue;
        }
    });

    useEffect(() => {
        try {
            const serializedState = JSON.stringify(storedValue);
            window.localStorage.setItem(key, serializedState);
        } catch (error) {
            // console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

export default useLocalStorage;