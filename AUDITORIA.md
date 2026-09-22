# Auditoría del sistema Petiscos_POS

Fecha: 2026-09-22 (actualizado el mismo día tras implementar la corrección de autenticación)
Alcance: `api/` (backend serverless), `schema.sql` (base de datos), `src/` (frontend React), `server.ts`/`server.mjs`, `package.json`/dependencias.

## Resumen ejecutivo

El sistema funciona y está bien resuelto en varias áreas (sincronización offline con reintentos e idempotencia, transacciones atómicas para operaciones críticas como el cupón y el QR activo, manejo de precisión numérica en Postgres). El hallazgo más grave era **la ausencia total de autenticación y autorización del lado del servidor** (sección 5) — ya fue corregido, ver "Autenticación implementada" al final del documento.

Se corrigieron 6 problemas de bajo riesgo (bugs y fugas de información) más el rediseño completo de autenticación.

---

## 1. Estructura del proyecto

- `src/` — Frontend Vite + React + TypeScript (components, pages, store con Zustand, hooks, lib, router, types).
- `api/` — 12 funciones serverless (Vercel), cada una resolviendo colección + item (`?id=`) en un solo archivo por el límite de 12 funciones del plan Hobby.
- `api/_lib/` — utilidades compartidas: conexión a Postgres (`db.ts`), helpers HTTP (`http.ts`), subida de imágenes (`cloudinary.ts`).
- `schema.sql` — esquema Postgres (Neon), re-ejecutable de forma segura (`IF NOT EXISTS`).
- `scripts/run_schema.ts` — aplica `schema.sql` a la base configurada en `.env.local`.
- `server.ts` y `server.mjs` — **dos** servidores locales redundantes (ver hallazgo 8.1).

No hay separación tipo MVC (controllers/models/views) — es intencional dado el modelo serverless de Vercel; cada archivo en `api/` cumple el rol de controlador + acceso a datos.

## 2. Lógica de negocio en los "controladores" (`api/*.ts`)

Revisados los 12 endpoints. Patrones correctos observados:
- `sales.ts`: quema el cupón dentro de una transacción con `FOR UPDATE` (bloqueo de fila) antes de insertar la venta — evita condición de carrera si dos cajeros usan el mismo cupón al mismo tiempo.
- `qr-codes.ts`: activar un QR apaga los demás de la misma sucursal dentro de una transacción — no deja estados intermedios.
- `sales.ts` / `expenses.ts`: patrón de idempotencia explícito (si el `id` ya existe, devuelve 409 con el registro existente) pensado para los reintentos de la cola offline.

Problema de integridad de negocio (no corregido, requiere decisión):
- **`sales.ts` acepta `subtotal`, `discountAmount` y `total` directamente del cliente, sin recalcularlos ni validarlos contra los precios reales de `products`/`toppings`/promociones en la base.** Cualquiera que pueda llamar al endpoint (ver sección 5, no hay autenticación) puede registrar una venta con el total que quiera. Esto es un problema de integridad financiera, no solo de seguridad.

## 3. Validaciones en las rutas

Inconsistentes entre endpoints:
- `categories.ts` valida que `name` esté presente antes de insertar; `branches.ts`, `products.ts`, `promotions.ts`, `toppings.ts` no validan campos obligatorios y confían en las restricciones `NOT NULL` de Postgres para fallar (lo que termina como un 500 genérico en vez de un 400 claro).
- `expenses.ts` sí valida explícitamente los campos requeridos (`id`, `amount`, `concept`, `category`, `userId`) — es el único endpoint que lo hace de forma completa.
- Ningún endpoint valida rangos (p. ej. montos negativos en `sales`, `expenses`, `register-sessions`; `discountValue` negativo o mayor a 100% en cupones/promociones).
- `sales.ts` (reporte) no valida que `startDate`/`endDate` sean fechas válidas; un valor inválido produce `Invalid Date` y una consulta silenciosamente vacía o incorrecta, sin error visible.

