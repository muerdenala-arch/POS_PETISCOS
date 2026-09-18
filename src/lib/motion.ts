import type { Transition, Variants } from 'framer-motion';

// Curva de energía "frutal": entra rápido y rebota levemente, sale más rápido
// que entra (regla de motion design: exit más veloz que enter).
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.6 };
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 26 };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.045, delayChildren: 0.02 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSnappy },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.12 } },
};

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

export const modalPanel: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { ...springSnappy, delay: 0.02 } },
  exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: springSoft },
  exit: { opacity: 0, x: 40, transition: { duration: 0.15 } },
};

export const popTap = {
  whileTap: { scale: 0.95 },
};

export const cardHover = {
  whileHover: { y: -3, scale: 1.015 },
  whileTap: { scale: 0.97 },
};
