


import React from 'react';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';
import { X } from './Icons';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { clsx } from 'clsx';

const modalSizeClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

export const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    size = 'lg', 
    footer, 
    children 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    title: string, 
    size?: keyof typeof modalSizeClasses, 
    footer?: React.ReactNode, 
    children: React.ReactNode 
}) => {
    useEscapeKey(onClose);

    if (!isOpen) return null;

    const backdropAnimation: MotionProps = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    };
    
    const modalAnimation: MotionProps = {
        initial: { scale: 0.95, y: 20 },
        animate: { scale: 1, y: 0 },
        exit: { scale: 0.95, y: 20 },
        transition: { type: 'spring', stiffness: 350, damping: 30 },
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                {...backdropAnimation}
                onClick={onClose}
            >
                <motion.div
                    className={clsx(
                        "bg-slate-800 rounded-2xl w-full shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]",
                        modalSizeClasses[size]
                    )}
                    onClick={(e) => e.stopPropagation()}
                    {...modalAnimation}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <header className="relative p-4 sm:p-6 border-b border-slate-700 flex-shrink-0">
                        <h2 id="modal-title" className="text-lg font-bold text-white">{title}</h2>
                        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Dialog schließen">
                            <X className="h-5 w-5" />
                        </button>
                    </header>
                    <main className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-grow">
                        {children}
                    </main>
                    {footer && (
                        <footer className="p-4 sm:p-6 border-t border-slate-700 flex-shrink-0">
                            {footer}
                        </footer>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};