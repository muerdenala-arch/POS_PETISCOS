import { create } from 'zustand';
import { BRANCHES } from '@/data/seed';
import type { Branch } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

export interface BranchFormData {
  name: string;
  address: string;
  phone: string;
}

interface BranchState {
  branches: Branch[];
  /** true después del primer fetch exitoso contra Neon — antes de eso se muestra la
   *  semilla local para no dejar pantallas vacías durante el primer segundo de carga. */
  hydrated: boolean;
  /** Filtro global del panel admin: null = "Todas las sucursales". */
  adminFilterBranchId: string | null;
  setAdminFilterBranchId: (id: string | null) => void;
  fetchAll: () => Promise<void>;
  addBranch: (data: BranchFormData) => Branch;
  updateBranch: (id: string, data: Partial<BranchFormData>) => void;
  deleteBranch: (id: string) => Promise<void>;
  toggleActive: (id: string) => void;
  activeBranches: () => Branch[];
}

export const useBranchStore = create<BranchState>()((set, get) => ({
  branches: BRANCHES,
  hydrated: false,
  adminFilterBranchId: null,
  setAdminFilterBranchId: (id) => set({ adminFilterBranchId: id }),

  fetchAll: async () => {
    try {
      const branches = await api.branches.list();
      set((state) => (state.hydrated && sameData(state.branches, branches) ? state : { branches, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar sucursales con el servidor:', err);
    }
  },

  addBranch: (data) => {
    const branch: Branch = { ...data, id: uid('branch'), active: true };
    set((state) => ({ branches: [...state.branches, branch] }));
    api.branches.create(branch).catch((err) => console.error('No se pudo guardar la sucursal:', err));
    return branch;
  },
  updateBranch: (id, data) => {
    set((state) => ({ branches: state.branches.map((b) => (b.id === id ? { ...b, ...data } : b)) }));
    api.branches.update(id, data).catch((err) => console.error('No se pudo actualizar la sucursal:', err));
  },
  deleteBranch: async (id) => {
    try {
      await api.branches.remove(id);
      set((state) => ({ branches: state.branches.filter((b) => b.id !== id) }));
    } catch (err) {
      console.error('No se pudo eliminar la sucursal:', err);
      throw err;
    }
  },
  toggleActive: (id) => {
    const branch = get().branches.find((b) => b.id === id);
    if (!branch) return;
    const active = !branch.active;
    set((state) => ({ branches: state.branches.map((b) => (b.id === id ? { ...b, active } : b)) }));
    api.branches.update(id, { active }).catch((err) => console.error('No se pudo actualizar la sucursal:', err));
  },
  activeBranches: () => get().branches.filter((b) => b.active),
}));
