import { test, expect } from '@playwright/test';

test.describe('Gestión de Productos E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard|\/home/, { timeout: 10000 });
  });

  test('debe navegar a la página de productos', async ({ page }) => {
    // Navegar al módulo de inventario/productos
    await page.click('text=/Inventario|Productos/i');
    await page.waitForURL(/\/productos|\/inventario/, { timeout: 5000 });
    
    await expect(page.locator('text=/Productos|Listado/i')).toBeVisible();
  });

  test('debe crear un nuevo producto', async ({ page }) => {
    // Ir a productos
    await page.click('text=/Inventario|Productos/i');
    await page.waitForURL(/\/productos/, { timeout: 5000 });

    // Click en botón nuevo producto
    await page.click('button:has-text("Nuevo"), button:has-text("Crear")');

    // Llenar formulario
    await page.fill('input[name="codigo"], #codigo', `PROD-E2E-${Date.now()}`);
    await page.fill('input[name="nombre"], #nombre', 'Producto E2E Test');
    await page.fill('textarea[name="descripcion"], #descripcion', 'Producto creado desde test E2E');
    
    // Seleccionar unidad
    await page.selectOption('select[name="unidad"], #unidad', 'NIU');
    
    // Precios
    await page.fill('input[name="precioCompra"], #precioCompra', '100');
    await page.fill('input[name="precioVenta"], #precioVenta', '150');
    
    // Guardar
    await page.click('button[type="submit"], button:has-text("Guardar")');
    
    // Verificar creación
    await page.waitForSelector('text=/Producto creado|Guardado exitosamente/i', { timeout: 5000 });
  });

  test('debe buscar y filtrar productos', async ({ page }) => {
    // Ir a productos
    await page.click('text=/Inventario|Productos/i');
    await page.waitForURL(/\/productos/, { timeout: 5000 });

    // Buscar producto
    const searchInput = page.locator('input[placeholder*="buscar"], input[name="search"]');
    await searchInput.fill('Producto');
    
    // Esperar resultados
    await page.waitForTimeout(1000);
    
    // Verificar que hay resultados
    const rows = page.locator('table tbody tr, [role="row"]');
    await expect(rows.count()).toBeGreaterThan(0);
  });

  test('debe editar un producto existente', async ({ page }) => {
    // Ir a productos
    await page.click('text=/Inventario|Productos/i');
    await page.waitForURL(/\/productos/, { timeout: 5000 });

    // Seleccionar primer producto para editar
    const editButton = page.locator('button:has-text("Editar"), [aria-label="Editar"]').first();
    await editButton.click();

    // Modificar nombre
    const nombreInput = page.locator('input[name="nombre"], #nombre');
    const currentName = await nombreInput.inputValue();
    await nombreInput.fill(`${currentName} (Editado E2E)`);

    // Guardar cambios
    await page.click('button[type="submit"], button:has-text("Guardar")');
    
    // Verificar actualización
    await page.waitForSelector('text=/actualizado|guardado/i', { timeout: 5000 });
  });

  test('debe eliminar un producto', async ({ page }) => {
    // Ir a productos
    await page.click('text=/Inventario|Productos/i');
    await page.waitForURL(/\/productos/, { timeout: 5000 });

    // Crear producto para eliminar
    await page.click('button:has-text("Nuevo"), button:has-text("Crear")');
    await page.fill('input[name="codigo"]', `PROD-DELETE-${Date.now()}`);
    await page.fill('input[name="nombre"]', 'Producto a Eliminar E2E');
    await page.selectOption('select[name="unidad"]', 'NIU');
    await page.fill('input[name="precioCompra"]', '50');
    await page.fill('input[name="precioVenta"]', '75');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Volver a lista y eliminar
    await page.click('text=/Inventario|Productos/i');
    
    // Buscar producto creado
    const searchInput = page.locator('input[placeholder*="buscar"]');
    await searchInput.fill('Producto a Eliminar E2E');
    await page.waitForTimeout(500);

    // Click en eliminar
    const deleteButton = page.locator('button:has-text("Eliminar"), [aria-label="Eliminar"]').first();
    await deleteButton.click();

    // Confirmar eliminación
    await page.click('button:has-text("Confirmar"), button:has-text("Sí")');

    // Verificar eliminación
    await page.waitForSelector('text=/eliminado|Eliminado/i', { timeout: 5000 });
  });
});
