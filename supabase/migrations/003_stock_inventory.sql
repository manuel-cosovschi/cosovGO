-- COSOV. v2 — Stock, inventario y trazabilidad
-- Migración incremental sobre el schema existente

-- ============================================
-- INGREDIENTES / MATERIA PRIMA
-- ============================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'kg',
  stock_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  min_stock_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RECETAS (ingredientes por producto)
-- ============================================
-- Cada fila = cuánto de un ingrediente se usa por lote de producto
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_per_batch DECIMAL(10,3) NOT NULL CHECK (quantity_per_batch > 0),
  UNIQUE(product_id, ingredient_id)
);

-- ============================================
-- MOVIMIENTOS DE STOCK
-- ============================================
-- Registra TODO cambio de stock (ingredientes y productos)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('ingredient', 'product')),
  reference_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase',              -- compra de ingrediente
    'production',            -- producción de producto (ingreso)
    'order_deduction',       -- descuento por pedido aprobado (egreso producto)
    'production_consumption', -- consumo de ingrediente para producir (egreso)
    'adjustment',            -- ajuste manual
    'waste'                  -- merma / pérdida
  )),
  quantity DECIMAL(10,3) NOT NULL, -- positivo = ingreso, negativo = egreso
  unit_cost DECIMAL(10,2),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CAMPOS NUEVOS EN PRODUCTS
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_size INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_override DECIMAL(10,2);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_ingredients_active ON ingredients(is_active);
CREATE INDEX idx_recipe_items_product ON recipe_items(product_id);
CREATE INDEX idx_recipe_items_ingredient ON recipe_items(ingredient_id);
CREATE INDEX idx_stock_movements_ref ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_order ON stock_movements(order_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX idx_products_stock_low ON products(stock_quantity) WHERE is_active = true;

-- ============================================
-- TRIGGER updated_at PARA INGREDIENTS
-- ============================================
CREATE TRIGGER trg_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full ingredients" ON ingredients
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full recipe_items" ON recipe_items
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full stock_movements" ON stock_movements
  FOR ALL USING (auth.role() = 'authenticated');

-- Lectura pública de ingredientes no es necesaria (solo admin)
