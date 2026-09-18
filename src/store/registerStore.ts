import { create } from 'zustand';
import type { CashRegisterSession, User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

interface RegisterState {
  sessions: CashRegisterSession[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  openRegister: (user: User, branchId: string, openingAmount: number, notes?: string) => CashRegisterSession;
  closeRegister: (
    sessionId: string,
    data: {
      closingAmountCounted: number;
      expectedAmount: number;
      salesTotal: number;
      salesCount: number;
      cashSalesTotal: number;
      qrSalesTotal: number;
      notes?: string;
    },
  ) => void;
  /** La caja abierta del usuario logueado — se deriva de la lista sincronizada en vez de
   *  un id local, así que reconoce una caja abierta desde OTRO dispositivo por el mismo
   *  cajero (ej. abrió en la PC y sigue vendiendo desde el celular). */
  activeSession: () => CashRegisterSession | null;
}

export const useRegisterStore = create<RegisterState>()((set, get) => ({
  sessions: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const sessions = await api.registerSessions.list();
      set((state) => (state.hydrated && sameData(state.sessions, sessions) ? state : { sessions, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar las cajas con el servidor:', err);
    }
  },

  openRegister: (user, branchId, openingAmount, notes) => {
    const session: CashRegisterSession = {
      id: uid('reg'),
      cashierId: user.id,
      cashierName: user.name,
      branchId,
      openedAt: new Date().toISOString(),
      openingAmount,
      status: 'abierta',
      notes,
    };
    set((state) => ({ sessions: [session, ...state.sessions] }));
    api.registerSessions
      .open({ id: session.id, cashierId: user.id, cashierName: user.name, branchId, openingAmount, notes })
      .catch((err) => console.error('No se pudo abrir la caja:', err));
    return session;
  },

  closeRegister: (sessionId, data) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'cerrada',
              closedAt: new Date().toISOString(),
              closingAmountCounted: data.closingAmountCounted,
              expectedAmount: data.expectedAmount,
              difference: data.closingAmountCounted - data.expectedAmount,
              salesTotal: data.salesTotal,
              salesCount: data.salesCount,
              cashSalesTotal: data.cashSalesTotal,
              qrSalesTotal: data.qrSalesTotal,
              notes: data.notes ?? s.notes,
            }
          : s,
      ),
    }));
    api.registerSessions.close(sessionId, data).catch((err) => console.error('No se pudo cerrar la caja:', err));
  },

  activeSession: () => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return null;
    return get().sessions.find((s) => s.cashierId === user.id && s.status === 'abierta') ?? null;
  },
}));
