import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Check, StickyNote } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fieldClasses } from '@/components/ui/Input';
import { useCatalogStore } from '@/store/catalogStore';
import { useCartStore } from '@/store/cartStore';
import { usePromotionStore } from '@/store/promotionStore';
import { applyPromoDiscount } from '@/store/cartStore';
import type { CartModifiers, Product, Topping } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface ModifierModalProps {
  product: Product | null;
  branchId: string;
  onClose: () => void;
  onAdded: (productName: string) => void;
}

export function ModifierModal({ product, branchId, onClose, onAdded }: ModifierModalProps) {
  const toppingsCatalog = useCatalogStore((s) => s.toppings);
  const addItem = useCartStore((s) => s.addItem);
  const activePromotionFor = usePromotionStore((s) => s.activePromotionFor);

  const [sizeId, setSizeId] = useState(product?.sizes[0]?.id ?? '');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const availableToppings = useMemo(
    () => toppingsCatalog.filter((t) => product?.toppingIds.includes(t.id) && t.branchIds.includes(branchId)),
    [toppingsCatalog, product, branchId],
  );

  if (!product) return null;

  const size = product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
  const promo = activePromotionFor({ id: product.id, category: product.category, sizeId: size?.id }, branchId);
  const toppings: Topping[] = availableToppings.filter((t) => selectedToppings.includes(t.id));
  const toppingsTotal = toppings.reduce((sum, t) => sum + t.priceExtra, 0);
  const sizePrice = product.sizes && product.sizes.length > 0 ? size.price : product.basePrice;
  const originalUnitPrice = sizePrice + toppingsTotal;
  const unitPrice = applyPromoDiscount(originalUnitPrice, promo);
  const lineTotal = unitPrice * quantity;
  const hasPromo = !!promo && unitPrice < originalUnitPrice;

  function toggleTopping(id: string) {
    setSelectedToppings((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function handleReset() {
    setSizeId(product!.sizes[0]?.id ?? '');
    setSelectedToppings([]);
    setQuantity(1);
    setNotes('');
    setShowNotes(false);
  }

  function handleAdd() {
    const modifiers: CartModifiers = {
      size,
      toppings,
    };
    addItem(product!, modifiers, quantity, notes || undefined, promo);
    onAdded(product!.name);
    handleReset();
    onClose();
  }

  return (
    <Modal open={!!product} onClose={onClose} title={product.name} size="md">
      <div className="px-5 pb-4 pt-3">
        {/* Banner del producto — más compacto */}
        <div className={cn('mb-4 flex items-center gap-3 rounded-xl p-3 text-white bg-gradient-to-br', product.gradient)}>
        <span className="text-3xl">{product.emoji}</span>
        <div className="min-w-0">
          <p className="text-xs opacity-90 line-clamp-1">{product.description}</p>
          <div className="flex items-baseline gap-2">
            {hasPromo && (
              <p className="font-display text-sm font-bold line-through opacity-60">
                {product.sizes.length > 0 ? `${formatCurrency(originalUnitPrice)} · ${size?.label ?? ''}` : formatCurrency(originalUnitPrice)}
              </p>
            )}
            <p className={cn('font-display text-base font-bold', hasPromo && 'text-green-300')}>
              {product.sizes.length > 0 ? `${formatCurrency(unitPrice)} · ${size?.label ?? ''}` : formatCurrency(unitPrice)}
            </p>
            {hasPromo && <span className="rounded-full bg-green-400/20 px-2 py-0.5 text-[10px] font-bold text-green-200">🏷️ PROMO</span>}
          </div>
        </div>
      </div>

        {/* ── Tamaños (chips) ──────────────────────────────────────────── */}
        <SectionTitle>Tamaño</SectionTitle>
        <div className={cn('mb-4 grid gap-2', product.sizes.length <= 2 ? 'grid-cols-2' : 'grid-cols-4')}>
          {product.sizes.map((s) => {
            const active = s.id === sizeId;
            return (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 py-2.5 text-center text-sm font-semibold transition-all',
                  active
                    ? 'border-primary-500 bg-primary-500 text-white shadow-md'
                    : 'border-border bg-surface text-ink hover:border-primary-300',
                )}
              >
                <span>{s.label}</span>
                {s.ounces > 0 && (
                  <span className={cn('text-[10px] font-normal', active ? 'text-white/75' : 'text-ink-soft')}>
                    {s.ounces} ml
                  </span>
                )}
                {s.price > 0 && (
                  <span className={cn('text-[10px] font-semibold', active ? 'text-white/90' : 'text-primary-500')}>
                    {formatCurrency(s.price)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Toppings (grid 3 col) ────────────────────────────────────── */}
        {availableToppings.length > 0 && (
          <>
            <SectionTitle>Agregados</SectionTitle>
            <div className="mb-4 grid grid-cols-3 gap-1.5">
              {availableToppings.map((t) => {
                const outOfStock = (t.stockByBranch[branchId] ?? 0) <= 0;
                const active = selectedToppings.includes(t.id);
                return (
                  <button
                    key={t.id}
                    disabled={outOfStock}
                    onClick={() => toggleTopping(t.id)}
                    className={cn(
                      'relative flex cursor-pointer flex-col items-start rounded-xl border-2 px-3 py-2 text-left text-xs transition-all disabled:cursor-not-allowed disabled:opacity-40',
                      active
                        ? 'border-secondary-500 bg-secondary-500 text-white shadow-sm'
                        : 'border-border bg-surface text-ink hover:border-secondary-300',
                    )}
                  >
                    {active && (
                      <Check
                        size={11}
                        className="absolute right-2 top-2 opacity-90"
                      />
                    )}
                    <span className="font-semibold leading-tight">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Notas (colapsable) ───────────────────────────────────────── */}
        <button
          onClick={() => setShowNotes((v) => !v)}
          className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <StickyNote size={13} />
          {showNotes ? 'Ocultar notas' : 'Agregar nota (opcional)'}
        </button>
        {showNotes && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. sin hielo, para llevar..."
            rows={2}
            className={cn(fieldClasses, 'mb-3 text-sm')}
            autoFocus
          />
        )}

        {/* ── Cantidad (siempre visible) ───────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5 dark:bg-zinc-800/60">
          <span className="text-sm font-semibold text-ink-muted">Cantidad</span>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <Minus size={15} />
            </motion.button>
            <span className="w-6 text-center font-display text-lg font-bold">{quantity}</span>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                const maxQuantity = product.stockByBranch[branchId] ?? 0;
                setQuantity((q) => Math.min(maxQuantity, q + 1));
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <Plus size={15} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Footer sticky — siempre visible */}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-5 py-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-transparent bg-zinc-100 px-4 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancelar
        </Button>
        <Button onClick={handleAdd} className="flex-1" size="lg">
          <span className="font-bold">Agregar</span>
          {hasPromo ? (
            <span className="ml-1 opacity-90">
              · <span className="line-through opacity-60">{formatCurrency(quantity * originalUnitPrice)}</span>{' '}
              <span className="text-green-200">{formatCurrency(lineTotal)}</span>
            </span>
          ) : (
            <span className="ml-1 opacity-90">· {formatCurrency(lineTotal)}</span>
          )}
        </Button>
      </div>
    </Modal>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}