## 4. Manejo de errores

- `api/_lib/http.ts` centraliza bien el catch-all (`withErrorHandling`), pero **expone `err.message` crudo al cliente en cualquier 500**. Es intencional para mensajes de negocio ("Cupón inválido...") pero como no hay una clase de error dedicada para distinguir "mensaje seguro de mostrar" vs. "error interno", cualquier excepción de Postgres (nombres de restricciones, columnas, etc.) también se filtra tal cual al navegador.
- **Corregido:** `branches.ts`, `categories.ts` y `toppings.ts` en sus DELETE devolvían `{ error: ..., details: error }`, serializando el objeto de error de Postgres completo (potencialmente con detalles internos) al cliente. Se quitó `details` y se dejó que `withErrorHandling` normalice la respuesta.

Recomendación pendiente: introducir una clase `HttpError(status, message)` y lanzarla explícitamente para los mensajes que sí deben llegar al usuario; todo `Error` genérico no capturado debería responder un mensaje fijo ("Error interno del servidor") en producción y loguear el detalle solo en el servidor.

## 5. Seguridad en la autenticación — CRÍTICO

**No existe autenticación ni autorización del lado del servidor. Ninguno de los 12 endpoints verifica quién hace la petición ni con qué rol.**

Cadena del problema:
1. `schema.sql`: `staff.pin` es `text NOT NULL UNIQUE` — el PIN se guarda **en texto plano**, sin hash.
2. `GET /api/staff` (sin ningún filtro de autenticación) devuelve la lista completa de personal **incluyendo el PIN de cada usuario, admins incluidos** (`api/staff.ts`, `SELECT_COLUMNS` incluye `pin`).
3. `src/store/authStore.ts`: el login (`loginWithPin`) compara el PIN ingresado contra la lista de staff **ya descargada al navegador**, enteramente en JavaScript del cliente. No hay ningún endpoint tipo `/api/auth/login` que verifique el PIN en el servidor.
4. `src/router/RequireAuth.tsx`: protege únicamente las rutas de React Router. No protege la API — cualquiera puede saltarse la UI y llamar `POST/PATCH/DELETE /api/*` directamente (con curl, Postman, DevTools) sin sesión ni rol alguno.

Impacto concreto: cualquier persona con la URL del sitio puede, sin loguearse:
- Ver el PIN de todos los empleados y del admin (`GET /api/staff`).
- Crear/editar/borrar productos, sucursales, cupones, promociones, staff, sesiones de caja y ventas.
- Borrar una sucursal completa junto con su historial de ventas (`DELETE /api/branches?id=`).

Esto no se corrigió automáticamente porque no es un parche puntual: arreglarlo bien implica decisiones de diseño (mecanismo de sesión — cookie firmada vs. JWT; si el PIN se hashea con bcrypt hay que migrar los PINs existentes; y agregar un middleware de rol a los 12 endpoints, especialmente restringiendo `staff`, `branches`, `products` (escritura), `coupons`, `promotions` a rol `admin`). Es un cambio de alto impacto sobre un sistema en producción con datos reales.

**Recomendación concreta (para decidir, no aplicada):**
1. Nuevo endpoint `POST /api/auth/login` que reciba el PIN, lo compare contra un hash (`bcrypt`) en el servidor, y devuelva una cookie de sesión `httpOnly` (o JWT) — nunca la lista de PINs al cliente.
2. Quitar `pin` de cualquier respuesta de `GET /api/staff`; el login deja de depender de tener todos los PINs en el navegador.
3. Middleware compartido en `api/_lib/` que lea la sesión y exponga `req.user`, usado por todos los endpoints; los de escritura (`POST`/`PATCH`/`DELETE`) en `staff`, `branches`, `products`, `toppings`, `coupons`, `promotions`, `categories` deberían exigir rol `admin`.
4. Migración de los PINs existentes en `staff.pin` a hashes.

## 6. Integridad de la base de datos (`schema.sql`)

