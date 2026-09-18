import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { StaffRow } from '@/components/admin/StaffRow';
import { StaffFormModal } from '@/components/admin/StaffFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { useStaffStore } from '@/store/staffStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import type { User } from '@/types';

export default function StaffPage() {
  const users = useStaffStore((s) => s.users);
  const toggleBlocked = useStaffStore((s) => s.toggleBlocked);
  const resetPin = useStaffStore((s) => s.resetPin);
  const removeUser = useStaffStore((s) => s.removeUser);

  const [editing, setEditing] = useState<User | null | 'new'>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [pendingReset, setPendingReset] = useState<{ user: User; newPin: string } | null>(null);

  const sorted = [...users].sort((a, b) => (a.protected ? -1 : b.protected ? 1 : a.name.localeCompare(b.name)));

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Users size={24} className="text-primary-500" /> Personal / Cajeros
            </h1>
            <p className="text-sm text-ink-muted">
              Gestiona accesos, roles y estado de caja del equipo en tiempo real.
            </p>
          </div>
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} /> Nuevo cajero
          </Button>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2.5">
          {sorted.map((user) => (
            <motion.div key={user.id} variants={staggerItem}>
              <StaffRow
                user={user}
                onEdit={() => setEditing(user)}
                onToggleBlocked={() => toggleBlocked(user.id)}
                onResetPin={() =>
                  setPendingReset({ user, newPin: String(Math.floor(1000 + Math.random() * 9000)) })
                }
                onDelete={() => setPendingDelete(user)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <StaffFormModal
        user={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={`¿Eliminar a ${pendingDelete?.name}?`}
        description="Esta acción no se puede deshacer. El usuario perderá acceso al sistema de inmediato."
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={() => pendingDelete && removeUser(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={!!pendingReset}
        title={`Restablecer PIN de ${pendingReset?.user.name}`}
        description={`Se generará un nuevo PIN: ${pendingReset?.newPin ?? ''}. El usuario deberá usarlo en su próximo ingreso.`}
        confirmLabel="Aplicar nuevo PIN"
        tone="primary"
        onConfirm={() => pendingReset && resetPin(pendingReset.user.id, pendingReset.newPin)}
        onClose={() => setPendingReset(null)}
      />
    </AdminShell>
  );
}
