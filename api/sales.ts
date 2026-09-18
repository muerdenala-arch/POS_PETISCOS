import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Sale, CashRegisterSession } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, ticket_number as "ticketNumber", items, subtotal,
  subtotal_before_discount as "subtotalBeforeDiscount",
  discount_amount as "discountAmount", discount_type as "discountType",
  coupon_code as "couponCode",
  total, payment,
  cashier_id as "cashierId", cashier_name as "cashierName",
  register_session_id as "registerSessionId", branch_id as "branchId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { action, startDate, endDate, branchId } = req.query;

    if (action === 'reports') {
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (end.getHours() === 0 && end.getMinutes() === 0) {
        end.setHours(23, 59, 59, 999);
      }

      const startOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

      const startOfYear = new Date(start.getFullYear(), 0, 1);
      const endOfYear = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);

      const startOfWeek = new Date(start);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const branchFilter = branchId && branchId !== 'all' ? `AND branch_id = $3` : '';
      const params: (string | number)[] = [start.toISOString(), end.toISOString()];
      if (branchId && branchId !== 'all') {
        params.push(branchId as string);
      }

      const sales = await query<Sale>(
        `SELECT ${SELECT_COLUMNS} FROM sales WHERE created_at >= $1 AND created_at <= $2 ${branchFilter} ORDER BY created_at DESC`,
        params
      );

      const sessions = await query<CashRegisterSession>(
        `SELECT id, cashier_id as "cashierId", cashier_name as "cashierName", branch_id as "branchId",
          opened_at as "openedAt", closed_at as "closedAt", opening_amount as "openingAmount",
          closing_amount_counted as "closingAmountCounted", expected_amount as "expectedAmount",
          difference, sales_total as "salesTotal", sales_count as "salesCount",
          cash_sales_total as "cashSalesTotal", qr_sales_total as "qrSalesTotal", status, notes
         FROM register_sessions WHERE ((opened_at >= $1 AND opened_at <= $2) OR (closed_at IS NULL AND opened_at <= $2)) ${branchFilter} ORDER BY opened_at DESC`,
        params
      );

      const monthlyParams: (string | number)[] = [startOfMonth.toISOString(), endOfMonth.toISOString()];
      const weeklyParams: (string | number)[] = [startOfWeek.toISOString(), endOfWeek.toISOString()];
      const yearlyParams: (string | number)[] = [startOfYear.toISOString(), endOfYear.toISOString()];
      
      if (branchId && branchId !== 'all') {
        const branchIdStr = branchId as string;
        monthlyParams.push(branchIdStr);
        weeklyParams.push(branchIdStr);
        yearlyParams.push(branchIdStr);
      }

      const [monthlyResult, weeklyResult, yearlyResult, discountsResult, expensesDaily, expensesWeekly, expensesMonthly, expensesYearly] = await Promise.all([
        query<{ sum: number }>(`SELECT COALESCE(SUM(total), 0) as sum FROM sales WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, monthlyParams),
        query<{ sum: number }>(`SELECT COALESCE(SUM(total), 0) as sum FROM sales WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, weeklyParams),
        query<{ sum: number }>(`SELECT COALESCE(SUM(total), 0) as sum FROM sales WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, yearlyParams),
        query<{ sum: number }>(`SELECT COALESCE(SUM(discount_amount), 0) as sum FROM sales WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, params),
        query<{ sum: number }>(`SELECT COALESCE(SUM(amount), 0) as sum FROM expenses WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, params),
        query<{ sum: number }>(`SELECT COALESCE(SUM(amount), 0) as sum FROM expenses WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, weeklyParams),
        query<{ sum: number }>(`SELECT COALESCE(SUM(amount), 0) as sum FROM expenses WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, monthlyParams),
        query<{ sum: number }>(`SELECT COALESCE(SUM(amount), 0) as sum FROM expenses WHERE created_at >= $1 AND created_at <= $2 ${branchFilter}`, yearlyParams),
      ]);

      const monthlyTotal = Number(monthlyResult[0]?.sum) || 0;
      const weeklyTotal = Number(weeklyResult[0]?.sum) || 0;
      const yearlyTotal = Number(yearlyResult[0]?.sum) || 0;
      const totalDiscounts = Number(discountsResult[0]?.sum) || 0;
      
      const dailyExpenses = Number(expensesDaily[0]?.sum) || 0;
      const weeklyExpenses = Number(expensesWeekly[0]?.sum) || 0;
      const monthlyExpenses = Number(expensesMonthly[0]?.sum) || 0;
      const yearlyExpenses = Number(expensesYearly[0]?.sum) || 0;

      res.status(200).json({
        sales,
        sessions,
        monthlyTotal,
        weeklyTotal,
        yearlyTotal,
        totalDiscounts,
        dailyExpenses,
        weeklyExpenses,
        monthlyExpenses,
        yearlyExpenses
      });
      return;
    }

    // Default GET sales logic
    // Optimización de rendimiento: Para evitar que el sistema se vuelva lento o
    // consuma mucho ancho de banda al tener miles de ventas históricas, el POS 
    // principal solo necesita sincronizar las ventas recientes (para calcular 
    // cajas abiertas). Solo descargamos los últimos 5 días.
    const sales = await query<Sale>(
      `select ${SELECT_COLUMNS} from sales where created_at >= NOW() - INTERVAL '5 days' order by created_at desc`
    );
    res.status(200).json(sales);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<Omit<Sale, 'ticketNumber'>>(req);

    const rows = await withTransaction(async (tx) => {
      // Idempotencia: si el id ya existe (reintento de la cola offline),
      // retornar la venta existente con 409 para que el SyncManager la trate como éxito.
      const existing = await tx<Sale>(
        `SELECT ${SELECT_COLUMNS} FROM sales WHERE id = $1`,
        [body.id]
      );
      if (existing.length > 0) {
        res.status(409).json(existing[0]);
        return null;
      }

      // Quemar el cupón atómicamente si fue utilizado en esta venta
      if (body.couponCode) {
        const coupons = await tx<{ id: string; used_count: number; max_uses: number }>(
          `SELECT id, used_count, max_uses FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = true FOR UPDATE`,
          [body.couponCode]
        );
        const coupon = coupons[0];
        if (!coupon) {
          throw new Error('Cupón inválido o ya agotado.');
        }
        const newCount = coupon.used_count + 1;
        const willBeExhausted = newCount >= coupon.max_uses;
        await tx(
          `UPDATE coupons SET used_count = $2, is_active = $3, updated_at = NOW() WHERE id = $1`,
          [coupon.id, newCount, !willBeExhausted]
        );
      }

      return tx<Sale>(
        `INSERT INTO sales (
           id, items, subtotal, subtotal_before_discount, discount_amount, discount_type, coupon_code,
           total, payment, cashier_id, cashier_name, register_session_id, branch_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING ${SELECT_COLUMNS}`,
        [
          body.id,
          JSON.stringify(body.items),
          body.subtotal,
          body.subtotalBeforeDiscount ?? body.subtotal,
          body.discountAmount ?? 0,
          body.discountType ?? 'NONE',
          body.couponCode ?? null,
          body.total,
          JSON.stringify(body.payment),
          body.cashierId,
          body.cashierName,
          body.registerSessionId,
          body.branchId,
        ]
      );
    });

    if (!rows) return; // 409 ya enviado arriba
    res.status(201).json(rows[0]);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
