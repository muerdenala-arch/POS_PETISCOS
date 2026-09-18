import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  extraKey?: string; // ej. '.' para decimales
  className?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function NumericKeypad({ onDigit, onBackspace, onClear, extraKey, className }: NumericKeypadProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {KEYS.map((key) => (
        <KeypadButton key={key} onClick={() => onDigit(key)}>
          {key}
        </KeypadButton>
      ))}
      <KeypadButton onClick={() => (extraKey ? onDigit(extraKey) : onClear?.())} muted>
        {extraKey ?? 'C'}
      </KeypadButton>
      <KeypadButton onClick={() => onDigit('0')}>0</KeypadButton>
      <KeypadButton onClick={onBackspace} muted>
        <Delete size={22} />
      </KeypadButton>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={cn(
        'flex min-h-touch-lg items-center justify-center rounded-2xl text-2xl font-display font-semibold cursor-pointer transition-colors',
        muted ? 'bg-cream-300 text-ink-muted hover:bg-cream-200' : 'bg-surface text-ink shadow-soft hover:bg-primary-50 dark:hover:bg-primary-500/10',
      )}
    >
      {children}
    </motion.button>
  );
}
