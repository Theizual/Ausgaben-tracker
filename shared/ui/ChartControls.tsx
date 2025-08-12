
import React, { FC } from 'react';
import { Button } from './Button';
import { Plus, Minus, RefreshCw, ArrowLeftRight, ArrowUpDown } from './Icons';

interface ChartControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    zoomAxis: 'x' | 'y';
    onZoomAxisChange: (axis: 'x' | 'y') => void;
}

export const ChartControls: FC<ChartControlsProps> = ({ onZoomIn, onZoomOut, onReset, zoomAxis, onZoomAxisChange }) => {
    return (
        <div className="flex items-center gap-1 bg-slate-700/50 p-1 rounded-full">
            <Button variant="ghost" size="icon-sm" onClick={onZoomIn} title="Hereinzoomen">
                <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onZoomOut} title="Herauszoomen">
                <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onZoomAxisChange(zoomAxis === 'x' ? 'y' : 'x')} title={`Zoom-Achse wechseln (Aktuell: ${zoomAxis.toUpperCase()})`}>
                {zoomAxis === 'x' ? <ArrowLeftRight className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
            </Button>
            <div className="w-px h-5 bg-slate-600/80 mx-1" />
            <Button variant="ghost" size="icon-sm" onClick={onReset} title="Zoom zurücksetzen">
                <RefreshCw className="h-4 w-4" />
            </Button>
        </div>
    );
};
