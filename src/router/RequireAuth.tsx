import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useStaffStore } from '@/store/staffStore';
import type { Role } from '@/types';

interface RequireAuthProps {
  children: ReactNode;
  roles?: Role[];
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const staffUser = useStaffStore((s) => (currentUser ? s.users.find((u) => u.id === currentUser.id) : undefined));
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si al cajero/admin lo bloquean o lo eliminan mientras tiene sesión abierta,
  // se cierra su sesión de inmediato en el siguiente render protegido.
  if (!staffUser || staffUser.status === 'bloqueado') {
    logout();
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(staffUser.role)) {
    return <Navigate to={staffUser.role === 'admin' ? '/admin/reportes' : '/pos'} replace />;
  }

  return <>{children}</>;
}
