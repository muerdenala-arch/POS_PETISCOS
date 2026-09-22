import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWarehouseStore } from '@/store/warehouseStore';
import { useBranchStore } from '@/store/branchStore';
import type { WarehouseItem } from '@/types';

interface WarehouseItemFormModalProps {
  item: WarehouseItem | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = {
  name: '',
  unit: 'unidades',
  lowStockThreshold: '5',
  branchIds: [] as string[],
};

export function WarehouseItemFormModal({ item, open, onClose }: WarehouseItemFormModalProps) {
  const createItem = useWarehouseStore((s) => s.createItem);
  const updateItem = useWarehouseStore((s) => s.updateItem);
  const branches = useBranchStore((s) => s.branches);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        unit: item.unit,
        lowStockThreshold: String(item.lowStockThreshold),
        branchIds: item.branchIds,
      });
    } else {
      setForm({ ...emptyForm, branchIds: branches.map((b) => b.id) });
    }
    setError(null);
  }, [item, open, branches]);

  function toggleBranch(id: string) {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(id) ? f.branchIds.filter((b) => b !== id) : [...f.branchIds, id],
    }));
  }

  function toggleAllBranches() {
    setForm((f) => ({ ...f, branchIds: f.branchIds.length === branches.length ? [] : branches.map((b) => b.id) }));
  }

  async function handleSave() {
    if (!form.name.trim() || form.branchIds.length === 0) return;
    setSaving(true);
    setError(null);
    const data = {
      name: form.name.trim(),
      unit: form.unit.trim() || 'unidades',
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      branchIds: form.branchIds,
    };
    try {
      if (item) {
        await updateItem(item.id, data);
      } else {
        await createItem(data);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta nuevamente.');
    }
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar insumo de bodega' : 'Nuevo insumo de bodega'} size="sm">
      <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
        <Input
          label="Nombre del insumo"
          placeholder="Ej. Harina, Envases, Servilletas..."
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Unidad"
            placeholder="paquetes, kg, cajas..."
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          />
          <Input
            label="Umbral de stock bajo"
            type="number"
            min={0}
            value={form.lowStockThreshold}
            onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
          />
        </div>

        {!item && (
          <p className="rounded-lg bg-cream-200 px-3 py-2 text-xs text-ink-muted dark:bg-zinc-800">
            El insumo se crea con stock 0 — después de guardarlo, usa "Ajustar stock" para registrar la
            cantidad inicial (queda en el historial de movimientos).
          </p>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Disponibilidad por sucursal</p>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.branchIds.length === branches.length && branches.length > 0}
                onChange={toggleAllBranches}
                className="h-4 w-4 rounded border-zinc-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="select-none text-sm text-ink-muted">En todas</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBranch(b.id)}
                className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  form.branchIds.includes(b.id)
                    ? 'border-transparent bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'border-border text-ink-muted hover:bg-surface-hover dark:hover:bg-zinc-800'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

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
        <Button
          onClick={handleSave}
          className="flex-[2] !bg-secondary-500 py-3 !text-white !shadow-lg hover:!bg-secondary-600"
          size="lg"
          disabled={saving || !form.name.trim() || form.branchIds.length === 0}
        >
          {saving ? 'Guardando…' : item ? 'Guardar cambios' : 'Crear insumo'}
        </Button>
      </div>
    </Modal>
  );
}
