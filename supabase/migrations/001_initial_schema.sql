-- COSOV. Pedidos — Schema inicial
-- Supabase PostgreSQL con RLS

-- ============================================
-- CATEGORÍAS
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PRODUCTOS
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  long_description TEXT,
  ingredients TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sale_unit TEXT DEFAULT 'unidad',
  min_quantity INTEGER DEFAULT 1,
  min_advance_hours INTEGER DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PAQUETES / COMBOS
-- ============================================
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  is_editable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items dentro de un paquete
CREATE TABLE package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE(package_id, product_id)
);

-- ============================================
-- PEDIDOS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received', 'pending_review', 'approved', 'rejected',
      'active', 'in_production', 'ready',
      'shipped', 'delivered', 'cancelled'
    )),
  -- Datos del cliente
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Entrega
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
  address TEXT,
  city TEXT,
  delivery_date DATE NOT NULL,
  time_slot TEXT,
  -- Extras
  observations TEXT,
  requires_invoice BOOLEAN DEFAULT false,
  invoice_data JSONB,
  -- Totales
  subtotal DECIMAL(10,2) NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items del pedido (snapshot de precios)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT,
  CHECK (
    (product_id IS NOT NULL AND package_id IS NULL) OR
    (product_id IS NULL AND package_id IS NOT NULL)
  )
);

-- Historial de estados
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CONFIGURACIÓN GLOBAL
-- ============================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed de configuración inicial
INSERT INTO settings (key, value) VALUES
  ('min_advance_hours', '48'),
  ('admin_email', '"valentina@cosov.com.ar"'),
  ('business_name', '"COSOV."'),
  ('business_phone', '""');

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_packages_active ON packages(is_active);
CREATE INDEX idx_packages_slug ON packages(slug);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================
-- TRIGGER updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública para catálogo
CREATE POLICY "Public read active categories" ON categories
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active products" ON products
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active packages" ON packages
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read package items" ON package_items
  FOR SELECT USING (true);

-- Clientes pueden crear pedidos y order_items
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create order items" ON order_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create status history" ON order_status_history
  FOR INSERT WITH CHECK (true);

-- Configuración pública (solo keys específicas)
CREATE POLICY "Public read public settings" ON settings
  FOR SELECT USING (key IN ('min_advance_hours', 'business_name'));

-- Admin full access (authenticated users)
CREATE POLICY "Admin full categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full products" ON products
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full packages" ON packages
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full package_items" ON package_items
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full order_items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full order_status_history" ON order_status_history
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full settings" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- SEED: Categorías iniciales
-- ============================================
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Cookies', 'cookies', 1),
  ('Chipá', 'chipa', 2),
  ('Budines', 'budines', 3),
  ('Tortas', 'tortas', 4),
  ('Mini Pastelería', 'mini-pasteleria', 5),
  ('Boxes', 'boxes', 6),
  ('Combos Cafetería', 'combos-cafeteria', 7),
  ('Temporada', 'temporada', 8);
