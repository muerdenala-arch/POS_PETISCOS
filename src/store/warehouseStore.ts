import { create } from 'zustand';
import type { WarehouseDelivery, WarehouseItem, WarehouseMovement } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

export interface WarehouseItemFormData {
  name: string;
  unit: string;
  lowStockThreshold: number;
  branchIds: string[];
}

/** Insumo con stock bajo (o agotado) en al menos una de sus sucursales asignadas —
 *  una fila por cada combinación insumo+sucursal en alerta. */
export interface LowStockAlert {
  item: WarehouseItem;
  branchId: string;
  quantity: number;
}

interface WarehouseState {
  items: WarehouseItem[];
  movements: WarehouseMovement[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  fetchMovements: (itemId?: string) => Promise<void>;
  createItem: (data: WarehouseItemFormData) => Promise<WarehouseItem>;
  updateItem: (id: string, data: Partial<WarehouseItemFormData>) => Promise<void>;
  deleteItem: (id: string) => void;
  adjustStock: (itemId: string, branchId: string, type: 'entrada' | 'salida', quantity: number, note?: string) => Promise<void>;

  /** Entregas de bodega elegidas por el cajero para la orden actual — viajan junto
   *  con la venta al cobrar (ver POSPage.tsx), sin costo. */
  pendingDeliveries: WarehouseDelivery[];
  addPendingDelivery: (itemId: string, itemName: string, quantity: number) => void;
  removePendingDelivery: (itemId: string) => void;
  clearPendingDeliveries: () => void;
}

/** Pura, sin estado — se usa con `useMemo` en el componente (ver
 *  WarehouseAlertsButton.tsx), nunca directo como selector de Zustand: devuelve un
 *  array nuevo cada vez que se llama, y un selector que hace eso causa un loop de
 *  re-render infinito (Zustand compara por referencia). */
export function computeLowStockAlerts(items: WarehouseItem[]): LowStockAlert[] {
  const alerts: LowStockAlert[] = [];
  for (const item of items) {
    for (const branchId of item.branchIds) {
      const quantity = item.stockByBranch[branchId] ?? 0;
      if (quantity <= item.lowStockThreshold) {
        alerts.push({ item, branchId, quantity });
      }
    }
  }
  return alerts;
}

export const useWarehouseStore = create<WarehouseState>()((set, get) => ({
  items: [],
  movements: [],
  hydrated: false,
  pendingDeliveries: [],

  fetchAll: async () => {
    try {
      const items = await api.warehouse.items.list();
      set((state) => (state.hydrated && sameData(state.items, items) ? state : { items, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar la bodega:', err);
    }
  },

  fetchMovements: async (itemId) => {
    try {
      const movements = await api.warehouse.movements.list(itemId);
      set({ movements });
    } catch (err) {
      console.error('No se pudo sincronizar el historial de bodega:', err);
    }
  },

  createItem: async (data) => {
    const item: WarehouseItem = {
      ...data,
      id: uid('wh'),
      stockByBranch: {},
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ items: [...state.items, item] }));
    try {
      await api.warehouse.items.create(item);
    } catch (err) {
      set((state) => ({ items: state.items.filter((i) => i.id !== item.id) }));
      throw err;
    }
    return item;
  },

  updateItem: async (id, data) => {
    const previous = get().items.find((i) => i.id === id);
    set((state) => ({ items: state.items.map((i) => (i.id === id ? { ...i, ...data } : i)) }));
    try {
      await api.warehouse.items.update(id, data);
    } catch (err) {
      if (previous) set((state) => ({ items: state.items.map((i) => (i.id === id ? previous : i)) }));
      throw err;
    }
  },

  deleteItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    api.warehouse.items.remove(id).catch((err) => console.error('No se pudo eliminar el insumo:', err));
  },

  adjustStock: async (itemId, branchId, type, quantity, note) => {
    await api.warehouse.movements.create({ itemId, branchId, type, quantity, note });
    // Fuente de verdad tras el ajuste: recargar el insumo y el historial reciente.
    await get().fetchAll();
    await get().fetchMovements();
  },

  addPendingDelivery: (itemId, itemName, quantity) => {
    set((state) => {
      const existing = state.pendingDeliveries.find((d) => d.itemId === itemId);
      if (existing) {
        return {
          pendingDeliveries: state.pendingDeliveries.map((d) =>
            d.itemId === itemId ? { ...d, quantity: d.quantity + quantity } : d,
          ),
        };
      }
      return { pendingDeliveries: [...state.pendingDeliveries, { itemId, itemName, quantity }] };
    });
  },
  removePendingDelivery: (itemId) => {
    set((state) => ({ pendingDeliveries: state.pendingDeliveries.filter((d) => d.itemId !== itemId) }));
  },
  clearPendingDeliveries: () => set({ pendingDeliveries: [] }),
}));
