import type { Config } from 'tailwindcss';

// Design tokens — Dirección visual UI/UX Pro Max
// Paleta "Frutal Fresca": mango + lima + sandía sobre base crema cálida.
// Contraste verificado ≥ 4.5:1 para texto sobre fondo/tarjetas (pantallas táctiles).
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E9E5A',
          50: '#EAFBF1',
          100: '#CDF5DE',
          200: '#9DE8BE',
          300: '#65D399',
          400: '#38BA7C',
          500: '#1E9E5A',
          600: '#137F48',
          700: '#12653B',
          800: '#125031',
          900: '#0F422A',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#EAB308',
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          foreground: '#FFFFFF',
        },
        // Tokens de superficie/texto respaldados por variables CSS (ver src/index.css)
        // para que el mismo nombre de clase resuelva claro u oscuro según la clase `dark`.
        cream: {
          DEFAULT: 'rgb(var(--color-bg) / <alpha-value>)',
          100: 'rgb(var(--color-surface-1) / <alpha-value>)',
          200: 'rgb(var(--color-surface-2) / <alpha-value>)',
          300: 'rgb(var(--color-surface-3) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
        },
        // Fondo/borde específico de campos de formulario (inputs, selects, textareas):
        // un tono distinto de `surface` para que el campo se note "excavado" en la tarjeta.
        field: {
          DEFAULT: 'rgb(var(--color-surface-1) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
          soft: 'rgb(var(--color-text-soft) / <alpha-value>)',
        },
        success: '#1E9E5A',
        warning: '#D97706',
        destructive: '#DC2626',
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(18, 80, 49, 0.10)',
        card: '0 8px 24px -8px rgba(18, 80, 49, 0.18)',
        pop: '0 14px 40px -12px rgba(30, 158, 90, 0.35)',
        // Glow para modo oscuro
        'glow-primary': '0 0 0 1px rgba(30,158,90,0.4), 0 0 24px -4px rgba(30,158,90,0.55)',
        'glow-secondary': '0 0 0 1px rgba(234,179,8,0.4), 0 0 24px -4px rgba(234,179,8,0.55)',
        'glow-accent': '0 0 0 1px rgba(245,158,11,0.4), 0 0 24px -4px rgba(245,158,11,0.55)',
      },
      spacing: {
        touch: '3rem',
      },
      minHeight: {
        touch: '3rem',
        'touch-lg': '4rem',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
