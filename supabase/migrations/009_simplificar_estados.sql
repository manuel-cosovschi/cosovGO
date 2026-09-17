-- Simplificación de los estados de pedido: de 10 a 6.
--
-- Motivo: de 174 pedidos reales, "pending_review" y "active" nunca se usaron
-- ni una vez. "shipped" y "rejected" se solapaban con "delivered" y
-- "cancelled" (para una pastelería con entrega local significan lo mismo).
--
-- Estados que quedan:
--   received       Recibido
--   approved       Aprobado
--   in_production  En producción
--   ready          Listo
--   delivered      Entregado
--   cancelled      Cancelado
--
-- El historial (order_status_history) NO se toca: conserva el rastro real de
-- cada pedido, con los nombres viejos. La app sabe mostrarlos.
--
-- Ejecutar en Supabase > SQL Editor. Es idempotente.

BEGIN;

-- 1) Soltar el CHECK viejo para poder reescribir los valores.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2) Mapear los estados retirados a su equivalente.
--    pending_review -> received   (nunca usado; ambos = "sin revisar")
--    active         -> approved   (nunca usado; era un paso vacío tras aprobar)
--    shipped        -> delivered  (entrega local: salió = entregado)
--    rejected       -> cancelled  (mismo desenlace para el cliente)
UPDATE orders SET status = 'received'  WHERE status = 'pending_review';
UPDATE orders SET status = 'approved'  WHERE status = 'active';
UPDATE orders SET status = 'delivered' WHERE status = 'shipped';
UPDATE orders SET status = 'cancelled' WHERE status = 'rejected';

-- 3) Volver a poner el CHECK, ahora con los 6 estados.
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'received'::text,
    'approved'::text,
    'in_production'::text,
    'ready'::text,
    'delivered'::text,
    'cancelled'::text
  ]));

COMMIT;

-- Comprobación: debería devolver solo los 6 estados nuevos.
-- select status, count(*) from orders group by status order by 2 desc;
