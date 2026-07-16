-- ============================================
-- COSOV. — Venta por múltiplo + seguimiento de costo
-- ============================================
-- 1) sale_multiple: los pedidos de este producto deben ser múltiplos de N.
--    Ej: brownies que salen de a 12 → sale_multiple = 12.
-- 2) Snapshot de costo unitario para mostrar cuánto varió el costo
--    (y en qué fecha) cada vez que se actualiza la materia prima,
--    así se sabe cuánto conviene aumentar el precio de venta.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_multiple INTEGER NOT NULL DEFAULT 1;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_snapshot DECIMAL(10,2);
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_snapshot_at TIMESTAMPTZ;
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_prev DECIMAL(10,2);
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_prev_at TIMESTAMPTZ;
