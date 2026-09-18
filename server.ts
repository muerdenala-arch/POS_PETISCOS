/**
 * server.ts — Servidor de desarrollo local para Plantilla POS
 *
 * Corre con: npx tsx --env-file=.env.local server.ts
 *
 * Emula las rutas serverless de Vercel con Express + Vite (como middleware con HMR).
 * Los handlers de /api son los mismos archivos .ts del proyecto, cargados directamente
 * con tsx sin ninguna compilación previa.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';

// ── Importar handlers de la API ──────────────────────────────────────────────
import branchesHandler from './api/branches.js';
import productsHandler from './api/products.js';
import toppingsHandler from './api/toppings.js';
import categoriesHandler from './api/categories.js';
import staffHandler from './api/staff.js';
import qrCodesHandler from './api/qr-codes.js';
import registerSessionsHandler from './api/register-sessions.js';
import salesHandler from './api/sales.js';
import uploadHandler from './api/upload.js';
import expensesHandler from './api/expenses.js';
import promotionsHandler from './api/promotions.js';
import couponsHandler from './api/coupons.js';

import type { Request, Response } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const PORT = 3334;

// Express req/res son compatibles con Vercel req/res para nuestros handlers
function adapt(handler: (req: VercelRequest, res: VercelResponse) => unknown) {
  return (req: Request, res: Response) =>
    handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
}

async function main() {
  const app = express();

  // ── Body parsers ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Rutas de la API ──────────────────────────────────────────────────────────
  app.all('/api/branches', adapt(branchesHandler));
  app.all('/api/branches/*', adapt(branchesHandler));
  app.all('/api/products', adapt(productsHandler));
  app.all('/api/products/*', adapt(productsHandler));
  app.all('/api/toppings', adapt(toppingsHandler));
  app.all('/api/toppings/*', adapt(toppingsHandler));
  app.all('/api/categories', adapt(categoriesHandler));
  app.all('/api/categories/*', adapt(categoriesHandler));
  app.all('/api/staff', adapt(staffHandler));
  app.all('/api/staff/*', adapt(staffHandler));
  app.all('/api/qr-codes', adapt(qrCodesHandler));
  app.all('/api/qr-codes/*', adapt(qrCodesHandler));
  app.all('/api/register-sessions', adapt(registerSessionsHandler));
  app.all('/api/register-sessions/*', adapt(registerSessionsHandler));
  app.all('/api/sales', adapt(salesHandler));
  app.all('/api/sales/*', adapt(salesHandler));
  app.all('/api/upload', adapt(uploadHandler));
  app.all('/api/expenses', adapt(expensesHandler));
  app.all('/api/expenses/*', adapt(expensesHandler));
  app.all('/api/promotions', adapt(promotionsHandler));
  app.all('/api/promotions/*', adapt(promotionsHandler));
  app.all('/api/coupons', adapt(couponsHandler));
  app.all('/api/coupons/*', adapt(couponsHandler));

  // ── Vite como middleware (sirve el frontend con HMR) ─────────────────────────
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    // No escuchar en su propio puerto — usamos el de Express
  });

  app.use(vite.middlewares);

  // ── Lanzar servidor ──────────────────────────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ✅ Plantilla POS — Servidor local listo`);
    console.log(`  ➜  http://localhost:${PORT}/`);
    console.log(`  ➜  Red: http://0.0.0.0:${PORT}/\n`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
