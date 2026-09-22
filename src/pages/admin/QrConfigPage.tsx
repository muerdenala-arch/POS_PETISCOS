import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, QrCode as QrCodeIcon, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { QrCard } from '@/components/admin/QrCard';
import { QrFormModal } from '@/components/admin/QrFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { useQrCodeStore } from '@/store/qrCodeStore';
import { useBranchStore } from '@/store/branchStore';
import { useSettingsStore } from '@/store/settingsStore';
import { staggerContainer } from '@/lib/motion';
import type { QrCode } from '@/types';

export default function QrConfigPage() {
  const qrCodes = useQrCodeStore((s) => s.qrCodes);
  const setActive = useQrCodeStore((s) => s.setActive);
  const removeQrCode = useQrCodeStore((s) => s.removeQrCode);
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);
  const requireQrReceipt = useSettingsStore((s) => s.requireQrReceipt);
  const setRequireQrReceipt = useSettingsStore((s) => s.setRequireQrReceipt);

  const [editing, setEditing] = useState<QrCode | null | 'new'>(null);
  const [pendingDelete, setPendingDelete] = useState<QrCode | null>(null);

  // Respeta el filtro global de sucursal del sidebar; con "Todas" se ven los QR de
  // cada local, etiquetados, porque un QR siempre pertenece a una sola sucursal.
  const visible = useMemo(
    () => (adminFilterBranchId ? qrCodes.filter((q) => q.branchId === adminFilterBranchId) : qrCodes),
    [qrCodes, adminFilterBranchId],
  );
  const sorted = [...visible].sort((a, b) => (a.active ? -1 : b.active ? 1 : b.createdAt.localeCompare(a.createdAt)));
  const defaultBranchId = adminFilterBranchId ?? branches[0]?.id ?? '';
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <QrCodeIcon size={24} className="text-primary-500" /> Configuración QR
            </h1>
            <p className="text-sm text-ink-muted">
              Sube los QR de cobro de tus cuentas bancarias/billeteras y elige cuál usa cada sucursal.
            </p>
          </div>
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} /> Nuevo QR
          </Button>
        </div>

        <Card className="mb-6 flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/15">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-ink">Permisos de Cajero</p>
            <p className="text-sm text-ink-muted">
              {requireQrReceipt
                ? 'El cajero debe adjuntar la foto del comprobante para cobrar por QR o Mixto.'
                : 'El cajero puede cobrar por QR o Mixto sin adjuntar foto del comprobante.'}
            </p>
          </div>
          <button
            onClick={() => setRequireQrReceipt(!requireQrReceipt)}
            className="flex-shrink-0 text-primary-500 hover:text-primary-700 cursor-pointer"
            title={requireQrReceipt ? 'Exigir comprobante: activado' : 'Exigir comprobante: desactivado'}
          >
            {requireQrReceipt ? <ToggleRight size={30} /> : <ToggleLeft size={30} className="text-ink-soft" />}
          </button>
        </Card>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border-2 border-dashed border-border-strong bg-field py-16 text-center">
            <QrCodeIcon size={36} className="text-ink-soft" />
            <p className="font-display font-bold text-ink">Aún no subiste ningún QR</p>
            <p className="max-w-[36ch] text-sm text-ink-muted">
              Agrega el primero para que el cajero pueda cobrar por QR en el checkout.
            </p>
            <Button onClick={() => setEditing('new')} className="mt-2">
              <Plus size={18} /> Subir mi primer QR
            </Button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sorted.map((qr) => (
              <QrCard
                key={qr.id}
                qr={qr}
                branchName={adminFilterBranchId ? undefined : branchName(qr.branchId)}
                onActivate={() => setActive(qr.id)}
                onEdit={() => setEditing(qr)}
                onDelete={() => setPendingDelete(qr)}
              />
            ))}
          </motion.div>
        )}
      </div>

      <QrFormModal
        qr={editing === 'new' ? null : editing}
        open={editing !== null}
        defaultBranchId={defaultBranchId}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={`¿Eliminar el QR "${pendingDelete?.alias}"?`}
        description="Esta acción no se puede deshacer. Si estaba activo, el cajero dejará de ver un QR configurado hasta que actives otro."
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={() => pendingDelete && removeQrCode(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </AdminShell>
  );
}
