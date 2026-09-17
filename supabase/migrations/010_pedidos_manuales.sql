-- Pedidos cargados a mano desde el panel (los que llegan por WhatsApp).
--
-- Valen toma pedidos de particulares por WhatsApp y los quiere registrar en el
-- sistema. Un particular no tiene "nombre del negocio" y muchas veces no deja
-- un mail, así que esas dos columnas dejan de ser obligatorias.
--
-- Ejecutar en Supabase > SQL Editor. Es idempotente.

BEGIN;

-- 1) Un particular no tiene negocio ni necesariamente mail.
ALTER TABLE orders ALTER COLUMN business_name DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN email DROP NOT NULL;

-- 2) Distinguir a quién le vendió, para poder mirar los números por separado.
--    Los 174 pedidos que ya existen vinieron del catálogo mayorista.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS canal text NOT NULL DEFAULT 'mayorista';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_canal_check;
ALTER TABLE orders ADD CONSTRAINT orders_canal_check
  CHECK (canal = ANY (ARRAY['mayorista'::text, 'minorista'::text]));

-- 3) Marcar los que cargó ella a mano, para diferenciarlos de los que entraron
--    solos por la web.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carga_manual boolean NOT NULL DEFAULT false;

COMMIT;

-- Comprobación:
-- select canal, carga_manual, count(*) from orders group by 1,2;
