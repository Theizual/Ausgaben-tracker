
import React, { FC, useCallback } from 'react';

interface ResizeHandleProps {
    onResize: (newHeight: number) => void;
}

export const ResizeHandle: FC<ResizeHandleProps> = ({ onResize }) => {
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const startY = e.clientY;
        const startHeight = e.currentTarget.parentElement?.offsetHeight || 0;
        
        const doDrag = (moveEvent: MouseEvent) => {
            const newHeight = startHeight + moveEvent.clientY - startY;
            onResize(Math.max(220, Math.min(600, newHeight)));
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag, false);
            document.removeEventListener('mouseup', stopDrag, false);
        };

        document.addEventListener('mousemove', doDrag, false);
        document.addEventListener('mouseup', stopDrag, false);
    }, [onResize]);
    
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const startY = e.touches[0].clientY;
        const startHeight = e.currentTarget.parentElement?.offsetHeight || 0;

        const doDrag = (moveEvent: TouchEvent) => {
            const newHeight = startHeight + moveEvent.touches[0].clientY - startY;
            onResize(Math.max(220, Math.min(600, newHeight)));
        };

        const stopDrag = () => {
            document.removeEventListener('touchmove', doDrag, false);
            document.removeEventListener('touchend', stopDrag, false);
        };

        document.addEventListener('touchmove', doDrag, false);
        document.addEventListener('touchend', stopDrag, false);

    }, [onResize]);

    return (
        <div 
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-5 flex items-center justify-center cursor-ns-resize group touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            aria-label="Diagrammhöhe anpassen"
            role="separator"
            aria-orientation="horizontal"
        >
            <div className="w-10 h-1.5 bg-slate-600 rounded-full group-hover:bg-slate-500 transition-colors" />
        </div>
    );
};
