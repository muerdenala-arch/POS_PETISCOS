import { motion } from 'framer-motion';
import { MapPin, Store } from 'lucide-react';
import type { Branch } from '@/types';
import { staggerContainer, staggerItem } from '@/lib/motion';

interface BranchPickerProps {
  userName: string;
  branches: Branch[];
  onSelect: (branchId: string) => void;
}

export function BranchPicker({ userName, branches, onSelect }: BranchPickerProps) {
  return (
    <div>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-500 text-white shadow-soft dark:shadow-glow-secondary">
          <Store size={26} />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">¿En qué sucursal trabajas hoy?</h2>
        <p className="text-sm text-ink-muted">Hola {userName.split(' ')[0]}, elige tu sucursal para este turno.</p>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
        {branches.map((b) => (
          <motion.button
            key={b.id}
            variants={staggerItem}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(b.id)}
            className="flex w-full min-h-touch-lg items-center gap-3 rounded-xl2 border-2 border-border bg-field px-4 py-3 text-left transition-colors hover:border-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-500/10 cursor-pointer"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15 dark:text-secondary-400">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display font-bold text-ink">{b.name}</p>
              <p className="truncate text-xs text-ink-muted">{b.address}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
