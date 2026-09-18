import { create } from 'zustand';
import type { Promotion } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

interface PromotionState {
  promotions: Promotion[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  createPromotion: (data: Omit<Promotion, 'id' | 'createdAt'>) => Promise<Promotion | null>;
  updatePromotion: (id: string, data: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  toggleActive: (id: string) => void;
  /** Retorna la promoción activa para un producto y sucursal dadas, o null. */
  activePromotionFor: (product: { id: string; category: string; sizeId?: string }, branchId: string) => Promotion | null;
}

export const usePromotionStore = create<PromotionState>()((set, get) => ({
  promotions: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const promotions = await api.promotions.list();
      set((state) => (state.hydrated && sameData(state.promotions, promotions) ? state : { promotions, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar las promociones:', err);
    }
  },

  createPromotion: async (data) => {
    try {
      const promotion: Promotion = {
        ...data,
        id: uid('promo'),
        createdAt: new Date().toISOString(),
      };
      const created = await api.promotions.create(promotion);
      set((state) => ({ promotions: [created, ...state.promotions] }));
      return created;
    } catch (err) {
      console.error('No se pudo crear la promoción:', err);
      return null;
    }
  },

  updatePromotion: (id, data) => {
    set((state) => ({
      promotions: state.promotions.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
    api.promotions.update(id, data).catch((err) => console.error('No se pudo actualizar la promoción:', err));
  },

  deletePromotion: (id) => {
    set((state) => ({ promotions: state.promotions.filter((p) => p.id !== id) }));
    api.promotions.remove(id).catch((err) => console.error('No se pudo eliminar la promoción:', err));
  },

  toggleActive: (id) => {
    const promotion = get().promotions.find((p) => p.id === id);
    if (!promotion) return;
    const isActive = !promotion.isActive;
    set((state) => ({
      promotions: state.promotions.map((p) => (p.id === id ? { ...p, isActive } : p)),
    }));
    api.promotions.update(id, { isActive }).catch((err) => console.error('No se pudo actualizar la promoción:', err));
  },

  activePromotionFor: (product, branchId) => {
    const promos = get().promotions;
    return (
      promos.find(
        (p) =>
          p.isActive &&
          p.branchIds.includes(branchId) &&
          (p.appliesTo === 'ALL' || 
           p.appliesTo === product.category || 
           p.appliesTo === `PRODUCT:${product.id}` ||
           (!!product.sizeId && p.appliesTo === `SIZE:${product.id}:${product.sizeId}`))
      ) ?? null
    );
  },
}));
