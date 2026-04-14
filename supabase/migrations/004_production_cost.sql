-- ============================================
-- Costo de producción por pedido
-- ============================================
-- Snapshot del costo de producir cada item al momento del pedido.
-- Nullable a propósito: pedidos previos a esta migración quedan en NULL.
-- Se snapshotea para que cambios futuros de costo no reescriban historia.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS production_cost DECIMAL(10,2);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS cost_subtotal DECIMAL(10,2);
