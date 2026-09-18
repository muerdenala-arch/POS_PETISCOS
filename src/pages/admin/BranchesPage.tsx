import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BranchFormModal } from '@/components/admin/BranchFormModal';
import { useBranchStore } from '@/store/branchStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import type { Branch } from '@/types';

export default function BranchesPage() {
  const branches = useBranchStore((s) => s.branches);
  const toggleActive = useBranchStore((s) => s.toggleActive);
  const deleteBranch = useBranchStore((s) => s.deleteBranch);
  const [editing, setEditing] = useState<Branch | null | 'new'>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;
    try {
      setIsDeleting(true);
      await deleteBranch(branchToDelete.id);
      setBranchToDelete(null);
    } catch (error) {
      alert('Hubo un error al eliminar la sucursal.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Building2 size={24} className="text-primary-500" /> Sucursales
            </h1>
            <p className="text-sm text-ink-muted">Administra los locales del negocio y sus datos de contacto.</p>
          </div>
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} /> Nueva sucursal
          </Button>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {branches.map((branch) => (
            <motion.div key={branch.id} variants={staggerItem}>
              <Card className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400">
                    <Building2 size={20} />
                  </div>
                  <Badge tone={branch.active ? 'secondary' : 'neutral'}>{branch.active ? 'Activa' : 'Inactiva'}</Badge>
                </div>

                <div>
                  <p className="font-display font-bold text-ink">{branch.name}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" /> {branch.address || 'Sin dirección'}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                    <Phone size={14} className="flex-shrink-0" /> {branch.phone || 'Sin teléfono'}
                  </p>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <button
                    onClick={() => toggleActive(branch.id)}
                    className="flex-1 rounded-xl bg-cream-200 py-2.5 text-sm font-bold text-ink-muted transition-colors hover:bg-cream-300 cursor-pointer"
                  >
                    {branch.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => setEditing(branch)}
                    aria-label="Editar"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-primary-50 hover:text-primary-700 cursor-pointer"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setBranchToDelete(branch)}
                    aria-label="Eliminar"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <BranchFormModal
        open={editing !== null}
        branch={editing === 'new' ? null : editing || null}
        onClose={() => setEditing(null)}
      />

      <Modal open={!!branchToDelete} onClose={() => setBranchToDelete(null)} title="⚠️ Advertencia Crítica" size="sm">
        <div className="p-6">
          <p className="mb-4 text-ink">
            Estás a punto de eliminar la sucursal <strong className="text-red-600 font-bold">{branchToDelete?.name}</strong> de forma <strong>PERMANENTE</strong>.
          </p>
          <div className="mb-6 rounded-xl bg-red-50 p-4 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              Se borrarán IRREVERSIBLEMENTE:
            </p>
            <ul className="list-disc pl-5 mt-2 text-sm text-red-700 dark:text-red-400">
              <li>Todas las ventas</li>
              <li>Turnos de caja (aperturas/cierres)</li>
              <li>Códigos QR asociados</li>
            </ul>
          </div>
          <p className="mb-6 font-semibold text-ink-muted text-sm text-center">
            ¿Estás absolutamente seguro de continuar?<br />Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setBranchToDelete(null)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              disabled={isDeleting} 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-transparent"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
