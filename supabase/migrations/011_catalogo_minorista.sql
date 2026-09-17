-- Catálogo minorista: segundo precio y visibilidad por canal.
--
-- La página pasa a tener dos catálogos con links distintos:
--   /catalogo  -> cafeterías (mayorista, el de siempre)
--   /tienda    -> particulares (minorista, nuevo)
--
-- Cada producto puede tener un precio para cada uno y aparecer en uno, en el
-- otro o en los dos.
--
-- Ejecutar en Supabase > SQL Editor. Es idempotente.

BEGIN;

-- Precio para particulares. Queda en NULL hasta que Valen lo cargue, y
-- mientras esté vacío el producto NO aparece en la tienda minorista: así
-- ningún particular compra por error a precio de cafetería.
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_minorista numeric;

-- En qué catálogo se muestra. Por defecto en los dos; ella destilda lo que
-- no quiera mostrar de cada lado.
ALTER TABLE products ADD COLUMN IF NOT EXISTS visible_mayorista boolean NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS visible_minorista boolean NOT NULL DEFAULT true;

-- Los mínimos de hoy son mayoristas (ej: brownies de a 12). A un particular
-- no se le puede exigir eso, así que arranca en 1 y ella lo sube si hace falta.
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_quantity_minorista integer NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_multiple_minorista integer NOT NULL DEFAULT 1;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_minorista_cantidades_check;
ALTER TABLE products ADD CONSTRAINT products_minorista_cantidades_check
  CHECK (min_quantity_minorista >= 1 AND sale_multiple_minorista >= 1);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_minorista_check;
ALTER TABLE products ADD CONSTRAINT products_price_minorista_check
  CHECK (price_minorista IS NULL OR price_minorista >= 0);

COMMIT;

-- Comprobación:
-- select name, price, price_minorista, visible_mayorista, visible_minorista
-- from products where is_active order by name;
