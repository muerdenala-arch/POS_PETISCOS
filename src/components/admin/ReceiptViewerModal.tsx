import { Modal } from '@/components/ui/Modal';
import type { Sale } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface ReceiptViewerModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export function ReceiptViewerModal({ sale, onClose }: ReceiptViewerModalProps) {
  if (!sale || !sale.payment.receiptImage) return null;

  return (
    <Modal open={!!sale} onClose={onClose} title={`Comprobante · Ticket #${sale.ticketNumber}`} size="md">
      <div className="px-6 pb-6 pt-2">
        <div className="mb-4 grid grid-cols-3 gap-2.5 text-center">
          <InfoChip label="Monto" value={formatCurrency(sale.total)} />
          <InfoChip label="Cajero" value={sale.cashierName} />
          <InfoChip label="Hora" value={formatDateTime(sale.createdAt)} small />
        </div>

        <div className="overflow-hidden rounded-xl2 border border-border bg-cream-100">
          <img
            src={sale.payment.receiptImage}
            alt={`Comprobante de la venta #${sale.ticketNumber}`}
            className="max-h-[60vh] w-full object-contain"
          />
        </div>
        <p className="mt-3 text-center text-xs text-ink-soft">
          Verifica que el monto y el remitente en la captura coincidan con esta venta.
        </p>
      </div>
    </Modal>
  );
}

function InfoChip({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-cream-200 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={small ? 'text-xs font-semibold text-ink' : 'font-display font-bold text-ink'}>{value}</p>
    </div>
  );
}
