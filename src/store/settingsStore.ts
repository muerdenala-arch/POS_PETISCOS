import { create } from 'zustand';
import type { AppSettings } from '@/types';
import { api } from '@/lib/api';

interface SettingsState extends AppSettings {
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  setRequireQrReceipt: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  requireQrReceipt: true,
  hydrated: false,

  fetchAll: async () => {
    try {
      const settings = await api.settings.get();
      set({ ...settings, hydrated: true });
    } catch (err) {
      console.error('No se pudo sincronizar la configuración:', err);
    }
  },

  setRequireQrReceipt: (value) => {
    const previous = get().requireQrReceipt;
    set({ requireQrReceipt: value });
    api.settings.update({ requireQrReceipt: value }).catch((err) => {
      console.error('No se pudo actualizar la configuración:', err);
      set({ requireQrReceipt: previous });
    });
  },
}));
