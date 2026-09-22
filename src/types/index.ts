// Modelo de dominio — POS Juguería

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
}

export type Role = 'admin' | 'cajero';

export type StaffStatus = 'activo' | 'bloqueado';

export interface User {
  id: string;
  name: string;
  /** Solo se envía al servidor al crear/restablecer (4 dígitos); el servidor nunca
   *  lo devuelve — un User leído de la API siempre lo trae vacío/ausente. */
  pin?: string;
  role: Role;
  color: string; // clase tailwind para el avatar (fondo del círculo)
  status: StaffStatus; // 'bloqueado' no puede iniciar sesión ni aparece en el login
  createdAt: string; // ISO — fecha de registro
  /** Administrador principal sembrado por el sistema: no se puede eliminar ni bloquear. */
  protected?: boolean;
  /** Sucursales donde puede operar. 1 sola = entra directo; varias = elige al iniciar turno. */
  branchIds: string[];
}

/** Estado operativo mostrado en el listado de Personal (además de activo/bloqueado). */
export type StaffDisplayStatus = 'caja_abierta' | 'activo' | 'bloqueado';

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface SizeOption {
  id: string;
  label: string;
  ounces: number;
  price: number; // precio final del tamaño
}

export interface Topping {
  id: string;
  name: string;
  priceExtra: number;
  /** Stock independiente por sucursal: { [branchId]: cantidad }. */
  stockByBranch: Record<string, number>;
  lowStockThreshold: number;
  branchIds: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  gradient: string; // clases tailwind para la tarjeta
  emoji: string; // acento visual (no se usa como ícono funcional)
  imageUrl?: string; // URL de la imagen en Cloudinary
  sizes: SizeOption[];
  toppingIds: string[];
  branchIds: string[];
  active: boolean;
  /** Stock independiente por sucursal: { [branchId]: cantidad }. */
  stockByBranch: Record<string, number>;
  lowStockThreshold: number;
  unit: string; // 'unidades', 'porciones'
}

export interface CartModifiers {
  size?: SizeOption; // undefined when product has no sizes
  toppings: Topping[];
}

export interface CartItem {
  lineId: string;
  product: Product;
  modifiers: CartModifiers;
  quantity: number;
  /** Precio final por unidad (puede incluir descuento de promo). */
  unitPrice: number;
  /** Precio original sin promoción (igual a unitPrice si no hay promo). */
  originalUnitPrice: number;
  lineTotal: number;
  notes?: string;
  /** ID de la promoción aplicada a este ítem (si aplica). */
  appliedPromotionId?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ITEM';

export interface Promotion {
  id: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  /** 'ALL' o nombre de categoría exacta */
  appliesTo: string;
  branchIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  /** 'ALL' | nombre de categoría | 'PRODUCT:id' */
  appliesTo: string;
  /** null = aplica en todas las sucursales */
  branchId: string | null;
  createdAt: string;
}

export type PaymentMethod = 'efectivo' | 'qr' | 'mixto';

export interface Payment {
  method: PaymentMethod;
  amount: number;
  /** Solo para método 'mixto': cuánto se pagó en efectivo */
  amountEfectivo?: number;
  /** Solo para método 'mixto': cuánto se pagó por QR */
  amountQr?: number;
  /** Comprobante de transferencia (foto/captura) adjunto al pago por QR o Mixto, como data URL. */
  receiptImage?: string;
}

export interface Sale {
  id: string;
  ticketNumber: number;
  items: CartItem[];
  /** Subtotal después de promos de ítem pero antes de cupón. */
  subtotal: number;
  /** Precio original total sin ningún descuento aplicado. */
  subtotalBeforeDiscount: number;
  /** Monto de descuento de cupón en Bs. */
  discountAmount: number;
  /** 'NONE' | 'PROMO' | 'COUPON' | 'BOTH' */
  discountType: string;
  /** Código del cupón usado (si aplica). */
  couponCode?: string;
  total: number;
  payment: Payment;
  cashierId: string;
  cashierName: string;
  registerSessionId: string;
  branchId: string;
  createdAt: string;
}

export interface QrCode {
  id: string;
  alias: string; // ej. "Yape", "Cuenta Principal"
  bankOrHolder: string; // ej. "BMSC", "Banco Unión — Titular Valeria Ríos"
  imageUrl: string; // URL pública en Cloudinary (o data URL si Cloudinary no está configurado)
  active: boolean;
  branchId: string;
  createdAt: string; // ISO
}

export type RegisterStatus = 'abierta' | 'cerrada';

export interface CashRegisterSession {
  id: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  closingAmountCounted?: number;
  expectedAmount?: number;
  difference?: number;
  salesTotal?: number;
  salesCount?: number;
  cashSalesTotal?: number;
  qrSalesTotal?: number;
  status: RegisterStatus;
  notes?: string;
}

export interface Expense {
  id: string;
  amount: number;
  concept: string;
  category: string;
  registerSessionId?: string | null;
  branchId?: string | null;
  userId: string;
  createdAt: string;
}
