import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Pencil, Plus, Trash2, Warehouse } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WarehouseItemFormModal } from '@/components/admin/WarehouseItemFormModal';
import { WarehouseAdjustStockModal } from '@/components/admin/WarehouseAdjustStockModal';
import { useWarehouseStore } from '@/store/warehouseStore';
import { useBranchStore } from '@/store/branchStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn, formatDateTime } from '@/lib/utils';
import type { WarehouseItem } from '@/types';

export default function BodegaPage() {
  const items = useWarehouseStore((s) => s.items);
  const movements = useWarehouseStore((s) => s.movements);
  const fetchMovements = useWarehouseStore((s) => s.fetchMovements);
  const deleteItem = useWarehouseStore((s) => s.deleteItem);
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);

  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('item');

  const [selectedBranchId, setSelectedBranchId] = useState(() => adminFilterBranchId ?? branches[0]?.id ?? '');
  const [editing, setEditing] = useState<WarehouseItem | null | 'new'>(null);
  const [adjusting, setAdjusting] = useState<WarehouseItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WarehouseItem | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Si venimos desde la campanita de alertas (?item=xxx), mostrar esa sucursal y
  // resaltar la fila del insumo en cuestión.
  useEffect(() => {
    if (!highlightId) return;
    const item = items.find((i) => i.id === highlightId);
    if (item && !item.branchIds.includes(selectedBranchId) && item.branchIds[0]) {
      setSelectedBranchId(item.branchIds[0]);
    }
    const el = rowRefs.current[highlightId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timeout = setTimeout(() => setSearchParams({}, { replace: true }), 3000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, items]);

  const branchItems = useMemo(
    () => items.filter((i) => i.branchIds.includes(selectedBranchId)),
    [items, selectedBranchId],
  );
  const lowStockCount = branchItems.filter((i) => (i.stockByBranch[selectedBranchId] ?? 0) <= i.lowStockThreshold).length;
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Warehouse size={24} className="text-primary-500" /> Bodega
            </h1>
            <p className="text-sm text-ink-muted">Insumos separados del catálogo de venta (harinas, envases, etc.).</p>
          </div>
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> Nuevo insumo
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer',
                selectedBranchId === b.id ? 'bg-primary-500 text-white' : 'bg-cream-300 text-ink-muted hover:bg-cream-200',
              )}
            >
              {b.name}
            </button>
          ))}
        </div>

        {lowStockCount > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
            <AlertTriangle size={16} />
            {lowStockCount} insumo{lowStockCount > 1 ? 's' : ''} con stock bajo en {branchName(selectedBranchId)}
          </div>
        )}

        <motion.div key={selectedBranchId} variants={staggerContainer} initial="initial" animate="animate" className="mb-10 space-y-2.5">
          {branchItems.length === 0 ? (
            <Card className="py-12 text-center">
              <Warehouse size={32} className="mx-auto mb-2 text-ink-soft opacity-40" />
              <p className="text-sm text-ink-soft">No hay insumos de bodega para esta sucursal todavía.</p>
            </Card>
          ) : (
            branchItems.map((item) => {
              const stock = item.stockByBranch[selectedBranchId] ?? 0;
              const low = stock <= item.lowStockThreshold;
              const out = stock <= 0;
              return (
                <motion.div key={item.id} variants={staggerItem} ref={(el) => { rowRefs.current[item.id] = el; }}>
                  <Card
                    className={cn(
                      'flex flex-col gap-3 p-4 sm:flex-row sm:items-center transition-shadow',
                      highlightId === item.id && 'ring-2 ring-amber-400',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display font-bold text-ink">{item.name}</p>
                        {out ? <Badge tone="danger">Agotado</Badge> : low ? <Badge tone="warning">Stock bajo</Badge> : null}
                      </div>
                      <p className="text-sm text-ink-muted">
                        {stock} {item.unit} · mínimo {item.lowStockThreshold} {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" onClick={() => setAdjusting(item)} className="text-sm">
                        Ajustar stock
                      </Button>
                      <button
                        onClick={() => setEditing(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft hover:bg-cream-300 hover:text-ink cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>

        <h2 className="mb-3 font-display text-lg font-bold text-ink">Historial de movimientos</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-ink-muted">Todavía no hay movimientos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="pb-2.5 font-semibold">Insumo</th>
                  <th className="pb-2.5 font-semibold">Sucursal</th>
                  <th className="pb-2.5 font-semibold">Tipo</th>
                  <th className="pb-2.5 text-right font-semibold">Cantidad</th>
                  <th className="pb-2.5 font-semibold">Usuario</th>
                  <th className="pb-2.5 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => (
                  <tr key={m.id} className="text-ink">
                    <td className="py-2.5 font-semibold">{m.itemName}</td>
                    <td className="py-2.5 text-ink-muted">{branchName(m.branchId)}</td>
                    <td className="py-2.5">
                      <Badge tone={m.type === 'entrada' ? 'primary' : 'neutral'}>
                        {m.type === 'entrada' ? 'Entrada' : m.saleId ? 'Entrega' : 'Salida'}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums">
                      {m.type === 'entrada' ? '+' : '−'}{m.quantity}
                    </td>
                    <td className="py-2.5 text-ink-muted">{m.userName}</td>
                    <td className="py-2.5 text-ink-muted">{formatDateTime(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WarehouseItemFormModal item={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
      <WarehouseAdjustStockModal
        item={adjusting}
        branchId={selectedBranchId}
        branchName={branchName(selectedBranchId)}
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        title={`¿Eliminar "${pendingDelete?.name}"?`}
        description="Esta acción no se puede deshacer. Se perderá el registro del insumo (el historial de movimientos ya hechos se conserva)."
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={() => pendingDelete && deleteItem(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </AdminShell>
  );
}
