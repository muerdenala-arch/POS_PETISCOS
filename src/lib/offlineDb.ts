/**
 * offlineDb.ts
 * Capa de persistencia local usando IndexedDB (via idb).
 * Guarda ventas en una cola "pendingQueue" cuando no hay conexión o la red falla.
 * El SyncManager consume esta cola para enviarlas a Neon cuando haya internet.
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { Sale, Expense } from '@/types';

const DB_NAME = 'pos-template';
const DB_VERSION = 1;
const STORE_NAME = 'pendingQueue';

export interface PendingEntry {
  /** Mismo que sale.id o expense.id — se usa como keyPath */
  id: string;
  type: 'sale' | 'expense';
  sale?: Sale;
  expense?: Expense;
  /** Fecha en que se encoló, para ordenar y detectar entradas muy antiguas */
  enqueuedAt: string;
  /** Número de intentos fallidos de sync */
  retryCount: number;
}

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return _db;
}

/** Persiste una venta en la cola local. Idempotente: si ya existe, no duplica. */
export async function enqueueSale(sale: Sale): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.get(STORE_NAME, sale.id);
    if (existing) return; // ya está en cola, no duplicar
    const entry: PendingEntry = {
      id: sale.id,
      type: 'sale',
      sale,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al encolar venta:', err);
  }
}

/** Persiste un gasto en la cola local. */
export async function enqueueExpense(expense: Expense): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.get(STORE_NAME, expense.id);
    if (existing) return; 
    const entry: PendingEntry = {
      id: expense.id,
      type: 'expense',
      expense,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al encolar gasto:', err);
  }
}

/** Devuelve todas las ventas y gastos pendientes de sincronizar, ordenados por fecha. */
export async function getPendingQueue(): Promise<PendingEntry[]> {
  try {
    const db = await getDb();
    const all = await db.getAll(STORE_NAME) as PendingEntry[];
    return all.sort(
      (a, b) => new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime()
    );
  } catch (err) {
    console.error('[OfflineDB] Error al leer cola pendiente:', err);
    return [];
  }
}

/** Elimina una entrada de la cola tras sincronización exitosa con Neon. */
export async function removePendingEntry(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.error('[OfflineDB] Error al eliminar entrada:', err);
  }
}

/** Incrementa el contador de reintentos fallidos para una entrada. */
export async function incrementRetry(id: string): Promise<void> {
  try {
    const db = await getDb();
    const entry = await db.get(STORE_NAME, id) as PendingEntry | undefined;
    if (!entry) return;
    entry.retryCount += 1;
    await db.put(STORE_NAME, entry);
  } catch (err) {
    console.error('[OfflineDB] Error al actualizar reintento:', err);
  }
}

/** Devuelve cuántas ventas hay en la cola. 0 = todo sincronizado. */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count(STORE_NAME);
  } catch {
    return 0;
  }
}
