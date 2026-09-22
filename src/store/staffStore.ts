import { create } from 'zustand';
import { USERS } from '@/data/seed';
import type { Role, StaffStatus, User } from '@/types';
import { api } from '@/lib/api';
import { sameData } from '@/lib/sync';
import { uid } from '@/lib/utils';

export interface StaffFormData {
  name: string;
  role: Role;
  pin: string;
  color: string;
  branchIds: string[];
}

interface StaffState {
  users: User[];
  hydrated: boolean;
  fetchAll: () => Promise<void>;
  addUser: (data: StaffFormData) => Promise<User>;
  updateUser: (id: string, data: Partial<StaffFormData>) => Promise<void>;
  toggleBlocked: (id: string) => void;
  resetPin: (id: string, pin: string) => void;
  removeUser: (id: string) => void;
}

export const useStaffStore = create<StaffState>()((set, get) => ({
  users: USERS,
  hydrated: false,

  fetchAll: async () => {
    try {
      const users = await api.staff.list();
      set((state) => (state.hydrated && sameData(state.users, users) ? state : { users, hydrated: true }));
    } catch (err) {
      console.error('No se pudo sincronizar el personal con el servidor:', err);
    }
  },

  addUser: async (data) => {
    const user: User = { ...data, id: uid('user'), status: 'activo', createdAt: new Date().toISOString() };
    set((state) => ({ users: [...state.users, user] }));
    try {
      await api.staff.create(user);
    } catch (err) {
      // El PIN podría estar duplicado (409) u otro error de validación — no dejar
      // el usuario "fantasma" en la UI si el servidor lo rechazó.
      set((state) => ({ users: state.users.filter((u) => u.id !== user.id) }));
      throw err;
    }
    return user;
  },
  updateUser: async (id, data) => {
    const previous = get().users.find((u) => u.id === id);
    set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, ...data } : u)) }));
    try {
      await api.staff.update(id, data);
    } catch (err) {
      if (previous) set((state) => ({ users: state.users.map((u) => (u.id === id ? previous : u)) }));
      throw err;
    }
  },
  toggleBlocked: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user || user.protected) return;
    const status: StaffStatus = user.status === 'activo' ? 'bloqueado' : 'activo';
    set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, status } : u)) }));
    api.staff.update(id, { status }).catch((err) => console.error('No se pudo actualizar el estado:', err));
  },
  resetPin: (id, pin) => {
    api.staff.update(id, { pin }).catch((err) => console.error('No se pudo restablecer el PIN:', err));
  },
  removeUser: (id) => {
    // Nunca elimina al administrador principal, aunque coincida el id (el backend
    // también lo rechaza — esto es solo para que la UI reaccione al instante).
    set((state) => ({ users: state.users.filter((u) => !(u.id === id && !u.protected)) }));
    api.staff.remove(id).catch((err) => console.error('No se pudo eliminar el usuario:', err));
  },
}));
