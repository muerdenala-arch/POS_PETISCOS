import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

// Estilo compartido por todo campo de texto/selector/textarea de la app: fondo "excavado"
// (`field`, distinto de las tarjetas) + borde marcado + foco en anillo ámbar, con buen
// contraste en ambos temas.
export const fieldClasses =
  'w-full rounded-xl border border-border-strong bg-field px-4 py-2.5 text-base text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors';

export const fieldLabelClasses = 'mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label className="flex flex-col">
        {label && <span className={fieldLabelClasses}>{label}</span>}
        <input ref={ref} id={id} className={cn('min-h-touch', fieldClasses, className)} {...props} />
      </label>
    );
  },
);
Input.displayName = 'Input';
