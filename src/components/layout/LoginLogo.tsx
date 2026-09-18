import { motion, useReducedMotion } from 'framer-motion';
import { resolveTheme, useThemeStore } from '@/store/themeStore';
import { APP_CONFIG } from '@/config/app';
import logoFull from '@/assets/brand/logo-full.png';
import logoFullDark from '@/assets/brand/logo-full-dark.png';

/**
 * Logo del login: imagen recortada en círculo elegante con borde sutil,
 * fondo traslúcido glassmorphism, halo animado y brillo de entrada.
 */
export function LoginLogo() {
  const mode = useThemeStore((s) => s.mode);
  const isDark = resolveTheme(mode) === 'dark';
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mb-3 flex h-32 items-center justify-center">
      {/* Halo "splash" detrás del logo */}
      <motion.div
        aria-hidden
        className="absolute h-36 w-36 rounded-full blur-2xl bg-[conic-gradient(from_0deg,theme(colors.primary.400),theme(colors.accent.400),theme(colors.secondary.400),theme(colors.primary.400))]"
        style={{ opacity: isDark ? 0.4 : 0.45 }}
        animate={
          reduceMotion
            ? undefined
            : {
                scale: [1, 1.1, 1],
                rotate: [0, 18, 0],
                opacity: isDark ? [0.35, 0.5, 0.35] : [0.4, 0.55, 0.4],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Contenedor circular elegante */}
      <motion.div
        initial={{ opacity: 0, scale: 0.65, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
        className="relative z-10"
      >
        {/* Anillo exterior (glassmorphism) */}
        <div className="rounded-full p-[3px] bg-gradient-to-br from-primary-300 via-secondary-300 to-accent-300 shadow-lg dark:from-primary-500 dark:via-secondary-500 dark:to-accent-500">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80 shadow-inner">
            <img
              src={isDark ? logoFullDark : logoFull}
              alt={APP_CONFIG.storeName}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        {/* Brillo de entrada — recorre el logo una sola vez al montar */}
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-full"
          >
            <motion.span
              className="absolute inset-y-0 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/60 to-transparent"
              initial={{ x: '-140%' }}
              animate={{ x: '360%' }}
              transition={{ duration: 1.0, delay: 0.6, ease: 'easeInOut' }}
            />
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
