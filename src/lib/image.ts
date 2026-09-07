/**
 * Preparación de imágenes en el navegador, antes de subirlas al storage.
 *
 * Una foto sacada con el celular pesa habitualmente entre 3 y 12MB y viene en
 * formatos que el storage no acepta (HEIC en iPhone). Redimensionarla y
 * recomprimirla acá resuelve las dos cosas de una: el archivo que viaja es
 * chico y siempre sale en JPEG o WebP.
 */

import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_MAX_DIMENSION,
  IMAGE_TARGET_BYTES,
} from '@/lib/constants';

const MIN_QUALITY = 0.5;
const START_QUALITY = 0.82;
const QUALITY_STEP = 0.12;

export interface PreparedImage {
  /** El archivo listo para subir (comprimido, salvo que no se haya podido). */
  file: File;
  /** Bytes del archivo original elegido por el usuario. */
  originalBytes: number;
  /** true si se pudo abrir y recomprimir la imagen. */
  optimized: boolean;
}

/**
 * Deja la imagen lista para subir: la reduce a `IMAGE_MAX_DIMENSION` de lado
 * máximo y la recomprime apuntando a `IMAGE_TARGET_BYTES`.
 *
 * Si el navegador no sabe abrir el formato (HEIC en Chrome/Firefox, por
 * ejemplo) devuelve el archivo original con `optimized: false`, para que quien
 * llama decida si intenta subirlo igual o muestra un mensaje.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const originalBytes = file.size;
  const unchanged: PreparedImage = { file, originalBytes, optimized: false };

  let source: CanvasImageSource & { width: number; height: number };
  try {
    const decoded = await decodeImage(file);
    if (!decoded) return unchanged;
    source = decoded;
  } catch {
    return unchanged;
  }

  try {
    const { width, height } = scaleToFit(
      source.width,
      source.height,
      IMAGE_MAX_DIMENSION
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return unchanged;

    // Fondo blanco: los PNG con transparencia quedarían negros al pasar a JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);

    const outputType = pickOutputType();
    const blob = await compress(canvas, outputType);
    if (!blob) return unchanged;

    // Si comprimir no ayudó y el original ya era chico y de un formato válido,
    // nos quedamos con el original (típico: un PNG plano o un JPEG ya optimizado).
    if (
      blob.size >= originalBytes &&
      originalBytes <= IMAGE_TARGET_BYTES &&
      ACCEPTED_IMAGE_TYPES.includes(file.type)
    ) {
      return { file, originalBytes, optimized: true };
    }

    const optimizedFile = new File([blob], renameTo(file.name, outputType), {
      type: outputType,
      lastModified: Date.now(),
    });

    return { file: optimizedFile, originalBytes, optimized: true };
  } finally {
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
      source.close();
    }
  }
}

/** Baja la calidad hasta entrar en el objetivo de peso, sin pasarse de feo. */
async function compress(
  canvas: HTMLCanvasElement,
  type: string
): Promise<Blob | null> {
  let quality = START_QUALITY;
  let blob = await toBlob(canvas, type, quality);

  while (blob && blob.size > IMAGE_TARGET_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await toBlob(canvas, type, quality);
  }

  return blob;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Abre el archivo como imagen. `createImageBitmap` respeta la orientación EXIF
 * (las fotos verticales de iPhone salían rotadas sin eso) y en Safari también
 * sabe leer HEIC.
 */
async function decodeImage(
  file: File
): Promise<(CanvasImageSource & { width: number; height: number }) | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Navegadores viejos no aceptan el segundo argumento.
      try {
        return await createImageBitmap(file);
      } catch {
        // Formato que no sabe decodificar: probamos con <img>.
      }
    }
  }

  return decodeWithImgElement(file);
}

function decodeWithImgElement(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function scaleToFit(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { width, height };

  const ratio = Math.min(max / width, max / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** WebP pesa bastante menos que JPEG; si el navegador no lo exporta, JPEG. */
function pickOutputType(): 'image/webp' | 'image/jpeg' {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  try {
    if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
      return 'image/webp';
    }
  } catch {
    // Safari viejo tira excepción con tipos que no soporta.
  }

  return 'image/jpeg';
}

function renameTo(originalName: string, type: string): string {
  const ext = type === 'image/webp' ? 'webp' : 'jpg';
  const base = originalName.replace(/\.[^./\\]+$/, '') || 'imagen';
  return `${base}.${ext}`;
}

/** Formatea bytes para mostrarle al usuario (ej: "4.2MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
