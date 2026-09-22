-- ============================================================================
-- Plantilla POS — esquema de base de datos (Neon / PostgreSQL)
-- ============================================================================
-- Todos los precios en Bs (Bolivianos bolivianos).
-- Es seguro volver a correr este archivo completo:
-- IF NOT EXISTS / ON CONFLICT DO NOTHING no duplica ni borra datos existentes.
-- ============================================================================

-- ── Sucursales ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  address    text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  active     boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Personal / cajeros ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  pin         text NOT NULL UNIQUE,
  role        text NOT NULL CHECK (role IN ('admin', 'cajero')),
  color       text NOT NULL DEFAULT 'bg-primary-500',
  status      text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'bloqueado')),
  protected   boolean NOT NULL DEFAULT false,
  branch_ids  jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Toppings / Extras ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS toppings (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  price_extra         numeric(10, 2) NOT NULL DEFAULT 0,
  branch_ids          jsonb NOT NULL DEFAULT '[]',
  stock_by_branch     jsonb NOT NULL DEFAULT '{}',
  low_stock_threshold integer NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Categorias de Productos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         text PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Catalogo de productos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  category             text NOT NULL,
  description          text NOT NULL DEFAULT '',
  base_price           numeric(10, 2) NOT NULL DEFAULT 0,
  gradient             text NOT NULL DEFAULT '',
  emoji                text NOT NULL DEFAULT '',
  image_url            text NOT NULL DEFAULT '',
  sizes                jsonb NOT NULL DEFAULT '[]',

  topping_ids          jsonb NOT NULL DEFAULT '[]',
  branch_ids           jsonb NOT NULL DEFAULT '[]',
  active               boolean NOT NULL DEFAULT true,
  stock_by_branch      jsonb NOT NULL DEFAULT '{}',
  low_stock_threshold  integer NOT NULL DEFAULT 0,
  unit                 text NOT NULL DEFAULT 'unidades',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Codigos QR de cobro ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_codes (
  id             text PRIMARY KEY,
  alias          text NOT NULL,
  bank_or_holder text NOT NULL DEFAULT '',
  image_url      text NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  branch_id      text NOT NULL REFERENCES branches (id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Aperturas / cierres de caja ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS register_sessions (
  id                     text PRIMARY KEY,
  cashier_id             text NOT NULL,
  cashier_name           text NOT NULL,
  branch_id              text NOT NULL REFERENCES branches (id),
  opened_at              timestamptz NOT NULL DEFAULT now(),
  closed_at              timestamptz,
  opening_amount         numeric(10, 2) NOT NULL DEFAULT 0,
  closing_amount_counted numeric(10, 2),
  expected_amount        numeric(10, 2),
  difference             numeric(10, 2),
  sales_total            numeric(10, 2),
  sales_count            integer,
  cash_sales_total       numeric(10, 2),
  qr_sales_total         numeric(10, 2),
  status                 text NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada')),
  notes                  text
);

-- Numero de ticket correlativo y atomico entre todos los dispositivos.
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1001;

-- ── Ventas ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id                        text PRIMARY KEY,
  ticket_number             integer NOT NULL DEFAULT nextval('ticket_number_seq'),
  items                     jsonb NOT NULL,
  subtotal                  numeric(10, 2) NOT NULL,
  subtotal_before_discount  numeric(10, 2) NOT NULL DEFAULT 0,
  discount_amount           numeric(10, 2) NOT NULL DEFAULT 0,
  discount_type             text NOT NULL DEFAULT 'NONE',
  coupon_code               text,
  total                     numeric(10, 2) NOT NULL,
  payment                   jsonb NOT NULL,
  cashier_id                text NOT NULL,
  cashier_name              text NOT NULL,
  register_session_id       text NOT NULL REFERENCES register_sessions (id),
  branch_id                 text NOT NULL REFERENCES branches (id),
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ── Gastos (Egresos de caja) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id                  text PRIMARY KEY,
  amount              numeric(10, 2) NOT NULL,
  concept             text NOT NULL,
  category            text NOT NULL,
  register_session_id text REFERENCES register_sessions (id),
  branch_id           text REFERENCES branches (id),
  user_id             text NOT NULL REFERENCES staff (id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Nombre original de la columna de arriba: `cash_register_id`. Se renombró para que
-- coincida con `sales.register_session_id` (mismo concepto, mismo nombre en toda la
-- base). Este bloque solo actúa si una base ya existente todavía tiene el nombre viejo.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'cash_register_id'
  ) THEN
    ALTER TABLE expenses RENAME COLUMN cash_register_id TO register_session_id;
  END IF;
END $$;

-- ── Indices para consultas frecuentes ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales (branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_session ON sales (register_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_session ON expenses (register_session_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses (branch_id);
CREATE INDEX IF NOT EXISTS idx_register_sessions_branch ON register_sessions (branch_id);
CREATE INDEX IF NOT EXISTS idx_register_sessions_status ON register_sessions (status);
CREATE INDEX IF NOT EXISTS idx_register_sessions_opened_at ON register_sessions (opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_branch ON qr_codes (branch_id);

-- ── Promociones ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  discount_type  text NOT NULL,
  discount_value numeric(10, 2) NOT NULL,
  applies_to     text NOT NULL DEFAULT 'ALL',
  branch_ids     jsonb NOT NULL DEFAULT '[]',
  is_active      boolean NOT NULL DEFAULT true,
  -- Si son NULL, la promo no tiene límite de fechas (además de tener que estar
  -- is_active). Si ambas están, solo aplica dentro de ese rango, inclusive.
  starts_at      date,
  ends_at        date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS starts_at date;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS ends_at date;
END $$;

DO $$ BEGIN
  ALTER TABLE promotions ADD CONSTRAINT promotions_date_range_valid
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Cupones ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id             text PRIMARY KEY,
  code           text NOT NULL UNIQUE,
  discount_type  text NOT NULL,
  discount_value numeric(10, 2) NOT NULL,
  max_uses       integer NOT NULL DEFAULT 1,
  used_count     integer NOT NULL DEFAULT 0,
  expires_at     timestamptz,
  is_active      boolean NOT NULL DEFAULT true,
  applies_to     text NOT NULL DEFAULT 'ALL',
  branch_id      text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Restricciones de integridad agregadas después del lanzamiento ─────────────
-- `ALTER TABLE ADD CONSTRAINT` no soporta `IF NOT EXISTS`, así que cada una va en un
-- bloque DO que ignora el error si ya existe — mantiene este archivo seguro de
-- volver a correr, igual que el resto del esquema.
DO $$ BEGIN
  ALTER TABLE toppings ADD CONSTRAINT toppings_non_negative
    CHECK (price_extra >= 0 AND low_stock_threshold >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_non_negative
    CHECK (base_price >= 0 AND low_stock_threshold >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE register_sessions ADD CONSTRAINT register_sessions_non_negative
    CHECK (
      opening_amount >= 0
      AND (closing_amount_counted IS NULL OR closing_amount_counted >= 0)
      AND (expected_amount IS NULL OR expected_amount >= 0)
      AND (sales_total IS NULL OR sales_total >= 0)
      AND (sales_count IS NULL OR sales_count >= 0)
      AND (cash_sales_total IS NULL OR cash_sales_total >= 0)
      AND (qr_sales_total IS NULL OR qr_sales_total >= 0)
    );
  -- `difference` (contado - esperado) puede ser negativo a propósito: es un faltante de caja.
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE sales ADD CONSTRAINT sales_non_negative
    CHECK (subtotal >= 0 AND subtotal_before_discount >= 0 AND discount_amount >= 0 AND total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE sales ADD CONSTRAINT sales_discount_type_valid
    CHECK (discount_type IN ('NONE', 'PROMO', 'COUPON', 'BOTH'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE promotions ADD CONSTRAINT promotions_discount_type_valid
    CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE promotions ADD CONSTRAINT promotions_discount_value_non_negative
    CHECK (discount_value >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_discount_type_valid
    CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ITEM'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_non_negative
    CHECK (discount_value >= 0 AND max_uses > 0 AND used_count >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Configuración general (una sola fila) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id                 text PRIMARY KEY DEFAULT 'global',
  -- Si es false, el cajero puede cobrar por QR/mixto sin adjuntar foto del
  -- comprobante (ver api/branches.ts?resource=settings y CheckoutModal.tsx).
  require_qr_receipt boolean NOT NULL DEFAULT true,
  updated_at         timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- ── Bodega: insumos separados del catálogo de venta (ej. harinas, envases) ─────
CREATE TABLE IF NOT EXISTS warehouse_items (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  unit                text NOT NULL DEFAULT 'unidades',
  stock_by_branch     jsonb NOT NULL DEFAULT '{}',
  low_stock_threshold integer NOT NULL DEFAULT 0,
  branch_ids          jsonb NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE warehouse_items ADD CONSTRAINT warehouse_items_threshold_non_negative
    CHECK (low_stock_threshold >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Bodega: historial de movimientos (entrada = ajuste manual, salida = entrega) ─
-- item_id NO tiene foreign key a propósito: si se borra el insumo, el historial de
-- movimientos ya hechos debe seguir existiendo tal cual (item_name queda guardado
-- acá mismo, no se hace join en vivo contra warehouse_items).
-- branch_id: ON DELETE CASCADE — si se borra la sucursal, se borra su historial de
-- bodega junto con sus ventas y cajas (mismo criterio que ya usa el DELETE de
-- api/branches.ts para sales/register_sessions: fue un pedido explícito del dueño).
-- sale_id: ON DELETE SET NULL — el movimiento de stock en sí siempre queda (es real
-- y ya ocurrió), pero pierde el vínculo si la venta puntual se borra.
CREATE TABLE IF NOT EXISTS warehouse_movements (
  id         text PRIMARY KEY,
  item_id    text NOT NULL,
  item_name  text NOT NULL,
  branch_id  text NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('entrada', 'salida')),
  quantity   integer NOT NULL CHECK (quantity > 0),
  user_id    text NOT NULL REFERENCES staff (id),
  user_name  text NOT NULL,
  note       text,
  sale_id    text REFERENCES sales (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migración para una base que ya haya creado warehouse_movements con la forma
-- anterior (con foreign key a item_id y sin item_name, o sin ON DELETE en
-- branch_id/sale_id).
DO $$ BEGIN
  ALTER TABLE warehouse_movements ADD COLUMN IF NOT EXISTS item_name text;
  UPDATE warehouse_movements m SET item_name = i.name
    FROM warehouse_items i WHERE m.item_id = i.id AND m.item_name IS NULL;
  UPDATE warehouse_movements SET item_name = '(insumo eliminado)' WHERE item_name IS NULL;
  ALTER TABLE warehouse_movements ALTER COLUMN item_name SET NOT NULL;
  ALTER TABLE warehouse_movements DROP CONSTRAINT IF EXISTS warehouse_movements_item_id_fkey;
  ALTER TABLE warehouse_movements DROP CONSTRAINT IF EXISTS warehouse_movements_branch_id_fkey;
  ALTER TABLE warehouse_movements ADD CONSTRAINT warehouse_movements_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE;
  ALTER TABLE warehouse_movements DROP CONSTRAINT IF EXISTS warehouse_movements_sale_id_fkey;
  ALTER TABLE warehouse_movements ADD CONSTRAINT warehouse_movements_sale_id_fkey
    FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE SET NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_warehouse_movements_item ON warehouse_movements (item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_branch ON warehouse_movements (branch_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_created_at ON warehouse_movements (created_at DESC);

-- Snapshot de lo entregado de bodega en esa venta (para el ticket) — la fuente de
-- verdad del stock/historial es warehouse_movements, esto es solo para mostrar.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS warehouse_deliveries jsonb NOT NULL DEFAULT '[]';