- Buen uso de `CHECK` para enums en `staff.role`, `staff.status`, `register_sessions.status` — pero **no** en `promotions.discount_type`, `coupons.discount_type`, `promotions.applies_to`, `coupons.applies_to` (son `text` libres, sin restricción), inconsistente con el resto.
- **Sin restricciones de no-negatividad** en columnas monetarias (`sales.total`, `sales.subtotal`, `expenses.amount`, `register_sessions.opening_amount`, etc.) — sumado a la falta de validación en el endpoint (sección 2/3), nada impide un monto negativo en la base.
- Índices razonables para las consultas de reportes (`idx_sales_created_at`, `idx_register_sessions_*`, etc.).
- `expenses.cash_register_id` vs `sales.register_session_id`: dos columnas que apuntan al mismo concepto (una sesión de caja) con nombres distintos — ver hallazgo de nomenclatura (sección 7).
- `sales.coupon_code` no tiene FK hacia `coupons.code` (es solo texto descriptivo) — aceptable, pero no documentado como decisión.

## 7. Consistencia de nombres de variables y funciones

- `cash_register_id` (en `expenses`) vs `register_session_id` (en `sales`) — mismo concepto, nombre distinto en la misma base de datos.
- El campo de imagen de un QR se llama `image_url` en la base y se expone como `"image"` en la API (`api/qr-codes.ts`), mientras que el mismo concepto en `products` se expone como `"imageUrl"` — inconsistente entre recursos.
- El chequeo de "violación de PIN/código único" (Postgres error 23505) estaba **duplicado con distinta implementación** en `staff.ts`, `coupons.ts` y `categories.ts`. Se unificó (ver sección 9).

## 8. Dependencias instaladas

- `npm audit` inicial: 5 vulnerabilidades moderadas en dependencias de producción/build (`qs`/`body-parser`/`express`, `react-router`/`react-router-dom`) — **corregidas** con `npm audit fix` (sin cambios de versión mayor, `npm run build` y `tsc -b` verificados después, sin errores).
- Vulnerabilidades restantes (34, varias altas/críticas) están **todas** dentro de dependencias internas de la CLI `vercel` (paquete de desarrollo, usado solo para `vercel dev`/deploy local) — arreglarlas requiere `npm audit fix --force` e instalar `vercel@54` (breaking change). No se aplicó por el riesgo de romper el flujo de deploy; queda como recomendación a evaluar aparte, no afecta el código que corre en producción.
- Todas las dependencias declaradas en `package.json` están en uso (verificado por referencia real en el código) — no se encontraron paquetes muertos.

## 9. Código redundante o ineficiente

- **Corregido:** función `isUniquePinViolation`/chequeo inline del código de error `23505` duplicado en 3 archivos → extraído a `isUniqueViolation()` en `api/_lib/http.ts`, reutilizado en `staff.ts`, `coupons.ts`, `categories.ts`.
- **`server.ts` y `server.mjs` son dos implementaciones paralelas del mismo servidor de desarrollo local.** Solo `server.ts` está referenciado en `package.json` (`npm run dev:local`); `server.mjs` no aparece en ningún script y su mapa de rutas está desactualizado (le faltan `categories`, `expenses`, `promotions`, `coupons` — daría 404 en esas rutas si alguien lo usara). Recomendación: eliminar `server.mjs` si ya no se usa manualmente, para no mantener dos versiones divergentes.
- Los 9 endpoints CRUD (`branches`, `categories`, `products`, `toppings`, `promotions`, `coupons`, `staff`, `qr-codes`, `register-sessions`) repiten el mismo patrón GET/POST/PATCH/DELETE con `SELECT_COLUMNS`, `requireBody`, `on conflict do update`. No es un bug, pero es candidato a una factoría genérica de handler CRUD si se agregan más recursos — no se tocó por ser un cambio de estilo, no de corrección.
- `vite build` reporta un chunk de 517 KB (>500 KB) sin code-splitting — no es un error, pero afecta el tiempo de carga inicial en conexiones lentas. Recomendación: `React.lazy()` para las páginas de `admin/`, que no las necesita el flujo de cajero.
- 2 warnings de ESLint (`react-hooks/exhaustive-deps`) en `CashAuditPage.tsx:35` y `ReportsPage.tsx:102` — dependencias de hooks incompletas, riesgo bajo de datos desactualizados en esos cálculos memoizados.

