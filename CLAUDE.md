# Petiscos_POS

Sistema de Punto de Venta (POS) para la gestión de un negocio de petiscos: ventas rápidas, control de caja, roles de personal, productos/categorías/toppings, cupones y promociones, sesiones de caja registradora y reportes.

Estado: el sistema está prácticamente terminado. Solo quedan pendientes modificaciones puntuales.

## Estructura de carpetas

- `src/` — Frontend (React + Vite + TypeScript)
  - `components/` — Componentes de UI (pos, admin, layout, receipt, ui)
  - `pages/` — Páginas de la app, incluyendo `pages/admin/`
  - `router/` — Definición de rutas del frontend
  - `store/` — Estado global (Zustand)
  - `hooks/`, `lib/`, `config/`, `types/`, `data/`, `assets/`
- `api/` — Backend serverless (funciones Vercel/Express): `branches`, `categories`, `coupons`, `expenses`, `products`, `promotions`, `qr-codes`, `register-sessions`, `sales`, `staff`, `toppings`, `upload`, y utilidades compartidas en `api/_lib/`
- `schema.sql` — Esquema de la base de datos PostgreSQL (Neon)
- `scripts/` — Scripts utilitarios, incluyendo `run_schema.ts` para aplicar el esquema a la base de datos
- `server.ts` / `server.mjs` — Servidor local para desarrollo con backend integrado
- `public/` — Archivos estáticos servidos tal cual

## Comandos importantes

- `npm run dev` — Levanta el frontend con Vite (desarrollo)
- `npm run dev:local` — Levanta el servidor local (`server.ts`) usando variables de `.env.local`
- `npm run dev:full` — Levanta el entorno completo con `vercel dev` (frontend + funciones API)
- `npm run build` — Compila TypeScript y genera el build de producción con Vite
- `npm run preview` — Sirve el build de producción localmente
- `npm run lint` — Corre ESLint sobre el proyecto
- `npx tsx scripts/run_schema.ts` — Aplica `schema.sql` a la base de datos configurada en `.env.local`

Nota: el proyecto no tiene actualmente scripts `npm start`, `npm test` ni `npm run db:setup` configurados en `package.json`; los comandos equivalentes reales son los listados arriba.
