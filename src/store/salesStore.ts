import { create } from 'zustand';
import type { Sale } from '@/types';
import { sameData } from '@/lib/sync';
import { api } from '@/lib/api';
import { uid } from '@/lib/utils';
import { submitSale, setSaleConfirmCallback } from '@/lib/syncManager';

interface SalesState {
  sales: Sale[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  /**
   * Añade la venta INMEDIATAMENTE al store local (optimistic) y la encola en
   * IndexedDB. El SyncManager la enviará a Neon en segundo plano.
   * Retorna la venta optimista al instante — no espera a la red.
   */
  addSale: (sale: Omit<Sale, 'id' | 'ticketNumber'>) => Sale;
  /**
   * El SyncManager llama a esto cuando Neon confirma la inserción.
   * Reemplaza el ticket temporal (ticketNumber: 0) por el número real de Neon.
   */
  confirmSale: (localId: string, confirmedSale: Sale) => void;
  salesForSession: (sessionId: string) => Sale[];
}

export const useSalesStore = create<SalesState>()((set, get) => ({
  sales: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const sales = await api.sales.list();
      set((state) => (state.hydrated && sameData(state.sales, sales) ? state : { sales, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar las ventas con el servidor:', err);
    }
  },

  addSale: (data) => {
    const localId = uid('sale');
    // ticketNumber: 0 = pendiente de confirmación de Neon
    const optimisticSale: Sale = { ...data, id: localId, ticketNumber: 0 };

    // 1. Agregar al store local INSTANTÁNEAMENTE (la UI ya puede mostrarlo)
    set((state) => ({ sales: [optimisticSale, ...state.sales] }));

    // 2. Guardar en IndexedDB + disparar sync en background (fire & forget)
    submitSale(optimisticSale).catch(console.error);

    return optimisticSale;
  },

  confirmSale: (localId, confirmedSale) => {
    set((state) => ({
      sales: state.sales.map((s) => (s.id === localId ? { ...confirmedSale } : s)),
    }));
  },

  salesForSession: (sessionId) => get().sales.filter((s) => s.registerSessionId === sessionId),
}));

// Registrar el callback de confirmación con el SyncManager.
// Se hace DESPUÉS de crear el store para evitar dependencia circular en el módulo.
setSaleConfirmCallback((localId, confirmedSale) => {
  useSalesStore.getState().confirmSale(localId, confirmedSale);
});
