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
RESEND_API_KEY = (tu API key real de Resend, ej: re_xxx)
FROM_EMAIL = onboarding@resend.dev
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

## Emails

El admin (Valen) recibe una notificación en `valencosovschi@hotmail.com`
cada vez que entra un pedido nuevo, con todos los datos del pedido +
costo de producción y margen estimado.

**Setup mínimo para que ya funcione**:
1. Crear cuenta en https://resend.com con `valencosovschi@hotmail.com`.
2. Generar una API key en `Settings > API Keys`.
3. En Vercel `Settings > Environment Variables` setear:
   - `RESEND_API_KEY` = la key real (`re_xxx`).
   - `FROM_EMAIL` = `onboarding@resend.dev` (sender compartido,
     no requiere verificar dominio).
   - `ADMIN_EMAIL` = `valencosovschi@hotmail.com`.
4. Re-deploy.

**Limitación con `onboarding@resend.dev`**: Resend solo permite enviar
mails a la dirección registrada en la cuenta (en este caso, el hotmail
de Valen). El admin notif a Valen llega sin problema, pero las
confirmaciones a clientes externos no van a salir hasta que se verifique
un dominio propio en Resend (`pedidos@cosov.com.ar` o el que sea) y se
cambie `FROM_EMAIL` por ese remitente.

Si algún envío falla, queda logueado en Vercel con el prefijo
`[email]` para debug.

## Dominio personalizado (opcional)

En Vercel > Settings > Domains, podés agregar `pedidos.cosov.com.ar`
