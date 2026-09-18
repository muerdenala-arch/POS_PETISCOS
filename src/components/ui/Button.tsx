import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

const variantClasses = {
  primary:
    'bg-primary-500 text-primary-foreground shadow-soft hover:bg-primary-600 dark:shadow-glow-primary',
  secondary:
    'bg-secondary-500 text-secondary-foreground shadow-soft hover:bg-secondary-600 dark:shadow-glow-secondary',
  accent:
    'bg-accent-500 text-accent-foreground shadow-soft hover:bg-accent-600 dark:shadow-glow-accent',
  outline:
    'border-2 border-primary-300 text-primary-700 bg-surface hover:bg-primary-50 dark:border-primary-500/60 dark:text-primary-300 dark:hover:bg-primary-500/10',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'bg-destructive text-white hover:bg-red-700',
  subtle: 'bg-cream-300 text-ink hover:bg-cream-200',
} as const;

const sizeClasses = {
  sm: 'h-10 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'min-h-touch px-5 text-base rounded-2xl gap-2',
  lg: 'min-h-touch-lg px-7 text-lg font-semibold rounded-2xl gap-2.5',
} as const;

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-display font-semibold tracking-tight transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';