---

## Correcciones aplicadas en esta auditoría

| Archivo | Cambio |
|---|---|
| `api/_lib/http.ts` | Nuevo helper `isUniqueViolation()` compartido |
| `api/staff.ts` | Usa el helper compartido (elimina duplicado) |
| `api/coupons.ts` | Usa el helper compartido |
| `api/categories.ts` | Usa el helper compartido; ya no filtra el error crudo de Postgres en el DELETE |
| `api/branches.ts` | El DELETE ya no filtra el objeto de error crudo al cliente |
| `api/toppings.ts` | El DELETE ya no filtra el objeto de error crudo al cliente |
| `api/register-sessions.ts` | Corregido bug: un reintento offline de apertura de caja ya no devuelve 201 con cuerpo vacío; ahora devuelve la sesión existente (409), igual que `sales.ts`/`expenses.ts` |
| `package-lock.json` | `npm audit fix` — 5 vulnerabilidades moderadas corregidas (qs/express, react-router) |

Verificado después de los cambios: `npx tsc -b` sin errores, `npm run build` exitoso, `npm run lint` sin errores nuevos.

## Autenticación implementada (2026-09-22)

Se corrigió el hallazgo crítico de la sección 5. Resumen de lo que cambió:

- **`api/_lib/auth.ts` (nuevo):** hash de PIN con `bcryptjs`; sesión firmada con HMAC-SHA256 (cookie `pos_session`, `httpOnly`, `SameSite=Lax`, 12h) — sin depender de `jsonwebtoken`, solo `node:crypto`. `requireAuth()` exige sesión válida en cada endpoint.
- **`POST /api/staff?action=login`** (nuevo, dentro de `staff.ts` para no sumar una función serverless más — el plan Hobby de Vercel limita a 12): compara el PIN contra el hash en el servidor, uno por uno; nunca se envía la lista de PINs al navegador. `POST /api/staff?action=login`/`?action=logout` son las únicas rutas públicas; todo lo demás exige sesión.
- **`GET /api/staff`** ya no incluye la columna `pin` en ningún caso — ni en texto plano ni hasheada.
- **Autorización por rol** en los 12 endpoints: lectura (`GET`) requiere solo sesión válida; creación/edición/borrado de `staff`, `branches`, `products`, `toppings`, `promotions`, `coupons`, `categories`, `qr-codes` y los reportes financieros (`GET /api/sales?action=reports`) exigen rol `admin`. `register-sessions`, `sales` (venta normal) y `expenses` aceptan cualquier rol autenticado (flujo normal de cajero).
- **`scripts/hash_existing_pins.ts`** (nuevo, ya ejecutado contra la base real): migró los PIN existentes de texto plano a hash bcrypt — idempotente, seguro de volver a correr.
- **Frontend:** `loginWithPin` ahora llama al servidor (`authStore.ts`) en vez de comparar contra una lista de PINs descargada; `useDataSync`/`App.tsx` ya no sincronizan ningún dato hasta que hay sesión (antes se descargaba todo, PINs incluidos, antes de loguearse); se agregó manejo global de 401 (cierra sesión local si la cookie expira) en `src/lib/api.ts`; se quitó la función "revelar PIN" del panel de personal (`StaffRow.tsx`) porque ya no es técnicamente posible — solo queda "restablecer PIN" (generar uno nuevo).
- **Nueva variable de entorno `SESSION_SECRET`** (agregada a `.env`, `.env.local`, `.env.example`) — **falta agregarla en Vercel** (Settings → Environment Variables) antes de que el próximo deploy a producción funcione.

