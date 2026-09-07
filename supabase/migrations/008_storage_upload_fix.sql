-- Arreglo de la subida de imágenes de productos.
--
-- Síntoma: "Error al subir la imagen" al cargar fotos de productos nuevos.
-- Además del límite de body de Next (arreglado en next.config.ts y con subida
-- directa al storage), el bucket quedaba corto de configuración.
--
-- Ejecutar en Supabase > SQL Editor. Es idempotente: se puede correr de nuevo.

-- 1) Crear el bucket si no existe (por si se creó a mano desde el Dashboard,
--    donde queda con los límites por defecto).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  8388608, -- 8MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2) Alinear la configuración del bucket con la de la app.
--    El límite anterior (5MB) quedaba por debajo de lo que promete el form, y
--    un bucket creado desde el Dashboard puede traer otro valor distinto.
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 8388608, -- 8MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'product-images';

-- 3) Políticas idempotentes.
--    La migración 002 usaba CREATE POLICY a secas, así que volver a correrla
--    fallaba con "policy already exists" y podía dejar el bucket a medio
--    configurar.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;

-- Cualquiera puede ver las imágenes (bucket público)
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Solo admins autenticados pueden subir
CREATE POLICY "Admin upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Solo admins autenticados pueden actualizar
CREATE POLICY "Admin update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

-- Solo admins autenticados pueden borrar
CREATE POLICY "Admin delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');
