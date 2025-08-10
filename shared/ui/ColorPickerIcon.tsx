
import React, { FC } from 'react';
import { clsx } from 'clsx';

interface ColorPickerIconProps {
    id?: string;
    size?: number;
    className?: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    ariaLabel?: string;
}

export const ColorPickerIcon: FC<ColorPickerIconProps> = ({
    id,
    size = 20,
    className,
    onClick,
    ariaLabel = 'Farbe wählen'
}) => {
    return (
        <button
            id={id}
            type="button"
            onClick={onClick}
            className={clsx(
                'rounded-full border border-white/10 opacity-90 hover:opacity-100 transform hover:scale-105 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 focus-visible:ring-offset-slate-800',
                'bg-[conic-gradient(from_180deg_at_50%_50%,hsl(0,60%,65%),hsl(60,60%,65%),hsl(120,60%,65%),hsl(180,60%,65%),hsl(240,60%,65%),hsl(300,60%,65%),hsl(360,60%,65%))]',
                className
            )}
            style={{ width: `${size}px`, height: `${size}px` }}
            aria-label={ariaLabel}
            title={ariaLabel}
        />
    );
};
