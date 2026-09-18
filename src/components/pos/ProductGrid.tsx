import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useCatalogStore } from '@/store/catalogStore';
import { usePromotionStore } from '@/store/promotionStore';
import { useSalesStore } from '@/store/salesStore';
import type { Product, Promotion } from '@/types';
import { staggerContainer, staggerItem, cardHover } from '@/lib/motion';
import { cn, formatCurrency } from '@/lib/utils';
import { fieldClasses } from '@/components/ui/Input';
import { applyPromoDiscount } from '@/store/cartStore';

interface ProductGridProps {
  branchId: string;
  onSelect: (product: Product) => void;
}

export function ProductGrid({ branchId, onSelect }: ProductGridProps) {
  const products = useCatalogStore((s) => s.products);
  const sales = useSalesStore((s) => s.sales);
  const activePromotionFor = usePromotionStore((s) => s.activePromotionFor);
  const [category, setCategory] = useState<string>('Todos');
  const [query, setQuery] = useState('');

  const branchProducts = useMemo(
    () => products.filter((p) => p.branchIds.includes(branchId)),
    [products, branchId],
  );

  const topSellingProductIds = useMemo(() => {
    const branchSales = sales.filter((s) => s.branchId === branchId);
    const counts = new Map<string, number>();
    for (const sale of branchSales) {
      for (const item of sale.items) {
        counts.set(item.product.id, (counts.get(item.product.id) || 0) + item.quantity);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map((entry) => entry[0]);
  }, [sales, branchId]);

  const categories = useMemo(() => {
    const cats = ['Todos', ...Array.from(new Set(branchProducts.map((p) => p.category)))];
    if (topSellingProductIds.length > 0) {
      cats.splice(1, 0, '⭐ Más Vendidos');
    }
    return cats;
  }, [branchProducts, topSellingProductIds]);

  const filtered = useMemo(() => {
    return branchProducts
      .filter((p) => {
        if (!p.active) return false;
        if (category === '⭐ Más Vendidos') {
          if (!topSellingProductIds.includes(p.id)) return false;
        } else if (category !== 'Todos' && p.category !== category) {
          return false;
        }
        if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (category === '⭐ Más Vendidos') {
          return topSellingProductIds.indexOf(a.id) - topSellingProductIds.indexOf(b.id);
        }
        return 0;
      });
  }, [branchProducts, category, query, topSellingProductIds]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface px-5 py-3">
        <div className="relative w-full">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto..."
            className={cn(fieldClasses, 'min-h-touch pl-10 w-full')}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer',
                category === c ? 'bg-primary-500 text-white' : 'bg-cream-300 text-ink-muted hover:bg-cream-200',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* min-h-0: sin esto, el grid de productos no se encoge y "empuja" la fila completa
          (incluida la columna del carrito) más allá de h-full al cambiar de categoría. */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3.5 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            branchId={branchId}
            promo={activePromotionFor({ id: product.id, category: product.category }, branchId)}
            onSelect={onSelect}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-ink-soft">No se encontraron productos.</p>
        )}
      </motion.div>
    </div>
  );
}

// Los productos que no cambiaron conservan la misma referencia entre polls (catalogStore
// actualiza con .map() inmutable, solo el ítem tocado recibe un objeto nuevo) — memo() evita
// re-renderizar (y re-animar con Framer Motion) las tarjetas que no tienen nada nuevo.
const ProductCard = memo(function ProductCard({
  product,
  branchId,
  promo,
  onSelect,
}: {
  product: Product;
  branchId: string;
  promo: Promotion | null;
  onSelect: (p: Product) => void;
}) {
  const stock = product.stockByBranch[branchId] ?? 0;
  const lowStock = stock <= product.lowStockThreshold;
  const outOfStock = stock <= 0;

  // Calcula precio display (mínimo de tamaños o basePrice, con promo si aplica)
  const originalBasePrice =
    product.sizes && product.sizes.length > 0
      ? Math.min(...product.sizes.map((s) => s.price))
      : product.basePrice;
  const displayPrice = promo ? applyPromoDiscount(originalBasePrice, promo) : originalBasePrice;
  const hasPromo = !!promo;

  return (
    <motion.button
      variants={staggerItem}
      {...cardHover}
      disabled={outOfStock}
      onClick={() => onSelect(product)}
      className="group relative flex flex-col overflow-hidden rounded-xl2 bg-surface text-left shadow-soft transition-shadow hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      {/* Badge de promo */}
      {hasPromo && (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          🏷️ {promo!.discountType === 'PERCENTAGE' ? `${promo!.discountValue}% OFF` : `-${formatCurrency(promo!.discountValue)}`}
        </div>
      )}

      <div className={cn('flex h-24 items-center justify-center bg-gradient-to-br text-4xl sm:h-28', product.gradient || 'from-cream-200 to-cream-300')}>
        {product.emoji || '🍓'}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <p className="font-display text-sm font-bold leading-tight text-ink sm:text-base">{product.name}</p>
        <p className="text-xs text-ink-muted line-clamp-1">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <div className="flex flex-col">
            {hasPromo && (
              <span className="text-[11px] font-medium text-ink-soft line-through tabular-nums">
                {product.sizes && product.sizes.length > 0 ? `Desde ${formatCurrency(originalBasePrice)}` : formatCurrency(originalBasePrice)}
              </span>
            )}
            <span className={cn('font-display text-base font-bold tabular-nums', hasPromo ? 'text-green-600' : 'text-primary-600')}>
              {product.sizes && product.sizes.length > 0
                ? `Desde ${formatCurrency(displayPrice)}`
                : formatCurrency(displayPrice)}
            </span>
          </div>
          {outOfStock ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">Agotado</span>
          ) : lowStock ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              Quedan {stock}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
});
