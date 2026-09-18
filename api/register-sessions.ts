import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { CashRegisterSession } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, cashier_id as "cashierId", cashier_name as "cashierName", branch_id as "branchId",
  opened_at as "openedAt", closed_at as "closedAt", opening_amount as "openingAmount",
  closing_amount_counted as "closingAmountCounted", expected_amount as "expectedAmount",
  difference, sales_total as "salesTotal", sales_count as "salesCount",
  cash_sales_total as "cashSalesTotal", qr_sales_total as "qrSalesTotal", status, notes
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    // Mismo recorte que /api/sales: sin esto la tabla crece sin límite (una fila por cada
    // apertura/cierre de caja, para siempre) y el poll de 6s la baja entera cada vez —
    // cuantas más sesiones se acumulen, más lento el JSON.stringify de sameData() en cada
    // tick, lo que se siente como lag general de la UI (clicks que tardan en reaccionar).
    const sessions = await query<CashRegisterSession>(
      `select ${SELECT_COLUMNS} from register_sessions order by opened_at desc limit 500`,
    );
    res.status(200).json(sessions);
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<CashRegisterSession>(req);
    const rows = await query<CashRegisterSession>(
      `insert into register_sessions (id, cashier_id, cashier_name, branch_id, opening_amount, notes)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing
       returning ${SELECT_COLUMNS}`,
      [body.id, body.cashierId, body.cashierName, body.branchId, body.openingAmount ?? 0, body.notes ?? null],
    );
    res.status(201).json(rows[0]);
    return;
  }

  if (req.method === 'PATCH' && id) {
    // Único uso real: cerrar la caja. Se calcula la diferencia acá mismo con los valores
    // que llegan, igual que hacía el store local antes.
    const body = requireBody<{
      closingAmountCounted: number;
      expectedAmount: number;
      salesTotal: number;
      salesCount: number;
      cashSalesTotal: number;
      qrSalesTotal: number;
      notes?: string;
    }>(req);
    const difference = body.closingAmountCounted - body.expectedAmount;
    const session = await queryOne<CashRegisterSession>(
      `update register_sessions set
         status = 'cerrada',
         closed_at = now(),
         closing_amount_counted = $2,
         expected_amount = $3,
         difference = $4,
         sales_total = $5,
         sales_count = $6,
         cash_sales_total = $7,
         qr_sales_total = $8,
         notes = coalesce($9, notes)
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [
        id,
        body.closingAmountCounted,
        body.expectedAmount,
        difference,
        body.salesTotal,
        body.salesCount,
        body.cashSalesTotal,
        body.qrSalesTotal,
        body.notes ?? null,
      ],
    );
    if (!session) {
      res.status(404).json({ error: 'Sesión de caja no encontrada' });
      return;
    }
    res.status(200).json(session);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
}

export default withErrorHandling(handler);
