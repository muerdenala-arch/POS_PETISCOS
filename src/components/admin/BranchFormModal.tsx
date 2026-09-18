import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useBranchStore } from '@/store/branchStore';
import type { Branch } from '@/types';
import { cn } from '@/lib/utils';

interface BranchFormModalProps {
  branch: Branch | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = { name: '', address: '', phone: '' };

export function BranchFormModal({ branch, open, onClose }: BranchFormModalProps) {
  const addBranch = useBranchStore((s) => s.addBranch);
  const updateBranch = useBranchStore((s) => s.updateBranch);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(branch ? { name: branch.name, address: branch.address, phone: branch.phone } : emptyForm);
  }, [branch, open]);

  function handleSave() {
    if (!form.name.trim()) return;
    const data = { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim() };
    if (branch) {
      updateBranch(branch.id, data);
    } else {
      addBranch(data);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={branch ? 'Editar sucursal' : 'Nueva sucursal'} size="sm">
      <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Sucursal Este" />
        <Input
          label="Dirección"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Ej. Av. Siempre Viva 742"
        />
        <Input
          label="Teléfono"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Ej. 700-00004"
        />
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          className={cn('flex-1 border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700')}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-[2]" size="lg" disabled={!form.name.trim()}>
          {branch ? 'Guardar cambios' : 'Crear sucursal'}
        </Button>
      </div>
    </Modal>
  );
}
