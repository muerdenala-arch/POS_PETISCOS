import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { resolveTheme, useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = resolveTheme(mode) === 'dark';

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={isDark}
      className={cn(
        'relative flex h-9 w-16 flex-shrink-0 items-center rounded-full bg-cream-300 p-1 shadow-soft transition-colors cursor-pointer',
        className,
      )}
    >
      <Sun size={14} className="absolute left-2 text-amber-500 opacity-70" />
      <Moon size={14} className="absolute right-2 text-indigo-300 opacity-70" />
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-card"
        style={{ marginLeft: isDark ? 'calc(100% - 1.75rem)' : '0' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ opacity: 0, rotate: -60, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 60, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center text-indigo-400"
            >
              <Moon size={14} fill="currentColor" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ opacity: 0, rotate: 60, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -60, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center text-primary-500"
            >
              <Sun size={14} fill="currentColor" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  );
}
