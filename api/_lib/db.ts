import { Pool, types, type QueryResultRow } from 'pg';

// node-postgres devuelve las columnas `numeric` como STRING por defecto (para no perder
// precisión con valores gigantes) — pero acá son montos de dinero que el frontend suma y
// resta como number (product.basePrice + size.priceDelta, etc.). Sin esto, "10.00" + 3
// da "10.003" en vez de 13. OID 1700 = numeric.
types.setTypeParser(1700, (value) => parseFloat(value));

// Un solo Pool por instancia "tibia" de la función serverless — Vercel reutiliza el
// proceso entre invocaciones consecutivas, así que crearlo a nivel de módulo evita abrir
// una conexión nueva contra Neon en cada request.
let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Falta la variable de entorno DATABASE_URL');
    }
    pool = new Pool({ connectionString, max: 5 });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const { rows } = await getPool().query<T>(text, params as unknown[]);
  return rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

type TxQuery = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<T[]>;

/** Para operaciones que deben ser atómicas (ej. "solo un QR activo por sucursal": apagar
 *  todos y prender uno en la misma transacción, sin ventana donde queden 0 o 2 activos). */
export async function withTransaction<T>(fn: (tx: TxQuery) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const tx: TxQuery = async (text, params) => (await client.query(text, params as unknown[])).rows;
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
