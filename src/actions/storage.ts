'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants';

const BUCKET = 'product-images';

/** Extensión derivada del MIME real, nunca del nombre que trae el archivo. */
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type Result<T> = ({ success: true } & T) | { success: false; error: string };

function randomObjectName(contentType: string): string {
  const ext = EXT_BY_TYPE[contentType] ?? 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

/** Traduce los errores de Supabase Storage a algo accionable para Valentina. */
function describeStorageError(error: { message?: string }): string {
  const message = error.message?.toLowerCase() ?? '';

  if (message.includes('bucket not found')) {
    return `No existe el bucket "${BUCKET}" en Supabase Storage. Crealo desde Storage > New Bucket (público).`;
  }
  if (message.includes('mime') || message.includes('content type')) {
    return 'El bucket de Supabase no acepta este formato de imagen. Revisá "Allowed MIME types" en la configuración del bucket.';
  }
  if (message.includes('maximum allowed size') || message.includes('too large')) {
    return 'La imagen supera el límite configurado en el bucket de Supabase. Subí el "File size limit" del bucket.';
  }
  if (message.includes('exceeded') || message.includes('quota')) {
    return 'Se llenó el espacio de storage en Supabase. Borrá imágenes viejas o ampliá el plan.';
  }

  return 'Error al preparar la subida de la imagen. Probá de nuevo en unos segundos.';
}

async function requireAdmin(): Promise<boolean> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

function validateImage(contentType: string, size: number): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(contentType)) {
    return 'Formato no soportado. Usá JPG, PNG o WebP.';
  }
  if (size <= 0) {
    return 'El archivo está vacío.';
  }
  if (size > MAX_IMAGE_SIZE) {
    return `La imagen no puede superar los ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB.`;
  }
  return null;
}

/**
 * Devuelve un permiso de subida temporal para que el navegador mande la imagen
 * derecho a Supabase Storage.
 *
 * Este es el camino principal: los bytes NO pasan por el server de Next. Las
 * Server Actions tienen un límite de body de 1MB por defecto y Vercel corta los
 * requests en 4.5MB, así que mandar la foto por acá hacía fallar cualquier
 * imagen de celular con un error genérico.
 */
export async function createImageUploadTicket(input: {
  contentType: string;
  size: number;
}): Promise<Result<{ path: string; token: string; publicUrl: string }>> {
  if (!(await requireAdmin())) {
    return { success: false, error: 'No tenés permiso para subir imágenes.' };
  }

  const invalid = validateImage(input.contentType, input.size);
  if (invalid) return { success: false, error: invalid };

  const admin = createAdminClient();
  const path = randomObjectName(input.contentType);

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('[storage] createSignedUploadUrl falló:', error);
    return { success: false, error: describeStorageError(error ?? {}) };
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(data.path);

  return {
    success: true,
    path: data.path,
    token: data.token,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Subida a través del server, como respaldo por si el navegador no puede
 * hablar directo con Supabase (red corporativa, extensión que bloquea, etc).
 *
 * Sólo sirve para archivos chicos: el body de una Server Action está limitado
 * (ver `serverActions.bodySizeLimit` en next.config.ts).
 */
export async function uploadImage(formData: FormData): Promise<
  Result<{ url: string }>
> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, error: 'No se recibió ningún archivo.' };
  }

  if (!(await requireAdmin())) {
    return { success: false, error: 'No tenés permiso para subir imágenes.' };
  }

  const invalid = validateImage(file.type, file.size);
  if (invalid) return { success: false, error: invalid };

  const admin = createAdminClient();
  const path = randomObjectName(file.type);

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error('[storage] upload falló:', error);
    return { success: false, error: describeStorageError(error) };
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { success: true, url: urlData.publicUrl };
}

/**
 * Elimina una imagen del storage. Si la URL no apunta a nuestro bucket
 * (por ejemplo una URL externa cargada a mano) no hace nada y no falla.
 */
export async function deleteImage(imageUrl: string): Promise<
  { success: boolean; error?: string }
> {
  if (!(await requireAdmin())) {
    return { success: false, error: 'No tenés permiso.' };
  }

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index === -1) {
    return { success: true };
  }

  const filePath = decodeURIComponent(
    imageUrl.slice(index + marker.length).split('?')[0]
  );
  if (!filePath) return { success: true };

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([filePath]);

  if (error) {
    console.error('[storage] delete falló:', error);
    return { success: false, error: 'Error al eliminar la imagen.' };
  }

  return { success: true };
}
