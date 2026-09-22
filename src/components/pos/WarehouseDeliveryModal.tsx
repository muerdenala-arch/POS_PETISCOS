import { useEffect, useState } from 'react';
import { Warehouse } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useWarehouseStore } from '@/store/warehouseStore';
import { cn } from '@/lib/utils';

interface WarehouseDeliveryModalProps {
  open: boolean;
  branchId: string;
  onClose: () => void;
}

export function WarehouseDeliveryModal({ open, branchId, onClose }: WarehouseDeliveryModalProps) {
  const items = useWarehouseStore((s) => s.items);
  const addPendingDelivery = useWarehouseStore((s) => s.addPendingDelivery);
  const branchItems = items.filter((i) => i.branchIds.includes(branchId));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedId(branchItems[0]?.id ?? null);
      setQuantity('1');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = branchItems.find((i) => i.id === selectedId) ?? null;
  const available = selected ? (selected.stockByBranch[branchId] ?? 0) : 0;

  function handleAdd() {
    if (!selected) return;
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError('Ingresa una cantidad válida.');
      return;
    }
    if (qty > available) {
      setError(`Solo quedan ${available} ${selected.unit} en bodega.`);
      return;
    }
    addPendingDelivery(selected.id, selected.name, qty);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Entregar de bodega" size="sm">
      <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
        {branchItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Warehouse size={30} className="text-ink-soft opacity-40" />
            <p className="text-sm text-ink-soft">No hay insumos de bodega configurados para esta sucursal.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-muted">Insumo</label>
              <div className="flex flex-col gap-2">
                {branchItems.map((item) => {
                  const stock = item.stockByBranch[branchId] ?? 0;
                  const out = stock <= 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={out}
                      onClick={() => { setSelectedId(item.id); setError(null); }}
                      className={cn(
                        'flex items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-left transition-colors',
                        out
                          ? 'cursor-not-allowed border-border opacity-50'
                          : selectedId === item.id
                            ? 'cursor-pointer border-primary-500 bg-primary-50'
                            : 'cursor-pointer border-border hover:border-primary-300',
                      )}
                    >
                      <span className="text-sm font-bold text-ink">{item.name}</span>
                      <span className={cn('text-xs font-semibold', out ? 'text-red-600' : 'text-ink-muted')}>
                        {out ? 'Agotado' : `${stock} ${item.unit}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-muted">
                  Cantidad ({selected.unit})
                </label>
                <input
                  type="number"
                  min={1}
                  max={available}
                  value={quantity}
                  onChange={(e) => { setQuantity(e.target.value); setError(null); }}
                  className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
                />
              </div>
            )}

            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </>
        )}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancelar
        </Button>
        <Button onClick={handleAdd} className="flex-[2] py-3" size="lg" disabled={!selected}>
          Agregar entrega
        </Button>
      </div>
    </Modal>
  );
}
