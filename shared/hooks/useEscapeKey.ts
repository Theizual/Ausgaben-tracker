import { useEffect } from 'react';

/**
 * Custom hook to execute a callback when the Escape key is pressed.
 * @param onEscape The callback function to execute. Should be memoized with useCallback if it has dependencies.
 */
export function useEscapeKey(onEscape: () => void) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onEscape();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onEscape]);
}