import type { Variants } from "framer-motion";

// Minimalist Monochrome motion philosophy: minimal and instant. No bounce,
// no spring, no slow easing — sharp, deliberate, binary state changes.
export const EASE = "easeOut" as const;

/** Centralized motion tokens — durations (seconds) + shared easing. */
export const MOTION = {
  instant: 0.1, // hover / press / focus state changes
  fast: 0.15, // small component transitions
  normal: 0.25, // content reveals
  slow: 0.4, // section-level reveals — used sparingly
  ease: EASE,
} as const;

/** Container that staggers its children in. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

/** Fade + rise, for section/content reveals. No spring, no overshoot. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.normal, ease: EASE },
  },
};

/** Fade-in for cards — sharp, no scale bounce. */
export const cardIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.fast, ease: EASE },
  },
};

/** Node fade-in for the connection-path visualiser. */
export const pathNode: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: MOTION.fast, ease: EASE } },
};

export const viewportOnce = { once: true, amount: 0.3 } as const;
