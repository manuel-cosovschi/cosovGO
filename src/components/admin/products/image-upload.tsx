'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { MAX_IMAGE_SIZE, ACCEPTED_IMAGE_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
}

export function ImageUpload({ value, onChange, bucket = 'product-images' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Formato no soportado. Usá JPG, PNG o WebP.');
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast.error('La imagen no puede superar los 5MB.');
        return;
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        onChange(urlData.publicUrl);
        toast.success('Imagen subida correctamente');
      } catch {
        toast.error('Error al subir la imagen');
      } finally {
        setUploading(false);
      }
    },
    [bucket, onChange]
  );

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt="Producto"
            width={200}
            height={200}
            className="rounded-lg border border-stone-200 object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 p-8 transition-colors hover:bg-stone-100">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-stone-400" />
              <p className="mt-2 text-sm text-stone-500">Click para subir imagen</p>
              <p className="mt-1 text-xs text-stone-400">JPG, PNG o WebP. Máx 5MB</p>
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
