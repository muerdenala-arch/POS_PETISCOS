import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingCart, Tag, Trash2, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useCouponStore } from '@/store/couponStore';
import { Button } from '@/components/ui/Button';
import { useCatalogStore } from '@/store/catalogStore';
import { cn, formatCurrency } from '@/lib/utils';

interface CartPanelProps {
  onCheckout: () => void;
  branchId: string;
  /** 'sidebar' (escritorio, con borde izquierdo) o 'drawer' (bottom sheet en móvil). */
  variant?: 'sidebar' | 'drawer';
}

export function CartPanel({ onCheckout, branchId, variant = 'sidebar' }: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.subtotal)();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  const appliedCoupon = useCouponStore((s) => s.appliedCoupon);
  const couponStatus = useCouponStore((s) => s.couponStatus);
  const couponError = useCouponStore((s) => s.couponError);
  const validateAndApply = useCouponStore((s) => s.validateAndApply);
  const removeCoupon = useCouponStore((s) => s.removeCoupon);
  const discountAmount = useCouponStore((s) => s.discountAmount);

  const [couponInputOpen, setCouponInputOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const couponDiscount = discountAmount(items);
  const total = Math.max(0, subtotal - couponDiscount);

  const hasPromoItems = items.some((i) => i.appliedPromotionId);
  const subtotalBeforeDiscount = items.reduce((s, i) => s + i.originalUnitPrice * i.quantity, 0);
  const promoSavings = subtotalBeforeDiscount - subtotal;

  async function handleApplyCoupon() {
    await validateAndApply(couponCode, branchId);
    
    // Si el cupón se aplicó con éxito pero el descuento es 0, significa que no hay productos elegibles
    const currentStatus = useCouponStore.getState().couponStatus;
    if (currentStatus === 'valid' && discountAmount(useCartStore.getState().items) === 0) {
      useCouponStore.setState({ 
        appliedCoupon: null, 
        couponStatus: 'error', 
        couponError: 'El cupón no aplica para los productos en tu orden.' 
      });
    }

    setCouponCode('');
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden bg-surface', variant === 'sidebar' && 'border-l border-border')}>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <ShoppingCart size={20} className="text-primary-500" />
          Orden actual
        </h2>
        {items.length > 0 && (
          <button
            onClick={() => { clear(); removeCoupon(); }}
            className="text-xs font-semibold text-ink-soft hover:text-red-600 cursor-pointer"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* min-h-0 es lo que permite que esta lista se encoja y haga scroll propio en vez de
          empujar el footer (Total + Cobrar) fuera del área visible — un flex item con flex-1
          conserva `min-height:auto` por defecto y crece con el contenido si no se anula. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pr-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.lineId}
              layout
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mb-3 overflow-hidden rounded-xl2 bg-cream-100 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-ink">{item.product.name}</p>
                  <p className="text-xs text-ink-muted">
                    {item.modifiers.size?.label}
                  </p>
                  {item.modifiers.toppings.length > 0 && (
                    <p className="text-xs text-secondary-700">
                      + {item.modifiers.toppings.map((t) => t.name).join(', ')}
                    </p>
                  )}
                  {item.notes && <p className="text-xs italic text-ink-soft">"{item.notes}"</p>}
                  {item.appliedPromotionId && (
                    <p className="text-[10px] font-bold text-green-600">🏷️ Precio con promo</p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.lineId)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  aria-label="Quitar"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer"
                  >
                    <Minus size={13} />
                  </motion.button>
                  <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      const stock = useCatalogStore.getState().stockFor(item.product, branchId);
                      if (item.quantity < stock) {
                        updateQuantity(item.lineId, item.quantity + 1);
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-soft cursor-pointer"
                  >
                    <Plus size={13} />
                  </motion.button>
                </div>
                <div className="text-right">
                  {item.appliedPromotionId && item.originalUnitPrice !== item.unitPrice && (
                    <span className="block text-[10px] text-ink-soft line-through">
                      {formatCurrency(item.originalUnitPrice * item.quantity)}
                    </span>
                  )}
                  <span className={cn('font-display text-sm font-bold', item.appliedPromotionId ? 'text-green-600' : 'text-primary-600')}>
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center text-ink-soft">
            <ShoppingCart size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Toca un producto para agregarlo</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-surface p-4">
        {/* Sección de cupón */}
        <AnimatePresence>
          {appliedCoupon ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-3 flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2"
            >
              <div>
                <p className="text-xs font-bold text-green-700">🏷️ Cupón: {appliedCoupon.code}</p>
                <p className="text-xs text-green-600">−{formatCurrency(couponDiscount)}</p>
              </div>
              <button
                onClick={removeCoupon}
                className="flex h-7 w-7 items-center justify-center rounded-full text-green-500 hover:bg-green-100 cursor-pointer"
                aria-label="Quitar cupón"
              >
                <X size={14} />
              </button>
            </motion.div>
          ) : items.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3"
            >
              <AnimatePresence>
                {couponInputOpen ? (
                  <motion.div
                    key="coupon-input"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        placeholder="CÓDIGO O PIN"
                        className="flex-1 rounded-xl border border-border bg-field px-3 py-2 text-sm font-bold uppercase tracking-wider text-ink placeholder-ink-soft focus:border-primary-400 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponStatus === 'validating' || !couponCode.trim()}
                        className="rounded-xl bg-primary-500 px-3 py-2 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-50 cursor-pointer"
                      >
                        {couponStatus === 'validating' ? '...' : 'Aplicar'}
                      </button>
                      <button
                        onClick={() => { setCouponInputOpen(false); setCouponCode(''); }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft hover:bg-cream-300 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {couponError && (
                      <p className="mt-1 text-xs font-semibold text-red-600">{couponError}</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="coupon-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setCouponInputOpen(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-ink-muted hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-colors"
                  >
                    <Tag size={13} />
                    + Cupón / Vale
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resumen de totales */}
        <div className="space-y-1 mb-3">
          {hasPromoItems && promoSavings > 0 && (
            <div className="flex items-center justify-between text-xs text-green-600">
              <span className="font-semibold">🏷️ Ahorro promo</span>
              <span className="font-bold tabular-nums">−{formatCurrency(promoSavings)}</span>
            </div>
          )}
          {appliedCoupon && couponDiscount > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-ink-muted">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-600">
                <span className="font-semibold">Cupón ({appliedCoupon.code})</span>
                <span className="font-bold tabular-nums">−{formatCurrency(couponDiscount)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-muted">Total ({count} ítems)</span>
            <span className="font-display text-2xl font-extrabold text-ink tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <Button size="lg" className="w-full" disabled={items.length === 0} onClick={onCheckout}>
          Cobrar
        </Button>
      </div>
    </div>
  );
}
