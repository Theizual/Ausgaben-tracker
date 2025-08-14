export const MODAL_SPRING = { type: 'spring' as const, bounce: 0.2, duration: 0.4 };

export const modalBackdropAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

export const modalContentAnimation = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: MODAL_SPRING,
};

const slideDownTransition = { type: 'spring' as const, bounce: 0.4, duration: 0.5 };
export const modalSlideDownAnimation = {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: slideDownTransition,
};

const pageContentTransition = { duration: 0.3 };
export const pageContentAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: pageContentTransition
};

export const settingsContentAnimation = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 }
};

export const collapsibleAnimation = {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto', transition: { duration: 0.2, ease: 'easeInOut' as const } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: 'easeInOut' as const } },
};

export const transactionDetailsAnimation = {
    initial: { opacity: 0, height: 0, marginTop: 0 },
    animate: { opacity: 1, height: 'auto', marginTop: '1rem' },
    exit: { opacity: 0, height: 0, marginTop: 0 },
};

export const barAnimation = (percentageBefore: number, percentageAfter: number) => ({
    initial: { width: `${Math.min(percentageBefore, 100)}%` },
    animate: { width: `${Math.min(percentageAfter, 100)}%` },
    transition: { duration: 0.8, ease: "easeOut" as const, delay: 0.3 },
});