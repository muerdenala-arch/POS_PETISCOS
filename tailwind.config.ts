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
          DEFAULT: '#F1710A',
          50: '#FFF4EA',
          100: '#FFE4C7',
          200: '#FFC98D',
          300: '#FFA84F',
          400: '#FA8C24',
          500: '#F1710A',
          600: '#D45A05',
          700: '#AD4506',
          800: '#8B380C',
          900: '#722F0D',
          foreground: '#FFFFFF',
        },
        secondary: {
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
        accent: {
          DEFAULT: '#EC4899',
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
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
        soft: '0 2px 10px -2px rgba(114, 47, 13, 0.10)',
        card: '0 8px 24px -8px rgba(114, 47, 13, 0.18)',
        pop: '0 14px 40px -12px rgba(241, 113, 10, 0.35)',
        // Glow frutal para modo oscuro — acentos que "brillan" sobre fondo zinc.
        'glow-primary': '0 0 0 1px rgba(241,113,10,0.4), 0 0 24px -4px rgba(241,113,10,0.55)',
        'glow-secondary': '0 0 0 1px rgba(30,158,90,0.4), 0 0 24px -4px rgba(30,158,90,0.55)',
        'glow-accent': '0 0 0 1px rgba(236,72,153,0.4), 0 0 24px -4px rgba(236,72,153,0.55)',
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
