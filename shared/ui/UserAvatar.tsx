
import React, { FC } from 'react';
import { clsx } from 'clsx';

// Helper to determine text color based on background luminance
const getContrastColor = (hexColor: string): string => {
    if (!hexColor || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexColor)) {
        return '#ffffff'; // Default to white for invalid colors
    }

    let c = hexColor.substring(1).split('');
    if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    const hex = `0x${c.join('')}`;
    const r = (Number(hex) >> 16) & 255;
    const g = (Number(hex) >> 8) & 255;
    const b = Number(hex) & 255;

    // Formula for perceptive luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#1e293b' : '#ffffff'; // slate-800 or white
};

interface UserAvatarProps {
    name: string;
    color: string;
    size?: number;
    className?: string;
}

const UserAvatar: FC<UserAvatarProps> = ({ name, color, size = 28, className }) => {
    const initial = name?.trim().charAt(0).toUpperCase() || '?';
    const textColor = getContrastColor(color);

    return (
        <div
            className={clsx(
                'rounded-full flex items-center justify-center font-medium leading-none tracking-wide select-none',
                className
            )}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color || '#64748b', // Fallback color
                color: textColor,
                fontSize: `${Math.round(size * 0.45)}px`,
            }}
            aria-label={`Benutzer: ${name}`}
            role="img"
        >
            {initial}
        </div>
    );
};

export default UserAvatar;
