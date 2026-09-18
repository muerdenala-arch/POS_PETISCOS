import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, ShoppingCart } from 'lucide-react';
import { CashierShell } from '@/components/layout/CashierShell';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { MobileCartDrawer } from '@/components/pos/MobileCartDrawer';
import { ModifierModal } from '@/components/pos/ModifierModal';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';
import { useCouponStore } from '@/store/couponStore';
import { formatCurrency } from '@/lib/utils';
import type { Payment, Product, Sale } from '@/types';

export default function POSPage() {
  const currentUser = useAuthStore((s) => s.currentUser)!;
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const activeSession = useRegisterStore((s) => s.activeSession());
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.subtotal)();
  const subtotalBeforeDiscount = useCartStore((s) => s.subtotalBeforeDiscount)();
  const adjustStock = useCatalogStore((s) => s.adjustStock);
  const adjustToppingStock = useCatalogStore((s) => s.adjustToppingStock);
  const addSale = useSalesStore((s) => s.addSale);

  const appliedCoupon = useCouponStore((s) => s.appliedCoupon);
  const discountAmountFn = useCouponStore((s) => s.discountAmount);
  const removeCoupon = useCouponStore((s) => s.removeCoupon);

  const addCartItem = useCartStore((s) => s.addItem);

  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleProductSelect = (product: Product) => {
    if (product.sizes.length === 0 && product.toppingIds.length === 0) {
      addCartItem(product, { toppings: [] }, 1);
      setToastMessage(`¡${product.name} agregado!`);
      setTimeout(() => setToastMessage(null), 1500);
    } else {
      setModifierProduct(product);
    }
  };

  if (!activeSession) {
    return <Navigate to="/caja/apertura" replace />;
  }
  if (!currentBranchId) {
    return <Navigate to="/login" replace />;
  }

  const couponDiscount = discountAmountFn(items);
  const total = Math.max(0, subtotal - couponDiscount);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  // Determinar el tipo de descuento para el registro en la venta
  function getDiscountType(): string {
    const hasPromo = items.some((i) => i.appliedPromotionId);
    const hasCoupon = !!appliedCoupon;
    if (hasPromo && hasCoupon) return 'BOTH';
    if (hasPromo) return 'PROMO';
    if (hasCoupon) return 'COUPON';
    return 'NONE';
  }

  async function handleConfirmPayment(payment: Payment) {
    const saleData: Omit<Sale, 'id' | 'ticketNumber'> = {
      items,
      subtotal,
      subtotalBeforeDiscount,
      discountAmount: couponDiscount,
      discountType: getDiscountType(),
      couponCode: appliedCoupon?.code,
      total,
      payment: { ...payment, amount: total },
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      registerSessionId: activeSession!.id,
      branchId: currentBranchId!,
      createdAt: new Date().toISOString(),
    };

    // Optimistic: registra la venta INMEDIATAMENTE en el store local e IndexedDB.
    // La sincronización con Neon ocurre en segundo plano (syncManager).
    addSale(saleData);

    // Descontar stock localmente al instante
    items.forEach((item) => {
      adjustStock(item.product.id, currentBranchId!, -item.quantity);
      item.modifiers.toppings.forEach((t) => adjustToppingStock(t.id, currentBranchId!, -item.quantity));
    });

    clearCart();
    removeCoupon();
    setCartDrawerOpen(false);
    setCheckoutOpen(false);

    setToastMessage('¡Venta registrada!');
    setTimeout(() => setToastMessage(null), 1500);
  }

  return (
    <CashierShell>
      {/* Toast de Éxito */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-full shadow-pop font-bold flex items-center gap-2"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* < lg: catálogo a pantalla completa, el carrito vive en el drawer inferior.
          >= lg: layout de dos columnas de siempre, carrito fijo a la derecha. */}
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <ProductGrid branchId={currentBranchId} onSelect={handleProductSelect} />
        <div className="hidden h-full min-h-0 md:block md:overflow-hidden">
          <CartPanel branchId={currentBranchId} onCheckout={() => setCheckoutOpen(true)} />
        </div>
      </div>

      {/* Barra inferior fija con el resumen de la orden — abre el drawer, no cobra directo,
          así el cajero puede revisar/editar ítems antes de pasar a Cobrar. */}
      {items.length > 0 && !cartDrawerOpen && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCartDrawerOpen(true)}
          className="fixed inset-x-3 bottom-3 z-30 flex min-h-touch-lg items-center justify-between rounded-2xl bg-primary-500 px-5 text-white shadow-pop md:hidden cursor-pointer"
        >
          <span className="flex items-center gap-2 font-display font-bold">
            <ShoppingCart size={19} />
            {count} ítem{count > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 font-display font-bold">
            {formatCurrency(total)}
            <span className="mx-1 h-4 w-px bg-white/40" />
            Ver orden
            <ChevronUp size={18} />
          </span>
        </motion.button>
      )}

      <MobileCartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onCheckout={() => {
          setCartDrawerOpen(false);
          setCheckoutOpen(true);
        }}
        branchId={currentBranchId}
      />

      <ModifierModal 
        branchId={currentBranchId} 
        product={modifierProduct} 
        onClose={() => setModifierProduct(null)} 
        onAdded={(name) => {
          setToastMessage(`¡${name} agregado!`);
          setTimeout(() => setToastMessage(null), 1500);
        }}
      />
      <CheckoutModal
        open={checkoutOpen}
        total={total}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleConfirmPayment}
      />
    </CashierShell>
  );
}
