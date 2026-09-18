import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { modalOverlay, modalPanel } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          variants={modalOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            key="panel"
            variants={modalPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-full rounded-t-xl3 sm:rounded-xl3 border border-border bg-surface shadow-card max-h-[92vh] overflow-y-auto',
              sizeClasses[size],
              className,
            )}
          >
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
                <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-300 hover:text-ink cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
