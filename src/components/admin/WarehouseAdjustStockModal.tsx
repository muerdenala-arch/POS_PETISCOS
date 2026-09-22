import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWarehouseStore } from '@/store/warehouseStore';
import type { WarehouseItem, WarehouseMovementType } from '@/types';
import { cn } from '@/lib/utils';

interface WarehouseAdjustStockModalProps {
  item: WarehouseItem | null;
  branchId: string;
  branchName: string;
  open: boolean;
  onClose: () => void;
}

export function WarehouseAdjustStockModal({ item, branchId, branchName, open, onClose }: WarehouseAdjustStockModalProps) {
  const adjustStock = useWarehouseStore((s) => s.adjustStock);
  const [type, setType] = useState<WarehouseMovementType>('entrada');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setType('entrada');
    setQuantity('1');
    setNote('');
    setError(null);
    setSaving(false);
  }, [item, open]);

  if (!item) return null;
  const currentStock = item.stockByBranch[branchId] ?? 0;

  async function handleSave() {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError('Ingresa una cantidad válida.');
      return;
    }
    if (type === 'salida' && qty > currentStock) {
      setError(`Solo quedan ${currentStock} ${item!.unit}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adjustStock(item!.id, branchId, type, qty, note.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento.');
    }
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Ajustar stock — ${item.name}`} size="sm">
      <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
        <p className="text-sm text-ink-muted">
          {branchName} · stock actual: <span className="font-bold text-ink">{currentStock} {item.unit}</span>
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setType('entrada')}
            className={cn(
              'rounded-xl border-2 px-3.5 py-3 text-left text-sm font-bold transition-colors cursor-pointer',
              type === 'entrada' ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-border text-ink-muted hover:border-secondary-300',
            )}
          >
            + Entrada
            <span className="block text-xs font-normal text-ink-soft">Reposición / compra</span>
          </button>
          <button
            type="button"
            onClick={() => setType('salida')}
            className={cn(
              'rounded-xl border-2 px-3.5 py-3 text-left text-sm font-bold transition-colors cursor-pointer',
              type === 'salida' ? 'border-red-500 bg-red-50 text-red-700' : 'border-border text-ink-muted hover:border-red-300',
            )}
          >
            − Salida
            <span className="block text-xs font-normal text-ink-soft">Merma / ajuste</span>
          </button>
        </div>

        <Input
          label={`Cantidad (${item.unit})`}
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Input
          label="Nota (opcional)"
          placeholder="Ej. Compra a proveedor, producto vencido..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-[2] py-3" size="lg" disabled={saving}>
          {saving ? 'Guardando…' : 'Registrar movimiento'}
        </Button>
      </div>
    </Modal>
  );
}
