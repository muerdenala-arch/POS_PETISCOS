import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, Camera, ImageOff, QrCode, RefreshCcw, Zap, SplitSquareHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency } from '@/lib/utils';
import { fileToCompressedDataUrl } from '@/lib/image';
import { useQrCodeStore } from '@/store/qrCodeStore';
import { useAuthStore } from '@/store/authStore';
import { APP_CONFIG } from '@/config/app';
import { api } from '@/lib/api';
import type { Payment, PaymentMethod } from '@/types';

interface CheckoutModalProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payment: Payment) => void;
}

export function CheckoutModal({ open, total, onClose, onConfirm }: CheckoutModalProps) {
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const activeQr = useQrCodeStore((s) => (currentBranchId ? s.activeQrCodeForBranch(currentBranchId) : null));
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [amountEfectivo, setAmountEfectivo] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Calculadora de cambio
  const [receivedCash, setReceivedCash] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMethod('efectivo');
      setAmountEfectivo('');
      setReceiptImage(null);
      setUploadError(null);
      setConfirming(false);
      setReceivedCash(total.toString());
    }
  }, [open, total]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo si se quita y se repone
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setReceiptImage(dataUrl);
    } catch {
      setUploadError('No se pudo cargar la imagen. Intenta de nuevo.');
    }
  }

  async function handleConfirm() {
    if (method === 'efectivo') {
      onConfirm({ method: 'efectivo', amount: total });
      return;
    }

    setConfirming(true);
    try {
      let uploadedUrl: string | undefined;
      if (receiptImage) {
        const { url } = await api.upload.image(receiptImage, 'receipts');
        uploadedUrl = url;
      }
      
      if (method === 'mixto') {
        const ef = Number(amountEfectivo) || 0;
        const qr = Math.max(0, total - ef);
        onConfirm({ method: 'mixto', amount: total, amountEfectivo: ef, amountQr: qr, receiptImage: uploadedUrl });
      } else {
        onConfirm({ method: 'qr', amount: total, receiptImage: uploadedUrl });
      }
    } catch {
      setUploadError('No se pudo subir el comprobante. Intenta de nuevo.');
      setConfirming(false);
    }
  }

  const qrAmount = Math.max(0, total - (Number(amountEfectivo) || 0));
  const receivedNum = Number(receivedCash) || 0;
  const changeAmount = receivedNum - total;
  
  const canConfirm = !confirming && (
    (method === 'efectivo' && receivedNum >= total) 
    || (method === 'qr' && !!receiptImage) 
    || (method === 'mixto' && !!receiptImage && Number(amountEfectivo) > 0 && qrAmount > 0)
  );

  return (
    <Modal open={open} onClose={onClose} title="Cobrar" size="md">
      <div className="px-6 pb-6 pt-2">
        <div className="mb-5 rounded-xl2 bg-gradient-to-br from-primary-500 to-accent-500 p-4 text-center text-white shadow-pop">
          <p className="text-sm opacity-90">Total a pagar</p>
          <p className="font-display text-4xl font-extrabold tabular-nums">{formatCurrency(total)}</p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2.5">
          <MethodTab
            active={method === 'efectivo'}
            icon={<Banknote size={18} />}
            label="Efectivo"
            onClick={() => setMethod('efectivo')}
          />
          <MethodTab
            active={method === 'qr'}
            icon={<QrCode size={18} />}
            label={APP_CONFIG.qrProviderLabel}
            onClick={() => setMethod('qr')}
          />
          <MethodTab
            active={method === 'mixto'}
            icon={<SplitSquareHorizontal size={18} />}
            label="Mixto"
            onClick={() => setMethod('mixto')}
          />
        </div>

        <AnimatePresence mode="wait">
          {method === 'efectivo' ? (
            <motion.div
              key="efectivo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600 dark:bg-secondary-500/15 dark:text-secondary-400">
                <Zap size={30} />
              </div>
              <p className="font-display text-lg font-bold text-ink">Cobro en efectivo</p>
              
              <div className="mt-4 w-full flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">Efectivo Recibido</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-ink-muted">Bs</span>
                    <input 
                      type="number"
                      min={total}
                      value={receivedCash}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setReceivedCash(e.target.value)}
                      placeholder={total.toString()}
                      className="w-24 rounded-lg border border-border bg-field px-3 py-1.5 text-right font-display font-bold text-ink focus:border-secondary-400 focus:outline-none focus:ring-2 focus:ring-secondary-400/20"
                      autoFocus
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mb-1 justify-end">
                  {[total, 50, 100, 200].filter((val, idx, arr) => val >= total && arr.indexOf(val) === idx).map(amt => (
                    <button 
                      key={amt} 
                      onClick={() => setReceivedCash(amt.toString())}
                      className="rounded bg-cream-300 px-2 py-1 text-xs font-bold text-ink-muted hover:bg-cream-400"
                    >
                      {amt === total ? 'Exacto' : `Bs ${amt}`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
                  <span className="text-sm font-bold text-ink">Cambio a devolver</span>
                  <span className={cn(
                    "font-display text-lg font-extrabold tabular-nums",
                    changeAmount >= 0 ? "text-secondary-600" : "text-red-500"
                  )}>
                    {changeAmount >= 0 ? formatCurrency(changeAmount) : `Falta ${formatCurrency(Math.abs(changeAmount))}`}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={method}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center"
            >
              {method === 'mixto' && (
                <div className="mb-5 w-full flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">Monto en Efectivo</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-ink-muted">Bs</span>
                      <input 
                        type="number"
                        min="1"
                        max={total - 1}
                        value={amountEfectivo}
                        onChange={(e) => setAmountEfectivo(e.target.value)}
                        placeholder="0"
                        className="w-24 rounded-lg border border-border bg-field px-3 py-1.5 text-right font-display font-bold text-ink focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
                    <span className="text-sm font-bold text-ink">Restante en QR</span>
                    <span className="font-display text-lg font-extrabold text-accent-600 tabular-nums">
                      {formatCurrency(qrAmount)}
                    </span>
                  </div>
                </div>
              )}

              {activeQr ? (
                <>
                  <p className="mb-3 max-w-[30ch] text-center text-sm font-semibold text-ink">
                    Escanea para pagar vía{' '}
                    {activeQr.bankOrHolder ? `${activeQr.bankOrHolder} - ${activeQr.alias}` : activeQr.alias}
                  </p>
                  <div 
                    onClick={() => setLightboxOpen(true)}
                    className="relative mb-5 rounded-xl2 border-4 border-primary-200 bg-white p-5 shadow-soft dark:border-primary-400/70 cursor-pointer hover:border-primary-400 transition-colors"
                  >
                    <img src={activeQr.image} alt={`QR de cobro — ${activeQr.alias}`} className="h-44 w-44 object-contain" />
                  </div>
                </>
              ) : (
                <div className="mb-5 flex flex-col items-center gap-2 rounded-xl2 border-2 border-dashed border-border-strong bg-field px-6 py-8 text-center">
                  <QrCode size={30} className="text-ink-soft" />
                  <p className="max-w-[28ch] text-sm font-semibold text-ink-muted">
                    No hay un QR activo configurado por el administrador
                  </p>
                </div>
              )}

              <ReceiptUploader
                receiptImage={receiptImage}
                error={uploadError}
                fileInputRef={fileInputRef}
                onFileChange={handleFileChange}
                onRemove={() => {
                  setReceiptImage(null);
                  setUploadError(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={!canConfirm} className="flex-[2]" size="lg">
          {confirming ? 'Subiendo comprobante…' : 'Confirmar pago'}
        </Button>
      </div>

      <AnimatePresence>
        {lightboxOpen && activeQr && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-6 cursor-pointer"
            onClick={() => setLightboxOpen(false)}
          >
            <p className="text-white/80 font-bold mb-4">Toca en cualquier parte para cerrar</p>
            <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <img src={activeQr.image} className="w-full h-auto object-contain" alt="QR en pantalla completa" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function ReceiptUploader({
  receiptImage,
  error,
  fileInputRef,
  onFileChange,
  onRemove,
}: {
  receiptImage: string | null;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {receiptImage ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-xl2 border-2 border-secondary-300 bg-cream-100 dark:border-secondary-600"
        >
          <img src={receiptImage} alt="Comprobante de pago" className="max-h-48 w-full object-contain bg-black/5" />
          <div className="flex items-center gap-2 border-t border-border p-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-ink-muted hover:bg-cream-300 cursor-pointer"
            >
              <RefreshCcw size={13} /> Cambiar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
            >
              <ImageOff size={13} /> Eliminar
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-touch-lg w-full flex-col items-center justify-center gap-1.5 rounded-xl2 border-2 border-dashed border-border-strong bg-field px-4 py-6 text-center transition-colors hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 cursor-pointer"
        >
          <Camera size={26} className="text-primary-500" />
          <span className="font-display text-sm font-bold text-ink">Tomar foto / Subir comprobante</span>
          <span className="text-xs text-ink-soft">Foto de la transferencia o captura de pantalla</span>
        </button>
      )}

      {error && <p className="mt-2 text-center text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function MethodTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-h-touch items-center justify-center gap-2 rounded-xl2 border-2 text-sm font-bold transition-colors cursor-pointer',
        active ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-border bg-surface text-ink-muted hover:border-primary-200',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
