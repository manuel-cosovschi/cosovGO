import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * El esquema llega como dato, no como literal de tipo, así que el cliente se
 * escribe sin tipar el esquema. Las tablas de `sovare` no están en los tipos
 * generados de `public`, y forzarlas ahí sería mentirle al compilador.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Cliente con la service role, para lo que el visitante no puede hacer con la
 * anon key.
 *
 * Saltea RLS por completo, así que sólo se usa donde el código del servidor es
 * la única validación posible. Hoy, un caso: leer las líneas de un pedido para
 * armar el mail de confirmación, cuando quien encargó no tiene sesión y por lo
 * tanto no puede leer `order_items`.
 *
 * Nunca se importa desde un componente de cliente. Si la variable no está
 * cargada devuelve null en vez de tirar: se saltea lo que dependa de ella y el
 * resto de la aplicación funciona igual.
 */

let cached: AnyClient | null = null;

export function createServiceClient(schema = 'public'): AnyClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  // El de `public` se cachea porque es el que más se usa; los otros esquemas
  // son un cliente por llamada, que sale barato.
  if (schema === 'public' && cached) return cached;

  const client = createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (schema === 'public') cached = client;
  return client;
}
