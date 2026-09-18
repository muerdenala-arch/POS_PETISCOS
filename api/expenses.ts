import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Expense } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, amount, concept, category,
  cash_register_id as "cashRegisterId",
  branch_id as "branchId",
  user_id as "userId",
  created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const expenses = await query<Expense>(
      `SELECT ${SELECT_COLUMNS} FROM expenses ORDER BY created_at DESC`
    );
    res.status(200).json(expenses);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<Expense>(req);

    if (!body.id || !body.amount || !body.concept || !body.category || !body.userId) {
      res.status(400).json({ error: 'Faltan campos requeridos en el gasto.' });
      return;
    }

    // Idempotencia: si el gasto ya existe (reintento de la cola offline),
    // retornar el existente con 409 para que el SyncManager lo trate como éxito.
    const existing = await query<Expense>(
      `SELECT ${SELECT_COLUMNS} FROM expenses WHERE id = $1`,
      [body.id]
    );
    if (existing.length > 0) {
      res.status(409).json(existing[0]);
      return;
    }

    const rows = await query<Expense>(
      `INSERT INTO expenses (id, amount, concept, category, cash_register_id, branch_id, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${SELECT_COLUMNS}`,
      [body.id, body.amount, body.concept, body.category, body.cashRegisterId || null, body.branchId || null, body.userId, body.createdAt || new Date().toISOString()]
    );

    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
