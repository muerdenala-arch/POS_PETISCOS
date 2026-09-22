import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, PackageX } from 'lucide-react';
import { computeLowStockAlerts, useWarehouseStore } from '@/store/warehouseStore';
import { useBranchStore } from '@/store/branchStore';

/** Campanita de alertas de stock bajo en bodega — ícono con contador en la esquina
 *  del panel de admin, con un panel desplegable al hacer clic (ver PromptRequest). */
export function WarehouseAlertsButton() {
  const [open, setOpen] = useState(false);
  const items = useWarehouseStore((s) => s.items);
  // `items` solo cambia de referencia cuando realmente hay datos nuevos (fetchAll usa
  // sameData para evitar sets de más), así que este useMemo no recalcula en cada render.
  const alerts = useMemo(() => computeLowStockAlerts(items), [items]);
  const branches = useBranchStore((s) => s.branches);
  const navigate = useNavigate();

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  function goToItem(itemId: string) {
    setOpen(false);
    navigate(`/admin/bodega?item=${encodeURIComponent(itemId)}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Alertas de stock bajo en bodega"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream-300 hover:text-ink cursor-pointer"
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl2 border border-border bg-surface shadow-card"
            >
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <p className="font-display text-sm font-bold text-ink">Alertas de stock bajo</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-ink-soft">
                    Todo el stock de bodega está por encima del mínimo. 🎉
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <button
                      key={`${alert.item.id}_${alert.branchId}`}
                      onClick={() => goToItem(alert.item.id)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-cream-200 cursor-pointer"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15">
                        <PackageX size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{alert.item.name}</p>
                        <p className="text-xs text-ink-muted">
                          {branchName(alert.branchId)} · quedan {alert.quantity} (mínimo {alert.item.lowStockThreshold})
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-bold text-primary-600">Ver</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
