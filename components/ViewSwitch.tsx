import React, { FC, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List } from './Icons';

type ViewMode = 'list' | 'grid';

interface ViewSwitchProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewSwitch: FC<ViewSwitchProps> = ({ viewMode, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(containerRef.current?.querySelectorAll('[role="tab"]') || []) as HTMLElement[];
    const activeIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    
    let nextIndex = activeIndex;
    if (event.key === 'ArrowRight') {
      nextIndex = (activeIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    }

    if (nextIndex !== activeIndex) {
      event.preventDefault();
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    }
  };

  const buttons: { mode: ViewMode, label: string, icon: FC<any> }[] = [
    { mode: 'list', label: 'Listenansicht', icon: List },
    { mode: 'grid', label: 'Kartenansicht', icon: LayoutGrid },
  ];

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      role="tablist"
      aria-label="Ansicht für Transaktionen"
      className="flex items-center space-x-1 bg-slate-700/80 p-1 rounded-full"
    >
      {buttons.map(({ mode, label, icon: Icon }) => {
        const isActive = viewMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            title={label}
            className={`relative px-2 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${
              isActive ? 'text-white' : 'text-slate-400 hover:bg-slate-600/50 hover:text-white'
            }`}
          >
            <AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="view-switch-active-bg"
                  className="absolute inset-0 bg-slate-600 rounded-full z-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </AnimatePresence>
            <Icon className="relative z-10 h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
};

export default ViewSwitch;
