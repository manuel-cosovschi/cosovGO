export const SITE_NAME = 'COSOV.';
export const SITE_DESCRIPTION = 'Pastelería artesanal para cafeterías y eventos';
export const DEFAULT_MIN_ADVANCE_HOURS = 48;
/**
 * Tamaño máximo del archivo que finalmente se sube al storage. La foto que
 * elige Valentina puede pesar mucho más: se comprime en el navegador antes de
 * subirla (ver `src/lib/image.ts`), así que este límite aplica al resultado.
 */
export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB

/** Formatos que el storage acepta guardar. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Filtro del selector de archivos. Deliberadamente amplio: cualquier imagen se
 * reencodea a JPEG/WebP en el navegador antes de subirse.
 *
 * Importante: NO listar "image/heic" acá. Mientras el accept no lo pida
 * explícitamente, iOS convierte solo las fotos HEIC a JPEG al elegirlas; si se
 * lo pedimos, entrega el HEIC crudo y depende del navegador poder abrirlo.
 */
export const IMAGE_INPUT_ACCEPT = 'image/*';

/** Lado máximo (en px) de la imagen ya optimizada. */
export const IMAGE_MAX_DIMENSION = 1600;

/** Peso al que apunta la compresión en el navegador. */
export const IMAGE_TARGET_BYTES = 900 * 1024; // 900KB
export const ITEMS_PER_PAGE = 20;

export const TIME_SLOTS = [
  '07:00 - 09:00',
  '09:00 - 11:00',
  '11:00 - 13:00',
  '13:00 - 15:00',
  '15:00 - 17:00',
  '17:00 - 19:00',
] as const;
