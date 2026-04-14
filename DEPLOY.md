# COSOV. Pedidos — Guía de deploy rápido

## Tiempo estimado: 10 minutos

### Paso 1: Crear proyecto en Supabase (3 min)

1. Ir a https://supabase.com → Sign Up (o Log In)
2. Click "New Project"
3. Nombre: `cosov-pedidos`
4. Password de DB: generá una y guardala
5. Región: South America (São Paulo) o la más cercana
6. Click "Create new project" — esperar ~2 minutos

### Paso 2: Ejecutar las migraciones SQL (2 min)

1. En Supabase, ir a **SQL Editor** (barra izquierda)
2. Click "New Query"
3. Copiar TODO el contenido del archivo `supabase/migrations/001_initial_schema.sql`
4. Click "Run" (o Ctrl+Enter)
5. Repetir con `supabase/migrations/002_storage_bucket.sql`

### Paso 3: Obtener las keys de Supabase (1 min)

1. Ir a **Settings > API** (barra izquierda)
2. Copiar:
   - **Project URL** → es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → es tu `SUPABASE_SERVICE_ROLE_KEY`

### Paso 4: Deploy en Vercel (3 min)

1. Ir a https://vercel.com → Sign Up con GitHub
2. Click "Add New..." > "Project"
3. Importar el repo `manuel-cosovschi/cosovGO`
4. En "Environment Variables", agregar:

```
NEXT_PUBLIC_SUPABASE_URL = (tu Project URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (tu anon key)
SUPABASE_SERVICE_ROLE_KEY = (tu service_role key)
BREVO_API_KEY = (tu API key de Brevo, ej: xkeysib-xxx)
FROM_EMAIL = valencosovschi@hotmail.com (sender verificado en Brevo)
FROM_NAME = COSOV.
ADMIN_EMAIL = valencosovschi@hotmail.com
```

5. Click "Deploy"

### Paso 5: Crear usuario admin (1 min)

1. En Supabase, ir a **Authentication > Users**
2. Click "Add User" > "Create New User"
3. Email: `valentina@cosov.com.ar`
4. Password: `cosov2024admin`
5. Tildar "Auto Confirm User"
6. Click "Create User"

### Paso 6: Crear el bucket de Storage (1 min)

1. En Supabase, ir a **Storage**
2. Click "New Bucket"
3. Nombre: `product-images`
4. Tildar "Public bucket"
5. Click "Create Bucket"

---

## Listo

- **URL del sitio**: la que te da Vercel (ej: cosov-pedidos.vercel.app)
- **Admin login**: tu-url.vercel.app/admin/login
- **Email**: valentina@cosov.com.ar
- **Password**: cosov2024admin

---

## Emails (Brevo — 300/día gratis, sin dominio propio)

El sistema manda 3 tipos de mail:
- **Al cliente** cuando hace un pedido ("pedido recibido").
- **A Valen** cada vez que entra un pedido (con costo de producción y margen).
- **Al cliente** cuando Valen cambia el estado (aprobado, en producción, listo, etc).

**Setup (5 min, 100% gratis, sin DNS ni dominio)**:

1. Crear cuenta en https://app.brevo.com con `valencosovschi@hotmail.com`.
2. **Verificar el sender** (single-sender verification, sin DNS):
   - Ir a `Senders, Domains & Dedicated IPs > Senders > Add a Sender`.
   - Completar: Nombre "COSOV.", email `valencosovschi@hotmail.com`.
   - Brevo manda un link de confirmación al hotmail; click → queda verificado.
3. **Generar API key**:
   - Ir a `SMTP & API > API Keys > Generate a new API key`.
   - Copiar la key (empieza con `xkeysib-...`).
4. **En Vercel `Settings > Environment Variables`** agregar:
   - `BREVO_API_KEY` = la key (`xkeysib-...`).
   - `FROM_EMAIL` = `valencosovschi@hotmail.com` (el sender verificado).
   - `FROM_NAME` = `COSOV.` (opcional, es el nombre que ven los clientes).
   - `ADMIN_EMAIL` = `valencosovschi@hotmail.com`.
5. **Eliminar** la env var vieja `RESEND_API_KEY` si existe.
6. Re-deploy.

**No hay limitación de destinatarios**: a diferencia de Resend con
`onboarding@resend.dev`, Brevo con single-sender verificado puede mandar
mails a cualquier cliente externo desde el día uno.

**Límite del plan gratis**: 300 mails/día — más que suficiente para una
pastelería. Si se queda corto, Brevo tiene planes pagos, o se puede
migrar a otro proveedor sin cambiar código (los nombres de las env vars
se mantienen parecidos).

Si algún envío falla, queda logueado en Vercel con el prefijo
`[email]` para debug.

## Dominio personalizado (opcional)

En Vercel > Settings > Domains, podés agregar `pedidos.cosov.com.ar`
