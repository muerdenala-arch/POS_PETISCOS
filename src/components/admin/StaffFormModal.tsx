import { useEffect, useState } from 'react';
import { Dices, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, fieldClasses, fieldLabelClasses } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useStaffStore } from '@/store/staffStore';
import { useBranchStore } from '@/store/branchStore';
import { optionActiveClasses, optionInactiveClasses } from '@/lib/optionStyles';
import { AVATAR_COLORS } from '@/data/seed';
import type { Role, User } from '@/types';
import { cn } from '@/lib/utils';

interface StaffFormModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

const emptyForm = {
  name: '',
  role: 'cajero' as Role,
  pin: '',
  color: AVATAR_COLORS[0],
  branchIds: [] as string[],
};

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function StaffFormModal({ user, open, onClose }: StaffFormModalProps) {
  const addUser = useStaffStore((s) => s.addUser);
  const updateUser = useStaffStore((s) => s.updateUser);
  const isPinTaken = useStaffStore((s) => s.isPinTaken);
  const branches = useBranchStore((s) => s.branches);
  const [form, setForm] = useState(emptyForm);
  const [pinError, setPinError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, role: user.role, pin: user.pin, color: user.color, branchIds: user.branchIds });
    } else {
      setForm({ ...emptyForm, pin: randomPin() });
    }
    setPinError(null);
    setBranchError(null);
  }, [user, open]);

  function toggleBranch(id: string) {
    setBranchError(null);
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(id) ? f.branchIds.filter((b) => b !== id) : [...f.branchIds, id],
    }));
  }

  function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setForm((f) => ({ ...f, pin: digits }));
    setPinError(null);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (form.pin.length !== 4) {
      setPinError('El PIN debe tener exactamente 4 dígitos.');
      return;
    }
    if (isPinTaken(form.pin, user?.id)) {
      setPinError('Ese PIN ya está en uso por otro miembro del personal.');
      return;
    }
    if (form.branchIds.length === 0) {
      setBranchError('Asigna al menos una sucursal.');
      return;
    }

    const data = {
      name: form.name.trim(),
      role: form.role,
      pin: form.pin,
      color: form.color,
      branchIds: form.branchIds,
    };
    if (user) {
      updateUser(user.id, data);
    } else {
      addUser(data);
    }
    onClose();
  }

  const isPrimaryAdmin = !!user?.protected;

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Editar personal' : 'Nuevo cajero / admin'} size="md">
      <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
        <div className="flex justify-center">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-soft transition-colors',
              form.color,
            )}
          >
            {form.name.trim() ? form.name.trim().charAt(0).toUpperCase() : <UserIcon size={26} />}
          </div>
        </div>

        <Input
          label="Nombre completo"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ej. María Fernández"
        />

        <div>
          <p className={fieldLabelClasses}>Rol</p>
          <div className="grid grid-cols-2 gap-2.5">
            <RolePill
              active={form.role === 'cajero'}
              label="Cajero"
              hint="Venta rápida y caja"
              onClick={() => setForm((f) => ({ ...f, role: 'cajero' }))}
            />
            <RolePill
              active={form.role === 'admin'}
              label="Administrador"
              hint="Catálogo, reportes y personal"
              onClick={() => setForm((f) => ({ ...f, role: 'admin' }))}
              disabled={isPrimaryAdmin}
            />
          </div>
          {isPrimaryAdmin && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-soft">
              <ShieldCheck size={13} /> El administrador principal no puede cambiar de rol.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={fieldLabelClasses}>PIN de acceso (4 dígitos)</span>
            <button
              type="button"
              onClick={() => handlePinChange(randomPin())}
              className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
            >
              <Dices size={13} /> Generar
            </button>
          </div>
          <input
            value={form.pin}
            onChange={(e) => handlePinChange(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="0000"
            className={cn(fieldClasses, 'min-h-touch text-center font-display text-2xl font-bold tracking-[0.5em]')}
          />
          {pinError && <p className="mt-1.5 text-xs font-semibold text-red-600">{pinError}</p>}
        </div>

        <div>
          <p className={fieldLabelClasses}>Sucursales asignadas</p>
          <p className="mb-2 text-xs text-ink-muted">
            Con una sola sucursal entra directo; con varias, elige al iniciar turno.
          </p>
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBranch(b.id)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-sm transition-colors cursor-pointer',
                  form.branchIds.includes(b.id) ? optionActiveClasses : optionInactiveClasses,
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
          {branchError && <p className="mt-1.5 text-xs font-semibold text-red-600">{branchError}</p>}
        </div>

        <div>
          <p className={fieldLabelClasses}>Color identificador</p>
          <div className="flex flex-wrap gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={cn(
                  'h-9 w-9 rounded-full transition-transform cursor-pointer',
                  c,
                  form.color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-amber-500 scale-110' : 'hover:scale-105',
                )}
                aria-label={c}
              />
            ))}
          </div>
        </div>
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
          className="flex-[2] !bg-amber-500 py-3 !text-white !shadow-lg hover:!bg-amber-600"
          size="lg"
          disabled={!form.name.trim()}
        >
          {user ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </div>
    </Modal>
  );
}

function RolePill({
  active,
  label,
  hint,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-touch flex-col items-start justify-center rounded-xl border px-3.5 py-2 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border-transparent bg-amber-500 text-white ring-2 ring-amber-400 shadow-md'
          : 'border-border-strong bg-field text-ink-muted hover:border-amber-300',
      )}
    >
      <span className="text-sm font-bold">{label}</span>
      <span className="text-xs opacity-80">{hint}</span>
    </button>
  );
}
