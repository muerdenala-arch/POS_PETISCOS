import { create } from 'zustand';
import type { Expense } from '@/types';
import { api } from '@/lib/api';
import { submitExpense } from '@/lib/syncManager';
import { uid } from '@/lib/utils';
import { sameData } from '@/lib/sync';

interface ExpenseState {
  expenses: Expense[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
}

export const useExpenseStore = create<ExpenseState>()((set, get) => ({
  expenses: [],
  hydrated: false,

  fetchAll: async () => {
    try {
      const expenses = await api.expenses.list();
      set((state) => (state.hydrated && sameData(state.expenses, expenses) ? state : { expenses, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar los gastos con el servidor:', err);
    }
  },

  addExpense: async (data) => {
    const expense: Expense = {
      ...data,
      id: uid('exp'),
      createdAt: new Date().toISOString(),
    };

    // Actualización optimista local
    set((state) => ({ expenses: [expense, ...state.expenses] }));

    // Persistir y encolar para sincronización
    await submitExpense(expense);
    return expense;
  },
}));
