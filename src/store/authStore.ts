import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  /** Sucursal en la que el usuario logueado está operando esta sesión/turno. */
  currentBranchId: string | null;
  error: string | null;
  isLoggingIn: boolean;
  loginWithPin: (pin: string) => Promise<boolean>;
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
      isLoggingIn: false,

      loginWithPin: async (pin: string) => {
        set({ isLoggingIn: true, error: null });
        try {
          // El PIN se verifica en el servidor (ver /api/staff?action=login); acá no
          // hay ninguna lista de PINs contra la que comparar.
          const user = await api.auth.login(pin);
          const autoBranch = user.branchIds.length === 1 ? user.branchIds[0] : null;
          set({ currentUser: user, currentBranchId: autoBranch, error: null, isLoggingIn: false });
          return true;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'PIN incorrecto. Intenta nuevamente.',
            isLoggingIn: false,
          });
          return false;
        }
      },
      setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),
      logout: () => {
        set({ currentUser: null, currentBranchId: null });
        // Best-effort: borra la cookie de sesión en el servidor. Si falla (sin red),
        // el estado local ya quedó cerrado igual.
        api.auth.logout().catch(() => {});
      },
      clearError: () => set({ error: null }),
    }),
    { name: 'pos-template/auth' },
  ),
);
