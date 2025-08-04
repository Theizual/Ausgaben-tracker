import React from 'react';

const Logo: React.FC = () => {
  return (
    <svg viewBox="0 0 230 40" xmlns="http://www.w3.org/2000/svg" className="h-8 sm:h-10 w-auto">
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#FF4757', stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#FF6B7A', stopOpacity:1}} />
        </linearGradient>
      </defs>
      
      {/* Icon Container */}
      <g>
        {/* Background Circle */}
        <circle cx="20" cy="20" r="15" fill="#2C3E50" opacity="0.8"/>
        
        {/* Chart Bars */}
        <rect x="12" y="16" width="2.5" height="8" fill="url(#iconGradient)" rx="1.2"/>
        <rect x="16" y="13" width="2.5" height="11" fill="url(#iconGradient)" rx="1.2"/>
        <rect x="20" y="10" width="2.5" height="14" fill="url(#iconGradient)" rx="1.2"/>
        <rect x="24" y="14" width="2.5" height="10" fill="url(#iconGradient)" rx="1.2"/>
        
        {/* Trend Arrow */}
        <path d="M24 11 L27 8 L27 9.5 L29.5 9.5 L29.5 11 L27 11 L27 12.5 Z" fill="#FF4757"/>
      </g>
      
      {/* Text */}
      <text x="45" y="20" dominantBaseline="middle" fontFamily="Inter, system-ui, -apple-system, sans-serif" fontSize="21" fontWeight="600" fill="#FFFFFF">
        Ausgaben
      </text>
      <text x="142" y="20" dominantBaseline="middle" fontFamily="Inter, system-ui, -apple-system, sans-serif" fontSize="21" fontWeight="400" fill="#A0A9B8">
        Tracker
      </text>
    </svg>
  );
};

export default Logo;