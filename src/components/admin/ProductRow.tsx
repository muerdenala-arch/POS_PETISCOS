import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCatalogStore } from '@/store/catalogStore';
import type { Product } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

export function ProductRow({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const toggleActive = useCatalogStore((s) => s.toggleActive);
  const removeProduct = useCatalogStore((s) => s.removeProduct);
  const totalStock = Object.values(product.stockByBranch).reduce((sum, n) => sum + n, 0);
  const lowStock = totalStock <= product.lowStockThreshold;

  return (
    <Card className="flex items-center gap-4 p-3.5">
      <div className={cn('flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl2 bg-gradient-to-br text-2xl', product.gradient)}>
        {product.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display font-bold text-ink">{product.name}</p>
          {!product.active && <Badge tone="neutral">Inactivo</Badge>}
          {lowStock && product.active && <Badge tone="warning">Stock bajo</Badge>}
        </div>
        <p className="truncate text-sm text-ink-muted">
          {product.category} · {formatCurrency(product.basePrice)} · Stock total: {totalStock}
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => toggleActive(product.id)}
        className={cn(
          'relative h-7 w-12 flex-shrink-0 rounded-full transition-colors cursor-pointer',
          product.active ? 'bg-secondary-500' : 'bg-cream-300',
        )}
        aria-label="Activar/desactivar"
      >
        {/* El "knob" se mantiene blanco en ambos temas (como en iOS/Android) para que
            siempre luzca "elevado" sobre el track de color. */}
        <motion.span
          layout
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: product.active ? '1.6rem' : '0.25rem' }}
        />
      </motion.button>

      <button
        onClick={onEdit}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-primary-50 hover:text-primary-700 cursor-pointer"
        aria-label="Editar"
      >
        <Pencil size={17} />
      </button>
      <button
        onClick={() => removeProduct(product.id)}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"
        aria-label="Eliminar"
      >
        <Trash2 size={17} />
      </button>
    </Card>
  );
}
