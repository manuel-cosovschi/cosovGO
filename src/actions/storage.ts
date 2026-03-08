'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const BUCKET = 'product-images';

/**
 * Sube una imagen al storage de Supabase usando el service role (sin RLS).
 * Recibe un FormData con un campo "file".
 */
export async function uploadImage(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, error: 'No se recibió ningún archivo.' };
  }

  // Validar tipo
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: 'Formato no soportado. Usá JPG, PNG o WebP.' };
  }

  // Validar tamaño (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'La imagen no puede superar los 5MB.' };
  }

  // Verificar autenticación
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No tenés permiso para subir imágenes.' };
  }

  // Subir con service role (bypass RLS en storage)
  const admin = createAdminClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Storage upload error:', error);
    return { success: false, error: 'Error al subir la imagen. Verificá que el bucket "product-images" exista.' };
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(fileName);

  return { success: true, url: urlData.publicUrl };
}

/**
 * Elimina una imagen del storage.
 */
export async function deleteImage(imageUrl: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No tenés permiso.' };
  }

  // Extraer el path del archivo desde la URL
  const urlParts = imageUrl.split(`/storage/v1/object/public/${BUCKET}/`);
  if (urlParts.length < 2) {
    return { success: false, error: 'URL de imagen inválida.' };
  }
  const filePath = urlParts[1];

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([filePath]);

  if (error) {
    console.error('Storage delete error:', error);
    return { success: false, error: 'Error al eliminar la imagen.' };
  }

  return { success: true };
}

/**
 * Sube una imagen y actualiza el campo image_url de un producto.
 * Todo en una sola acción para Valentina.
 */
export async function uploadProductImage(productId: string, formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  // Subir imagen
  const uploadResult = await uploadImage(formData);
  if (!uploadResult.success) return uploadResult;

  // Actualizar producto
  const admin = createAdminClient();

  // Obtener imagen anterior para borrarla
  const { data: product } = await admin
    .from('products')
    .select('image_url')
    .eq('id', productId)
    .single();

  // Actualizar con la nueva URL
  const { error } = await admin
    .from('products')
    .update({ image_url: uploadResult.url })
    .eq('id', productId);

  if (error) {
    return { success: false, error: 'Error al actualizar el producto.' };
  }

  // Borrar imagen anterior si existía
  if (product?.image_url) {
    await deleteImage(product.image_url).catch(() => {});
  }

  revalidatePath('/admin/productos');
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/catalogo');

  return { success: true, url: uploadResult.url };
}

/**
 * Quita la imagen de un producto (la borra del storage y limpia el campo).
 */
export async function removeProductImage(productId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No tenés permiso.' };

  const admin = createAdminClient();

  const { data: product } = await admin
    .from('products')
    .select('image_url')
    .eq('id', productId)
    .single();

  if (product?.image_url) {
    await deleteImage(product.image_url).catch(() => {});
  }

  await admin
    .from('products')
    .update({ image_url: null })
    .eq('id', productId);

  revalidatePath('/admin/productos');
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/catalogo');

  return { success: true };
}
