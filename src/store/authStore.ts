import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStaffStore } from '@/store/staffStore';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  /** Sucursal en la que el usuario logueado está operando esta sesión/turno. */
  currentBranchId: string | null;
  error: string | null;
  loginWithPin: (pin: string) => boolean;
  setCurrentBranch: (branchId: string) => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      currentBranchId: null,
      error: null,
      loginWithPin: (pin: string) => {
        // Solo el personal con estado "activo" puede iniciar sesión; los usuarios
        // bloqueados quedan fuera aunque el PIN sea correcto.
        const found = useStaffStore.getState().users.find((u) => u.pin === pin && u.status === 'activo');
        if (found) {
          // Con una sola sucursal asignada, entra directo; si tiene varias, queda sin
          // definir hasta que LoginPage muestre el selector y llame a setCurrentBranch.
          const autoBranch = found.branchIds.length === 1 ? found.branchIds[0] : null;
          set({ currentUser: found, currentBranchId: autoBranch, error: null });
          return true;
        }
        set({ error: 'PIN incorrecto. Intenta nuevamente.' });
        return false;
      },
      setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),
      logout: () => set({ currentUser: null, currentBranchId: null }),
      clearError: () => set({ error: null }),
    }),
    { name: 'pos-template/auth' },
  ),
);
