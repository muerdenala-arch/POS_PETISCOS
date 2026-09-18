import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, LogOut, Package, ShieldCheck, Boxes, Users, QrCode, Store, Building2, Menu, X, Tag, Receipt } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { fieldClasses } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { APP_CONFIG } from '@/config/app';
import logoMark from '@/assets/brand/logo-mark.png';
import { logoGlowClasses } from '@/lib/brand';

const NAV_ITEMS = [
  { to: '/admin/reportes', label: 'Reportes de venta', icon: BarChart3 },
  { to: '/admin/gastos', label: 'Gastos Diarios', icon: Receipt },
  { to: '/admin/catalogo', label: 'Catálogo', icon: Package },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/promociones', label: 'Promociones y Cupones', icon: Tag },
  { to: '/admin/personal', label: 'Personal / Cajeros', icon: Users },
  { to: '/admin/configuracion-qr', label: 'Configuración QR', icon: QrCode },
  { to: '/admin/sucursales', label: 'Sucursales', icon: Building2 },
  { to: '/admin/auditoria', label: 'Auditoría de cajas', icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col bg-cream lg:flex-row">
      {/* Barra superior — solo < lg. El sidebar completo vive en el drawer. */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Abrir menú"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-cream-300 hover:text-ink cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-primary-200 shadow-sm dark:border-primary-900/50">
          <img src={logoMark} alt={APP_CONFIG.storeName} className="h-full w-full object-cover" />
        </div>
        <ThemeToggle />
      </header>

      {/* Sidebar fijo — solo >= lg. */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <AdminSidebarContent />
      </aside>

      {/* Drawer deslizante — solo < lg. */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              aria-hidden
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-label="Menú del panel admin"
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface shadow-card lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <AdminSidebarContent onNavigate={() => setMobileNavOpen(false)} closeButton />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function AdminSidebarContent({
  onNavigate,
  closeButton,
}: {
  onNavigate?: () => void;
  closeButton?: boolean;
}) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);
  const setAdminFilterBranchId = useBranchStore((s) => s.setAdminFilterBranchId);
  const navigate = useNavigate();

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-primary-200 shadow-sm dark:border-primary-900/50">
          <img src={logoMark} alt={APP_CONFIG.storeName} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold leading-tight text-ink">
            MERENGÓN
          </p>
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-accent-600">
            Panel Admin
          </p>
        </div>
        {closeButton ? (
          <button
            onClick={onNavigate}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-300 hover:text-ink cursor-pointer"
          >
            <X size={18} />
          </button>
        ) : (
          <ThemeToggle />
        )}
      </div>

      <div className="px-4 pb-3">
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            <Store size={12} /> Viendo sucursal
          </span>
          <select
            value={adminFilterBranchId ?? 'todas'}
            onChange={(e) => setAdminFilterBranchId(e.target.value === 'todas' ? null : e.target.value)}
            className={cn(fieldClasses, 'min-h-touch text-sm')}
          >
            <option value="todas">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink-muted transition-colors',
                isActive ? 'bg-primary-50 text-primary-700' : 'hover:bg-cream-300 hover:text-ink',
              )
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${currentUser?.color}`}>
            {currentUser?.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">{currentUser?.name}</p>
            <p className="text-xs text-ink-muted">Administrador</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
        >
          <LogOut size={16} /> Cerrar sesión
        </motion.button>
      </div>
    </>
  );
}