Verificado en un servidor local real (`npm run dev:local`, `.claude/launch.json` agregado para poder levantarlo desde el navegador integrado): sin cookie cualquier endpoint responde 401; un cajero de prueba pudo leer productos y crear una venta pero recibió 403 al intentar crear una sucursal o ver reportes; un admin de prueba pudo ver reportes; el login con PIN incorrecto respondió 401 con el mensaje esperado y el correcto abrió sesión y sincronizó el panel; cerrar sesión invalidó la cookie del lado del servidor. Los usuarios de prueba se crearon y borraron directamente en la base para no depender de credenciales reales del negocio. `npx tsc -b`, `npm run build` y `npm run lint` sin errores nuevos.

## Segunda ronda de correcciones (2026-09-22)

Se resolvió el resto de la lista pendiente:

- **Validación server-side de montos de venta (`api/_lib/pricing.ts`, nuevo).** `POST /api/sales` ya no confía en `subtotal`/`discountAmount`/`total` del cliente: recalcula cada ítem desde el catálogo real (producto, tamaño, topping, promoción vigente — misma fórmula que `cartStore.ts`/`promotionStore.ts`, portada al servidor) y el descuento del cupón (misma fórmula que `couponStore.ts`, pero usando la categoría real del producto en la base, no la que declare el cliente, para que no se pueda falsear la categoría y colar un producto en un cupón que no le corresponde). Si el total recalculado no coincide con el enviado (tolerancia de 0,01 Bs por redondeo), la venta se rechaza. Probado con curl contra datos reales: venta legítima aceptada; producto con precio falseado rechazado; producto inexistente rechazado; total negativo rechazado; el reintento idempotente (offline) sigue devolviendo 409 con la venta ya guardada, sin verse afectado.
- **Sesiones ahora se revalidan contra la base en cada request (`api/_lib/auth.ts`).** La cookie firmada por sí sola dura 12h; antes de esto, bloquear/eliminar a alguien (o cambiarle el rol) no tenía efecto hasta que la cookie expirara. Ahora cada request confirma que el usuario sigue existiendo y activo, y usa su rol *actual* de la base, no el que tenía al momento del login. Probado: sesión de un usuario bloqueado a mitad de uso pasa a responder 401 en la siguiente request.
- **Restricciones `CHECK`** agregadas a `schema.sql` (montos no negativos en `sales`, `expenses`, `products`, `toppings`, `register_sessions`; enums válidos para `discount_type` en `sales`/`promotions`/`coupons`). Aplicadas contra la base real; se verificó primero que no había datos existentes que las violaran, y que el archivo sigue siendo seguro de re-ejecutar.
- **Nombres unificados:** `expenses.cash_register_id` → `register_session_id` (igual que en `sales`; migrado con `ALTER TABLE RENAME COLUMN` idempotente) y `QrCode.image` → `imageUrl` (igual que `Product.imageUrl`), actualizados en la API, el tipo y los 4 componentes que lo usaban.
- **`server.mjs` eliminado** (duplicado desactualizado de `server.ts`, no referenciado por ningún script).
- **Code-splitting del panel de admin:** las 9 páginas de `/admin/*` ahora se cargan con `React.lazy()` en vez de ir en el bundle principal. El chunk inicial bajó de 518 KB a 407 KB (gzip: 150 KB → 127 KB), y ya no dispara el warning de Vite por tamaño.
- **2 warnings de ESLint corregidos** (`CashAuditPage.tsx`, `ReportsPage.tsx`) sin cambiar el comportamiento (se evitó agregar `sales` a un `useEffect` que la actualiza, lo que hubiera creado un loop de refetch).

No se tocó, a propósito: `npm audit fix --force` sobre la CLI de `vercel` (herramienta de desarrollo, no código de producción) — instala `vercel@54` con cambios incompatibles; requeriría probar el flujo de deploy aparte antes de aceptarlo.

Verificado después de todo lo anterior: `npx tsc -b`, `npm run build` y `npm run lint` sin errores ni warnings.
