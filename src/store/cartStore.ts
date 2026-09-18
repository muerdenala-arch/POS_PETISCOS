import { create } from 'zustand';
import type { CartItem, CartModifiers, Product, Promotion } from '@/types';
import { uid } from '@/lib/utils';

/** Aplica el descuento de una promo a un precio base. */
export function applyPromoDiscount(price: number, promo: Promotion | null): number {
  if (!promo) return price;
  if (promo.discountType === 'PERCENTAGE') {
    return Math.max(0, price - (price * promo.discountValue) / 100);
  }
  // FIXED_AMOUNT
  return Math.max(0, price - promo.discountValue);
}

function computeUnitPrice(product: Product, modifiers: CartModifiers, promo: Promotion | null): number {
  const toppingsTotal = modifiers.toppings.reduce((sum, t) => sum + t.priceExtra, 0);
  const sizePrice =
    product.sizes && product.sizes.length > 0
      ? (modifiers.size?.price ?? product.basePrice)
      : product.basePrice;
  const originalPrice = sizePrice + toppingsTotal;
  return applyPromoDiscount(originalPrice, promo);
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, modifiers: CartModifiers, quantity?: number, notes?: string, promo?: Promotion | null) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
  subtotal: () => number;
  /** Subtotal sin ningún descuento de promo (precio original). */
  subtotalBeforeDiscount: () => number;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product, modifiers, quantity = 1, notes, promo = null) => {
    const toppingsTotal = modifiers.toppings.reduce((sum, t) => sum + t.priceExtra, 0);
    const sizePrice =
      product.sizes && product.sizes.length > 0
        ? (modifiers.size?.price ?? product.basePrice)
        : product.basePrice;
    const originalUnitPrice = sizePrice + toppingsTotal;
    const unitPrice = applyPromoDiscount(originalUnitPrice, promo);

    const item: CartItem = {
      lineId: uid('line'),
      product,
      modifiers,
      quantity,
      unitPrice,
      originalUnitPrice,
      lineTotal: unitPrice * quantity,
      notes,
      appliedPromotionId: promo?.id,
    };
    set((state) => ({ items: [...state.items, item] }));
  },

  updateQuantity: (lineId, quantity) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
            : item,
        )
        .filter((item) => item.quantity > 0),
    })),

  removeItem: (lineId) =>
    set((state) => ({ items: state.items.filter((item) => item.lineId !== lineId) })),

  clear: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, item) => sum + item.lineTotal, 0),

  subtotalBeforeDiscount: () =>
    get().items.reduce((sum, item) => sum + item.originalUnitPrice * item.quantity, 0),

  total: () => get().items.reduce((sum, item) => sum + item.lineTotal, 0),

  count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
