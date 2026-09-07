'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { RefreshCw, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createImageUploadTicket, uploadImage, deleteImage } from '@/actions/storage';
import { createClient } from '@/lib/supabase/client';
import { prepareImageForUpload, formatBytes } from '@/lib/image';
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_INPUT_ACCEPT,
  MAX_IMAGE_SIZE,
} from '@/lib/constants';
import { toast } from 'sonner';

const BUCKET = 'product-images';

/** Por debajo de esto la subida por el server sigue siendo viable como respaldo. */
const SERVER_FALLBACK_MAX_BYTES = 3 * 1024 * 1024;

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('Subiendo imagen...');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusText('Optimizando imagen...');

    try {
      const prepared = await prepareImageForUpload(file);
      const toUpload = prepared.file;

      // El navegador no pudo abrir el archivo (HEIC en Chrome/Firefox suele ser
      // el caso) y el formato original tampoco sirve: avisamos con claridad en
      // lugar de dejar que falle el storage con un error críptico.
      if (!prepared.optimized && !ACCEPTED_IMAGE_TYPES.includes(toUpload.type)) {
        toast.error(
          'No se pudo leer esa imagen. Si es una foto de iPhone (.HEIC), abrila y ' +
            'guardala como JPG, o sacá la foto con el formato "Más compatible".'
        );
        return;
      }

      if (toUpload.size > MAX_IMAGE_SIZE) {
        toast.error(
          `La imagen pesa ${formatBytes(toUpload.size)} y el máximo es ` +
            `${formatBytes(MAX_IMAGE_SIZE)}. Probá con una foto más chica.`
        );
        return;
      }

      setStatusText('Subiendo imagen...');
      const url = await uploadToStorage(toUpload);

      // Recién borramos la anterior cuando la nueva ya está arriba.
      if (value) {
        await deleteImage(value).catch(() => {});
      }

      onChange(url);
      toast.success('Imagen subida');
    } catch (error) {
      console.error('[image-upload] falló la subida:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al subir la imagen'
      );
    } finally {
      setUploading(false);
      setStatusText('Subiendo imagen...');
      // Reset input para permitir subir el mismo archivo
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (value) {
      await deleteImage(value).catch(() => {});
    }
    onChange(null);
    toast.success('Imagen eliminada');
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={IMAGE_INPUT_ACCEPT}
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {value ? (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative inline-block rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
            <Image
              src={value}
              alt="Imagen del producto"
              width={280}
              height={280}
              className="object-cover"
              style={{ maxHeight: '280px' }}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Loader2 className="h-8 w-8 animate-spin text-stone-600" />
              </div>
            )}
          </div>

          {/* Acciones claras para Valentina */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileSelect}
              disabled={uploading}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Cambiar imagen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        /* Zona de subida */
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={uploading}
          className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 p-10 transition-colors hover:bg-stone-100 hover:border-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-stone-400" />
              <p className="mt-3 text-sm font-medium text-stone-500">{statusText}</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-stone-200 p-3">
                <ImageIcon className="h-6 w-6 text-stone-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-stone-700">
                Hacé click para subir una imagen
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Sacala como quieras — se achica sola antes de subirse
              </p>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Sube la imagen directo del navegador a Supabase Storage usando un permiso
 * temporal que emite el server.
 *
 * Los bytes no pasan por Next: así se esquiva el límite de 1MB del body de las
 * Server Actions y el tope de 4.5MB que Vercel le pone a cada request, que era
 * lo que hacía fallar cualquier foto de celular.
 */
async function uploadToStorage(file: File): Promise<string> {
  const ticket = await createImageUploadTicket({
    contentType: file.type,
    size: file.size,
  });

  if (!ticket.success) {
    throw new Error(ticket.error);
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type,
      cacheControl: '3600',
    });

  if (!error) return ticket.publicUrl;

  console.error('[image-upload] subida directa falló:', error);

  // Respaldo: mandarla por el server. Sólo tiene sentido con archivos chicos,
  // porque ahí sí aplica el límite de body de la Server Action.
  if (file.size <= SERVER_FALLBACK_MAX_BYTES) {
    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadImage(formData);
    if (result.success) return result.url;

    throw new Error(result.error);
  }

  throw new Error(
    'No se pudo conectar con el storage de imágenes. Revisá tu conexión y probá de nuevo.'
  );
}
