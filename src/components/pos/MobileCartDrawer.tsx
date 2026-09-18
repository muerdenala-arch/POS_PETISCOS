import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { CartPanel } from '@/components/pos/CartPanel';

interface MobileCartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  branchId: string;
}

/**
 * Carrito como bottom sheet en móvil/tablet (< lg) — mismo contenido que el sidebar de
 * escritorio (CartPanel), solo que aquí entra deslizando desde abajo.
 */
export function MobileCartDrawer({ open, onClose, onCheckout, branchId }: MobileCartDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            aria-hidden
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Orden actual"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-xl3 bg-surface shadow-card lg:hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="relative flex flex-shrink-0 items-center justify-center pb-1 pt-2.5">
              <span aria-hidden className="h-1.5 w-12 rounded-full bg-cream-300" />
              <button
                onClick={onClose}
                aria-label="Cerrar orden"
                className="absolute right-3 top-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-300 hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
              <CartPanel variant="drawer" onCheckout={onCheckout} branchId={branchId} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
