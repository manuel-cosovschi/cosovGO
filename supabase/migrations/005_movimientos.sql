-- Movimientos: payment tracking on orders + gastos del negocio table

-- Add payment fields to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cobrado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_cobro DATE,
  ADD COLUMN IF NOT EXISTS forma_pago TEXT;

-- Gastos del negocio
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  categoria TEXT NOT NULL,
  proveedor TEXT,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  forma_pago TEXT,
  nota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access to gastos"
  ON gastos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS gastos_fecha_idx ON gastos(fecha);
