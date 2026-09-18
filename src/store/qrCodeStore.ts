import { create } from 'zustand';
import type { QrCode } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

export interface QrCodeFormData {
  alias: string;
  bankOrHolder: string;
  image: string;
  branchId: string;
}

interface QrCodeState {
  qrCodes: QrCode[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  addQrCode: (data: QrCodeFormData) => QrCode;
  updateQrCode: (id: string, data: Partial<QrCodeFormData>) => void;
  removeQrCode: (id: string) => void;
  setActive: (id: string) => void;
  qrCodesForBranch: (branchId: string) => QrCode[];
  activeQrCodeForBranch: (branchId: string) => QrCode | null;
}

export const useQrCodeStore = create<QrCodeState>()((set, get) => ({
  qrCodes: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const qrCodes = await api.qrCodes.list();
      set((state) => (state.hydrated && sameData(state.qrCodes, qrCodes) ? state : { qrCodes, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar los QR con el servidor:', err);
    }
  },

  addQrCode: (data) => {
    // El primer QR que se sube a una sucursal queda activo automáticamente ahí — el
    // backend decide lo mismo de forma atómica, esto solo adelanta la UI.
    const hasActiveInBranch = get().qrCodes.some((q) => q.branchId === data.branchId && q.active);
    const qr: QrCode = { ...data, id: uid('qr'), active: !hasActiveInBranch, createdAt: new Date().toISOString() };
    set((state) => ({ qrCodes: [...state.qrCodes, qr] }));
    api.qrCodes.create(qr).catch((err) => console.error('No se pudo guardar el QR:', err));
    return qr;
  },
  updateQrCode: (id, data) => {
    set((state) => ({ qrCodes: state.qrCodes.map((q) => (q.id === id ? { ...q, ...data } : q)) }));
    api.qrCodes.update(id, data).catch((err) => console.error('No se pudo actualizar el QR:', err));
  },
  removeQrCode: (id) => {
    set((state) => ({ qrCodes: state.qrCodes.filter((q) => q.id !== id) }));
    api.qrCodes.remove(id).catch((err) => console.error('No se pudo eliminar el QR:', err));
  },
  setActive: (id) => {
    set((state) => {
      const target = state.qrCodes.find((q) => q.id === id);
      if (!target) return state;
      return {
        qrCodes: state.qrCodes.map((q) => (q.branchId === target.branchId ? { ...q, active: q.id === id } : q)),
      };
    });
    api.qrCodes.setActive(id).catch((err) => console.error('No se pudo activar el QR:', err));
  },
  qrCodesForBranch: (branchId) => get().qrCodes.filter((q) => q.branchId === branchId),
  activeQrCodeForBranch: (branchId) => get().qrCodes.find((q) => q.branchId === branchId && q.active) ?? null,
}));
