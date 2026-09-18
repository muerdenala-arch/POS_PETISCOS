/**
 * server.mjs — Servidor de desarrollo local para Plantilla POS
 *
 * Emula las funciones serverless de Vercel usando Express, con recarga en caliente
 * (--watch de Node) y cargando las variables de .env.local automáticamente.
 *
 * Uso: node --env-file=.env.local --watch server.mjs
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ── Importar los handlers de la API (ESM) ─────────────────────────────────────
// Node los recarga en caliente gracias a --watch.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3333;

async function main() {
  const app = express();

  // ── JSON body parser ─────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Cargar handlers de API dinámicamente (permite --watch) ───────────────────
  // Usamos una función helper que simula VercelRequest/VercelResponse con
  // los objetos nativos de Express (son compatibles para nuestros handlers).
  async function apiRouter(req, res) {
    // Extraer el nombre del recurso: /api/branches => branches
    const segment = req.path.replace(/^\/api\//, '').split('/')[0];

    // Mapa de rutas a archivos
    const routeMap = {
      branches: './api/branches.ts',
      products: './api/products.ts',
      toppings: './api/toppings.ts',
      staff: './api/staff.ts',
      'qr-codes': './api/qr-codes.ts',
      'register-sessions': './api/register-sessions.ts',
      sales: './api/sales.ts',
      upload: './api/upload.ts',
    };

    const filePath = routeMap[segment];
    if (!filePath) {
      return res.status(404).json({ error: `Ruta /api/${segment} no encontrada` });
    }

    try {
      // Cache-busting para que --watch recargue los módulos cambiados
      const modulePath = new URL(filePath + `?t=${Date.now()}`, import.meta.url).href;
      const mod = await import(modulePath);
      const handler = mod.default;

      // Adaptar req/res de Express al formato que espera el handler (VercelRequest ≈ Express)
      req.query = { ...req.query };
      await handler(req, res);
    } catch (err) {
      console.error(`[API Error] /api/${segment}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message ?? 'Error interno del servidor' });
      }
    }
  }

  // ── Montar router de API ─────────────────────────────────────────────────────
  app.all('/api/*', apiRouter);

  // ── Servidor Vite como middleware (HMR incluido) ──────────────────────────────
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  // ── Iniciar ──────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n  ✅ Plantilla POS — servidor local listo`);
    console.log(`  ➜  Local:  http://localhost:${PORT}/\n`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
