// Cliente HTTP delgado hacia las funciones serverless en /api — reemplaza el localStorage
// como fuente de verdad. Mismo origen en producción y en `vercel dev` local, así que no
// hace falta configurar una URL base.
import type {
  Branch,
  CashRegisterSession,
  Coupon,
  Product,
  Promotion,
  QrCode,
  Sale,
  Topping,
  User,
  Category,
  Expense,
} from '@/types';

// Si Neon/la función serverless se cuelga (cold start, pool sin responder), sin esto el
// fetch queda pendiente indefinidamente y el store nunca sale de `hydrated: false` — la
// app se queda trabada en "Sincronizando…" sin feedback. Con el timeout, la promesa
// rechaza a tiempo y cada store puede mostrar el error en vez de esperar para siempre.
const REQUEST_TIMEOUT_MS = 10000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(`/api${path}`, window.location.origin);
    if (!options || !options.method || options.method === 'GET') {
      url.searchParams.append('_t', Date.now().toString());
    }

    const res = await fetch(url.pathname + url.search, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string });
      throw new Error(body.error || `Error ${res.status} en ${path}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${REQUEST_TIMEOUT_MS / 1000}s) al conectar con ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) });
const patch = <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
const del = (path: string) => request<void>(path, { method: 'DELETE' });

// El plan Hobby de Vercel limita a 12 funciones serverless por deployment, así que cada
// recurso vive en UN solo archivo (/api/branches.ts, etc.) que resuelve la colección o un
// ítem puntual según lleve o no `?id=`, en vez de una carpeta con index.ts + [id].ts.
const withId = (path: string, id: string) => `${path}?id=${encodeURIComponent(id)}`;

export const api = {
  branches: {
    list: () => get<Branch[]>('/branches'),
    create: (data: Branch) => post<Branch>('/branches', data),
    update: (id: string, data: Partial<Branch>) => patch<Branch>(withId('/branches', id), data),
    remove: (id: string) => del(withId('/branches', id)),
  },
  staff: {
    list: () => get<User[]>('/staff'),
    create: (data: Omit<User, 'status' | 'createdAt' | 'protected'>) => post<User>('/staff', data),
    update: (id: string, data: Partial<User>) => patch<User>(withId('/staff', id), data),
    remove: (id: string) => del(withId('/staff', id)),
  },
  products: {
    list: () => get<Product[]>('/products'),
    create: (data: Product) => post<Product>('/products', data),
    update: (id: string, data: Partial<Product>) => patch<Product>(withId('/products', id), data),
    remove: (id: string) => del(withId('/products', id)),
  },
  toppings: {
    list: () => get<Topping[]>('/toppings'),
    create: (data: Topping) => post<Topping>('/toppings', data),
    update: (id: string, data: Partial<Topping>) => patch<Topping>(withId('/toppings', id), data),
    remove: (id: string) => del(withId('/toppings', id)),
  },
  qrCodes: {
    list: () => get<QrCode[]>('/qr-codes'),
    create: (data: QrCode) => post<QrCode>('/qr-codes', data),
    update: (id: string, data: Partial<QrCode>) => patch<QrCode>(withId('/qr-codes', id), data),
    setActive: (id: string) => patch<QrCode>(withId('/qr-codes', id), { setActive: true }),
    remove: (id: string) => del(withId('/qr-codes', id)),
  },
  registerSessions: {
    list: () => get<CashRegisterSession[]>('/register-sessions'),
    open: (data: Pick<CashRegisterSession, 'id' | 'cashierId' | 'cashierName' | 'branchId' | 'openingAmount' | 'notes'>) =>
      post<CashRegisterSession>('/register-sessions', data),
    close: (
      id: string,
      data: {
        closingAmountCounted: number;
        expectedAmount: number;
        salesTotal: number;
        salesCount: number;
        cashSalesTotal: number;
        qrSalesTotal: number;
        notes?: string;
      },
    ) => patch<CashRegisterSession>(withId('/register-sessions', id), data),
  },
  sales: {
    list: () => get<Sale[]>('/sales'),
    create: (data: Omit<Sale, 'ticketNumber'>) => post<Sale>('/sales', data),
  },
  categories: {
    list: () => get<Category[]>('/categories'),
    create: (data: Partial<Category>) => post<Category>('/categories', data),
    remove: (id: string) => del(withId('/categories', id)),
  },
  upload: {
    /** Sube una imagen (data URL comprimido en el navegador) a Cloudinary y devuelve su URL pública. */
    image: (dataUrl: string, folder: 'receipts' | 'qr-codes') =>
      post<{ url: string }>('/upload', { image: dataUrl, folder }),
  },
  promotions: {
    list: (activeOnly?: boolean) => get<Promotion[]>(`/promotions${activeOnly ? '?active=true' : ''}`),
    create: (data: Promotion) => post<Promotion>('/promotions', data),
    update: (id: string, data: Partial<Promotion>) => patch<Promotion>(withId('/promotions', id), data),
    remove: (id: string) => del(withId('/promotions', id)),
  },
  coupons: {
    list: () => get<Coupon[]>('/coupons'),
    validate: (code: string, branchId: string) => get<Coupon>(`/coupons?validate=${encodeURIComponent(code)}&branchId=${encodeURIComponent(branchId)}`),
    create: (data: Coupon) => post<Coupon>('/coupons', data),
    update: (id: string, data: Partial<Coupon>) => patch<Coupon>(withId('/coupons', id), data),
    remove: (id: string) => del(withId('/coupons', id)),
  },
  adminReports: {
    get: (startDate: string, endDate: string, branchId?: string) => 
      get<{ sales: Sale[]; sessions: CashRegisterSession[]; monthlyTotal: number; weeklyTotal: number; yearlyTotal: number; totalDiscounts: number; dailyExpenses: number; weeklyExpenses: number; monthlyExpenses: number; yearlyExpenses: number; }>(`/sales?action=reports&startDate=${startDate}&endDate=${endDate}${branchId ? `&branchId=${branchId}` : ''}`),
  },
  expenses: {
    list: () => get<Expense[]>('/expenses'),
    create: (data: Expense) => post<Expense>('/expenses', data),
  },
};
