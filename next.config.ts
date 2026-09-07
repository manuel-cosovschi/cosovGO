import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      // Por defecto Next corta el body de una Server Action en 1MB, y eso hacía
      // fallar la subida de cualquier foto de celular con un error genérico.
      // Las imágenes ahora van directo del navegador a Supabase, pero dejamos
      // margen para el camino de respaldo (ver src/actions/storage.ts).
      // Ojo: en Vercel el tope duro de request es 4.5MB, no se puede superar.
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
