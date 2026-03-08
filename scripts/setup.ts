/**
 * COSOV. Pedidos — Script de setup inicial
 *
 * Ejecutar con: npx tsx scripts/setup.ts
 *
 * Este script:
 * 1. Crea el usuario admin (Valentina) en Supabase Auth
 * 2. Inserta productos de ejemplo
 * 3. Inserta un paquete de ejemplo
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: Faltan variables de entorno.');
  console.error('Asegurate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// CONFIG
// ============================================
const ADMIN_EMAIL = 'valentina@cosov.com.ar';
const ADMIN_PASSWORD = 'cosov2024admin';

async function main() {
  console.log('');
  console.log('====================================');
  console.log('  COSOV. Pedidos — Setup inicial');
  console.log('====================================');
  console.log('');

  // ============================================
  // 1. Crear usuario admin
  // ============================================
  console.log('1. Creando usuario admin...');

  // Verificar si ya existe
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const exists = existingUsers?.users?.find((u) => u.email === ADMIN_EMAIL);

  if (exists) {
    console.log(`   Usuario ${ADMIN_EMAIL} ya existe. Saltando.`);
  } else {
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Confirmar email automáticamente
    });

    if (authError) {
      console.error('   ERROR creando usuario:', authError.message);
      process.exit(1);
    }

    console.log(`   Usuario creado: ${newUser.user.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('   (Cambiá la contraseña después del primer login)');
  }

  // ============================================
  // 2. Verificar que las categorías existen
  // ============================================
  console.log('');
  console.log('2. Verificando categorías...');

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('sort_order');

  if (!categories || categories.length === 0) {
    console.log('   No hay categorías. Creándolas...');
    await supabase.from('categories').insert([
      { name: 'Cookies', slug: 'cookies', sort_order: 1 },
      { name: 'Chipá', slug: 'chipa', sort_order: 2 },
      { name: 'Budines', slug: 'budines', sort_order: 3 },
      { name: 'Tortas', slug: 'tortas', sort_order: 4 },
      { name: 'Mini Pastelería', slug: 'mini-pasteleria', sort_order: 5 },
      { name: 'Boxes', slug: 'boxes', sort_order: 6 },
      { name: 'Combos Cafetería', slug: 'combos-cafeteria', sort_order: 7 },
      { name: 'Temporada', slug: 'temporada', sort_order: 8 },
    ]);
    console.log('   Categorías creadas.');
  } else {
    console.log(`   ${categories.length} categorías encontradas.`);
  }

  // Re-fetch categorías
  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug')
    .order('sort_order');
  const catMap = new Map(cats?.map((c) => [c.slug, c.id]) || []);

  // ============================================
  // 3. Insertar productos de ejemplo
  // ============================================
  console.log('');
  console.log('3. Creando productos de ejemplo...');

  const { data: existingProducts } = await supabase
    .from('products')
    .select('id')
    .limit(1);

  if (existingProducts && existingProducts.length > 0) {
    console.log('   Ya hay productos. Saltando.');
  } else {
    const products = [
      {
        name: 'Cookies Clásicas',
        slug: 'cookies-clasicas',
        category_id: catMap.get('cookies'),
        short_description: 'Cookies de chips de chocolate artesanales',
        long_description: 'Nuestras cookies signature, con chips de chocolate belga y un toque de sal marina. Crocantes por fuera, chewy por dentro.',
        ingredients: 'Harina, manteca, azúcar, huevos, chips de chocolate, sal marina, esencia de vainilla',
        price: 3500,
        sale_unit: 'docena',
        min_quantity: 1,
        is_active: true,
        sort_order: 1,
      },
      {
        name: 'Cookies Double Chocolate',
        slug: 'cookies-double-chocolate',
        category_id: catMap.get('cookies'),
        short_description: 'Cookies de cacao con chips blancos y negros',
        ingredients: 'Harina, manteca, azúcar, huevos, cacao, chips de chocolate blanco, chips de chocolate negro',
        price: 4000,
        sale_unit: 'docena',
        min_quantity: 1,
        is_active: true,
        sort_order: 2,
      },
      {
        name: 'Chipá',
        slug: 'chipa',
        category_id: catMap.get('chipa'),
        short_description: 'Chipá de almidón de mandioca y queso',
        ingredients: 'Almidón de mandioca, queso, huevos, manteca, leche',
        price: 4500,
        sale_unit: 'docena',
        min_quantity: 2,
        is_active: true,
        sort_order: 3,
      },
      {
        name: 'Budín de Limón',
        slug: 'budin-de-limon',
        category_id: catMap.get('budines'),
        short_description: 'Budín artesanal de limón con glaseado',
        long_description: 'Budín húmedo de limón con glaseado cítrico, ideal para acompañar café.',
        ingredients: 'Harina, manteca, azúcar, huevos, limón, yogurt',
        price: 6000,
        sale_unit: 'unidad',
        min_quantity: 1,
        is_active: true,
        sort_order: 4,
      },
      {
        name: 'Budín de Banana',
        slug: 'budin-de-banana',
        category_id: catMap.get('budines'),
        short_description: 'Budín de banana con nueces y canela',
        ingredients: 'Harina, manteca, azúcar, huevos, banana, nueces, canela',
        price: 5500,
        sale_unit: 'unidad',
        min_quantity: 1,
        is_active: true,
        sort_order: 5,
      },
      {
        name: 'Torta de Chocolate',
        slug: 'torta-de-chocolate',
        category_id: catMap.get('tortas'),
        short_description: 'Torta de chocolate con ganache',
        long_description: 'Torta de chocolate húmeda de tres capas con ganache de chocolate negro. Para 10-12 porciones.',
        ingredients: 'Harina, cacao, azúcar, huevos, manteca, crema, chocolate negro',
        price: 25000,
        sale_unit: 'unidad',
        min_quantity: 1,
        min_advance_hours: 72, // Requiere más anticipación
        is_active: true,
        sort_order: 6,
      },
      {
        name: 'Alfajores de Maicena',
        slug: 'alfajores-de-maicena',
        category_id: catMap.get('mini-pasteleria'),
        short_description: 'Alfajores de maicena con dulce de leche',
        ingredients: 'Maicena, harina, manteca, azúcar, yemas, dulce de leche, coco',
        price: 5000,
        sale_unit: 'docena',
        min_quantity: 1,
        is_active: true,
        sort_order: 7,
      },
      {
        name: 'Medialunas',
        slug: 'medialunas',
        category_id: catMap.get('mini-pasteleria'),
        short_description: 'Medialunas de manteca artesanales',
        ingredients: 'Harina, manteca, azúcar, huevos, levadura, almíbar',
        price: 4000,
        sale_unit: 'docena',
        min_quantity: 2,
        is_active: true,
        sort_order: 8,
      },
    ];

    const { error } = await supabase.from('products').insert(products);
    if (error) {
      console.error('   ERROR insertando productos:', error.message);
    } else {
      console.log(`   ${products.length} productos creados.`);
    }
  }

  // ============================================
  // 4. Crear un paquete de ejemplo
  // ============================================
  console.log('');
  console.log('4. Creando paquete de ejemplo...');

  const { data: existingPackages } = await supabase
    .from('packages')
    .select('id')
    .limit(1);

  if (existingPackages && existingPackages.length > 0) {
    console.log('   Ya hay paquetes. Saltando.');
  } else {
    // Obtener IDs de productos para el paquete
    const { data: productsList } = await supabase
      .from('products')
      .select('id, slug')
      .in('slug', ['cookies-clasicas', 'chipa', 'medialunas']);

    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .insert({
        name: 'Combo Cafetería Básico',
        slug: 'combo-cafeteria-basico',
        description: 'El pack ideal para arrancar la semana en tu cafetería: cookies, chipá y medialunas frescas.',
        price: 10000,
        is_editable: false,
        is_active: true,
        sort_order: 1,
      })
      .select()
      .single();

    if (pkgError) {
      console.error('   ERROR creando paquete:', pkgError.message);
    } else if (pkg && productsList) {
      const items = productsList.map((p) => ({
        package_id: pkg.id,
        product_id: p.id,
        quantity: p.slug === 'cookies-clasicas' ? 2 : 1,
      }));

      await supabase.from('package_items').insert(items);
      console.log('   Paquete "Combo Cafetería Básico" creado.');
    }
  }

  // ============================================
  // 5. Verificar storage bucket
  // ============================================
  console.log('');
  console.log('5. Verificando storage bucket...');

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.find((b) => b.id === 'product-images');

  if (bucketExists) {
    console.log('   Bucket "product-images" ya existe.');
  } else {
    const { error: bucketError } = await supabase.storage.createBucket('product-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (bucketError) {
      console.error('   ERROR creando bucket:', bucketError.message);
      console.log('   Podés crearlo manualmente desde el dashboard de Supabase:');
      console.log('   Storage > New Bucket > "product-images" > Public');
    } else {
      console.log('   Bucket "product-images" creado (público, 5MB, JPG/PNG/WebP).');
    }
  }

  // ============================================
  // Resumen
  // ============================================
  console.log('');
  console.log('====================================');
  console.log('  Setup completado');
  console.log('====================================');
  console.log('');
  console.log('Credenciales admin:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('');
  console.log('Próximos pasos:');
  console.log('  1. npm run dev');
  console.log('  2. Abrí http://localhost:3000/admin/login');
  console.log('  3. Iniciá sesión con las credenciales de arriba');
  console.log('  4. Subí imágenes a los productos desde el dashboard');
  console.log('  5. Cambiá la contraseña desde Supabase Dashboard');
  console.log('');
}

main().catch(console.error);
