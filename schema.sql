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
  cash_register_id    text REFERENCES register_sessions (id),
  branch_id           text REFERENCES branches (id),
  user_id             text NOT NULL REFERENCES staff (id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indices para consultas frecuentes ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales (branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_session ON sales (register_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_session ON expenses (cash_register_id);
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
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

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
