# COSOV. Pedidos — Evolución v2: Stock, Costos y Trazabilidad

---

## 1. Resumen del nuevo alcance

El sistema actual resuelve el problema de pedidos con 48h de anticipación. La v2 agrega un módulo central de **stock y trazabilidad operativa** que responde 6 preguntas clave:

1. **¿Qué tengo hoy?** — Stock de ingredientes y productos elaborados
2. **¿Qué está comprometido?** — Pedidos aprobados que consumen stock
3. **¿Qué me falta comprar?** — Alertas de faltantes + sugerencia de compra
4. **¿Cuánta plata tengo en stock?** — Valorización de ingredientes y producción
5. **¿Qué productos tengo listos?** — Stock de producto terminado
6. **¿Qué ingredientes me faltan?** — Alertas de stock bajo

No es un ERP. Es un tablero operativo para que Valentina sepa exactamente dónde está parada sin tener que abrir un Excel.

---

## 2. Decisión de diseño general

### Receta por lote (no por unidad)
Se usa **receta por lote** porque Valentina hornea en tandas, no unidad por unidad. Un lote de cookies son 24 cookies. Un lote de chipá son 12. La receta indica cuánto ingrediente lleva un lote y cuántas unidades produce.

### Stock en dos capas
- **Capa 1: Ingredientes** — materia prima con costo unitario
- **Capa 2: Productos elaborados** — stock terminado con costo estimado calculado desde la receta

### Descuento en aprobación
El stock se descuenta cuando Valentina aprueba el pedido, no antes. Primero se consume stock elaborado, luego si falta se marca como "pendiente de producción" y se descuentan ingredientes.

### Tracking por código
El cliente accede al estado de su pedido via `/pedido/seguimiento/[order_number]` — una URL que se envía por email. Sin login.

---

## 3. Nuevos módulos

### 3.1 Ingredientes
CRUD de materia prima con stock actual, costo, mínimos y proveedor.

### 3.2 Recetas (consumo por producto)
Tabla que asocia ingredientes a cada producto con cantidades por lote. Incluye `batch_size` (cuántas unidades produce un lote).

### 3.3 Stock de productos elaborados
Campo `stock_quantity` en products + ajustes manuales con historial.

### 3.4 Movimientos de stock
Registro de todo movimiento (ingreso, egreso, ajuste) tanto de ingredientes como de productos elaborados.

### 3.5 Alertas operativas
Calculadas en tiempo real desde el dashboard: stock bajo, faltantes por pedidos, recetas sin cargar.

### 3.6 Valorización económica
Cálculo en dashboard: valor del stock de ingredientes + valor estimado de productos elaborados + costos comprometidos.

### 3.7 Seguimiento de pedido (cliente)
Página pública con estado, detalle, totales y timeline.

---

## 4. Reglas de negocio nuevas

### RN-10: Descuento de stock al aprobar
Cuando un pedido pasa a `approved`:
1. Se revisa stock elaborado de cada producto
2. Se descuenta lo disponible
3. Lo faltante se traduce a ingredientes via receta
4. Se descuentan ingredientes
5. Si no alcanza un ingrediente, se aprueba igual pero se genera alerta de faltante

### RN-11: Stock bajo
Un ingrediente está en "stock bajo" cuando `stock_quantity < min_stock_quantity`.

### RN-12: Receta obligatoria para descuento
Si un producto no tiene receta cargada, no se descuentan ingredientes — se genera alerta "Producto sin receta".

### RN-13: Movimientos siempre con registro
Todo cambio de stock (ingrediente o producto) genera un registro en `stock_movements` con tipo, cantidad, referencia y timestamp.

### RN-14: Valorización
- Ingrediente: `stock_quantity * cost_per_unit`
- Producto elaborado: `stock_quantity * costo_estimado_receta`
- Costo receta: suma de (cantidad_ingrediente / batch_size * cost_per_unit)

### RN-15: Tracking público
Cualquier persona con el número de pedido puede ver el estado. No requiere login.

---

## 5. Lógica de descuento de stock al aprobar

```
approveOrderWithStockImpact(orderId):

1. Obtener order con items
2. Para cada order_item:
   a. Si es producto:
      - stock_disponible = product.stock_quantity
      - necesario = order_item.quantity
      - usar_elaborado = min(stock_disponible, necesario)
      - descontar product.stock_quantity -= usar_elaborado
      - registrar movimiento tipo "order_deduction"
      - faltante = necesario - usar_elaborado

      b. Si faltante > 0 y producto tiene receta:
         - obtener receta con batch_size
         - lotes_necesarios = ceil(faltante / batch_size)
         - para cada ingrediente de la receta:
           - consumo = lotes_necesarios * cantidad_por_lote
           - descontar ingredient.stock_quantity -= consumo
           - registrar movimiento tipo "production_consumption"
           - si ingredient.stock_quantity < 0:
             generar alerta "Faltante: {ingrediente}"

      c. Si faltante > 0 y NO tiene receta:
         - generar alerta "Producto sin receta: {nombre}"

   d. Si es paquete: resolver cada producto del paquete

3. Cambiar estado a "approved"
4. Registrar en order_status_history
5. Retornar { success, alerts[] }
```

