import { useEffect } from 'react';
import { resolveTheme, useThemeStore } from '@/store/themeStore';

/**
 * Aplica la clase `dark` al elemento raíz según el modo elegido (claro/oscuro/sistema)
 * y se mantiene sincronizado si el modo es "sistema" y el SO cambia de preferencia.
 */
export function useThemeEffect() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const resolved = resolveTheme(mode);
      root.classList.toggle('dark', resolved === 'dark');
      root.style.colorScheme = resolved;
    };

    apply();

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [mode]);
}
