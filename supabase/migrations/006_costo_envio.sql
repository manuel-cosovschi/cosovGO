-- Add shipping cost field to orders for approval flow
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS costo_envio NUMERIC(12,2);