---

## 6-7. Modelo de datos actualizado

### Nuevas tablas

**ingredients**
- id UUID PK
- name TEXT NOT NULL
- unit TEXT NOT NULL (kg, g, l, ml, unidad, etc.)
- stock_quantity DECIMAL(10,3) DEFAULT 0
- min_stock_quantity DECIMAL(10,3) DEFAULT 0
- cost_per_unit DECIMAL(10,2) DEFAULT 0
- supplier TEXT
- notes TEXT
- is_active BOOLEAN DEFAULT true
- created_at, updated_at

**recipe_items** (receta: ingredientes por producto)
- id UUID PK
- product_id UUID FK → products
- ingredient_id UUID FK → ingredients
- quantity_per_batch DECIMAL(10,3) NOT NULL
- UNIQUE(product_id, ingredient_id)

**stock_movements** (historial de todo movimiento)
- id UUID PK
- reference_type TEXT (ingredient | product)
- reference_id UUID (ingredient_id o product_id)
- movement_type TEXT (purchase, production, order_deduction, production_consumption, adjustment, waste)
- quantity DECIMAL(10,3) NOT NULL (positivo = ingreso, negativo = egreso)
- unit_cost DECIMAL(10,2)
- order_id UUID FK → orders (nullable)
- notes TEXT
- created_by UUID
- created_at

### Campos nuevos en products
- stock_quantity INTEGER DEFAULT 0
- min_stock_quantity INTEGER DEFAULT 0
- batch_size INTEGER DEFAULT 1
- cost_override DECIMAL(10,2) (costo manual si no hay receta)

---

## 8. Dashboard actualizado

### Cards principales
1. Pedidos hoy / semana
2. Pendientes de revisión
3. En producción
4. Listos para entrega
5. **Valor total del inventario** (ingredientes + elaborados)
6. **Ingredientes en alerta** (bajo mínimo)

### Sección de alertas
- Ingredientes con stock bajo (rojo)
- Productos sin receta (amarillo)
- Ingredientes necesarios para pedidos aprobados que no alcanzan (rojo)

### Sección de valorización
- Valor stock ingredientes: $X
- Valor stock elaborados: $X
- Costo comprometido pedidos activos: $X

---

## 9. Pantallas nuevas

### Admin
- `/admin/ingredientes` — Lista con stock actual, alertas
- `/admin/ingredientes/nuevo` — Crear ingrediente
- `/admin/ingredientes/[id]` — Editar ingrediente + ajustar stock
- `/admin/productos/[id]` — Ahora incluye pestaña de receta + stock
- `/admin/inventario` — Vista general: valorización + alertas + sugerencia de compra

### Cliente
- `/pedido/seguimiento` — Buscar pedido por número
- `/pedido/seguimiento/[orderNumber]` — Detalle + estado + timeline

---

## 10. Flujos

### Alta de ingrediente
Admin → /admin/ingredientes/nuevo → nombre, unidad, costo, stock inicial, mínimo → Guardar

### Carga de receta
Admin → /admin/productos/[id] → Pestaña "Receta" → Agregar ingredientes con cantidad por lote → Definir batch_size → Guardar

### Aprobación con stock
Admin → Detalle pedido → "Aprobar" → Sistema ejecuta lógica de descuento → Muestra resultado con alertas si las hay

### Ajuste manual de stock
Admin → /admin/ingredientes/[id] → "Ajustar stock" → Nuevo valor + motivo → Registra movimiento

### Seguimiento cliente
Cliente → /pedido/seguimiento → Ingresa #pedido → Ve estado actual + timeline + detalle + total

---

## 15. Pseudocódigo clave

### calculateIngredientNeeds(orderId)
```
Para cada item del pedido:
  producto = getProduct(item.product_id)
  faltante = max(0, item.quantity - producto.stock_quantity)
  si faltante > 0:
    receta = getRecipe(producto.id)
    lotes = ceil(faltante / producto.batch_size)
    para cada ingrediente en receta:
      necesario += ingrediente.quantity_per_batch * lotes
Retornar mapa de { ingrediente_id: cantidad_necesaria }
```

### generateLowStockAlerts()
```
ingredientes = SELECT * FROM ingredients WHERE stock_quantity < min_stock_quantity AND is_active
productos = SELECT * FROM products WHERE stock_quantity < min_stock_quantity AND is_active
sin_receta = SELECT * FROM products WHERE is_active AND id NOT IN (SELECT DISTINCT product_id FROM recipe_items)
Retornar { low_ingredients, low_products, missing_recipes }
```

---

## 18. Recomendación final

La clave para que Valentina no abandone esto como el Excel es que el sistema haga el trabajo pesado por ella:

1. **Stock se descuenta solo** al aprobar pedidos
2. **Alertas aparecen solas** en el dashboard
3. **La valorización se calcula sola** desde los costos cargados
4. **La receta se carga una vez** y después funciona para siempre

Lo único que Valentina tiene que hacer manualmente es:
- Cargar ingredientes nuevos (una vez)
- Cargar recetas (una vez por producto)
- Registrar compras de materia prima cuando compra
- Registrar producción cuando hornea un lote

Todo lo demás es automático.
