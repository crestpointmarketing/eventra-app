/**
 * Motion configuration and utilities for animations
 * Respects user's prefers-reduced-motion preference
 */

export const motionConfig = {
    shouldReduceMotion:
        typeof window !== 'undefined'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false,
}

// Page transition variants
export const pageTransition = motionConfig.shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.3 }

export const pageVariants = {
    initial: motionConfig.shouldReduceMotion
        ? { opacity: 1, y: 0 }
        : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: motionConfig.shouldReduceMotion
        ? { opacity: 1, y: 0 }
        : { opacity: 0, y: -10 },
}

// Button tap variants
export const tapScale = motionConfig.shouldReduceMotion ? 1 : 0.95

// Popover variants
export const popoverVariants = {
    initial: motionConfig.shouldReduceMotion
        ? { opacity: 1, scale: 1 }
        : { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: motionConfig.shouldReduceMotion
        ? { opacity: 1, scale: 1 }
        : { opacity: 0, scale: 0.95 },
}

export const popoverTransition = motionConfig.shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2 }

// Stagger children animation
export const staggerContainer = {
    animate: {
        transition: motionConfig.shouldReduceMotion
            ? { staggerChildren: 0 }
            : { staggerChildren: 0.05 },
    },
}

export const staggerItem = {
    initial: motionConfig.shouldReduceMotion
        ? { opacity: 1, y: 0 }
        : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
}
