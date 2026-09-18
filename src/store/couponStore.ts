import { create } from 'zustand';
import type { Coupon, CartItem } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

export type CouponStatus = 'idle' | 'validating' | 'valid' | 'error';

interface CouponState {
  // --- Admin ---
  coupons: Coupon[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  createCoupon: (data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>) => Promise<Coupon | null>;
  updateCoupon: (id: string, data: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleActive: (id: string) => void;

  // --- POS: cupón aplicado en la orden actual ---
  appliedCoupon: Coupon | null;
  couponStatus: CouponStatus;
  couponError: string | null;
  validateAndApply: (code: string, branchId: string) => Promise<void>;
  removeCoupon: () => void;
  /** Calcula el monto de descuento en Bs sobre los ítems elegibles dados. */
  discountAmount: (items: CartItem[]) => number;
}

export const useCouponStore = create<CouponState>()((set, get) => ({
  coupons: [],
  hydrated: false,
  appliedCoupon: null,
  couponStatus: 'idle',
  couponError: null,

  fetchAll: async () => {
    try {
      const coupons = await api.coupons.list();
      set((state) => (state.hydrated && sameData(state.coupons, coupons) ? state : { coupons, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar los cupones:', err);
    }
  },

  createCoupon: async (data) => {
    try {
      const coupon: Coupon = {
        ...data,
        id: uid('coup'),
        usedCount: 0,
        createdAt: new Date().toISOString(),
      };
      const created = await api.coupons.create(coupon);
      set((state) => ({ coupons: [created, ...state.coupons] }));
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el cupón.';
      console.error(msg);
      throw new Error(msg);
    }
  },

  updateCoupon: (id, data) => {
    set((state) => ({ coupons: state.coupons.map((c) => (c.id === id ? { ...c, ...data } : c)) }));
    api.coupons.update(id, data).catch((err) => console.error('No se pudo actualizar el cupón:', err));
  },

  deleteCoupon: (id) => {
    set((state) => ({ coupons: state.coupons.filter((c) => c.id !== id) }));
    api.coupons.remove(id).catch((err) => console.error('No se pudo eliminar el cupón:', err));
  },

  toggleActive: (id) => {
    const coupon = get().coupons.find((c) => c.id === id);
    if (!coupon) return;
    const isActive = !coupon.isActive;
    set((state) => ({ coupons: state.coupons.map((c) => (c.id === id ? { ...c, isActive } : c)) }));
    api.coupons.update(id, { isActive }).catch((err) => console.error('No se pudo actualizar el cupón:', err));
  },

  validateAndApply: async (code, branchId) => {
    if (!code.trim()) return;
    set({ couponStatus: 'validating', couponError: null });
    try {
      const coupon = await api.coupons.validate(code.trim(), branchId);
      set({ appliedCoupon: coupon, couponStatus: 'valid', couponError: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cupón inválido.';
      set({ appliedCoupon: null, couponStatus: 'error', couponError: msg });
    }
  },

  removeCoupon: () => set({ appliedCoupon: null, couponStatus: 'idle', couponError: null }),

  discountAmount: (items) => {
    const coupon = get().appliedCoupon;
    if (!coupon) return 0;
    
    const eligibleItems = items.filter(item => {
      if (coupon.appliesTo === 'ALL') return true;
      if (coupon.appliesTo.startsWith('PRODUCT:')) {
        return coupon.appliesTo === `PRODUCT:${item.product.id}`;
      }
      if (coupon.appliesTo.startsWith('SIZE:')) {
        return coupon.appliesTo === `SIZE:${item.product.id}:${item.modifiers.size?.id}`;
      }
      return coupon.appliesTo === item.product.category;
    });

    if (eligibleItems.length === 0) return 0;

    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0);

    if (coupon.discountType === 'FREE_ITEM') {
      // En cortesía, se regala el ítem elegible más caro (1 unidad)
      const maxPriceItem = eligibleItems.reduce((max, item) => 
        item.unitPrice > max.unitPrice ? item : max
      , eligibleItems[0]);
      return maxPriceItem.unitPrice;
    }
    
    if (coupon.discountType === 'PERCENTAGE') {
      return (eligibleSubtotal * coupon.discountValue) / 100;
    }
    
    // FIXED_AMOUNT (se descuenta del subtotal elegible, hasta agotarlo)
    return Math.min(eligibleSubtotal, coupon.discountValue);
  },
}));
