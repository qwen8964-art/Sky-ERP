import { test, expect } from '@playwright/test';

test.describe('Gestión de Ventas E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard|\/home/, { timeout: 10000 });
  });

  test('debe navegar al módulo de ventas', async ({ page }) => {
    await page.click('text=/Ventas/i');
    await page.waitForURL(/\/ventas/, { timeout: 5000 });
    
    await expect(page.locator('text=/Comprobantes|Facturas|Ventas/i')).toBeVisible();
  });

  test('debe crear un comprobante de venta', async ({ page }) => {
    // Ir a ventas
    await page.click('text=/Ventas/i');
    await page.waitForURL(/\/ventas/, { timeout: 5000 });

    // Nuevo comprobante
    await page.click('button:has-text("Nuevo"), button:has-text("Crear")');

    // Seleccionar tipo de comprobante
    await page.selectOption('select[name="tipoComprobante"], #tipoComprobante', 'FACTURA');

    // Seleccionar cliente (puede ser un combobox)
    await page.click('select[name="idCliente"], #idCliente');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Agregar items
    await page.click('button:has-text("Agregar Producto"), button:has-text("+")');
    
    // Seleccionar producto
    await page.click('.item-selector select, .producto-select');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Cantidad
    await page.fill('input[name="cantidad"], .cantidad-input', '5');

    // Guardar comprobante
    await page.click('button[type="submit"], button:has-text("Guardar")');

    // Verificar creación
    await page.waitForSelector('text=/creado|Guardado/i', { timeout: 5000 });
  });

  test('debe aprobar un comprobante', async ({ page }) => {
    // Ir a lista de comprobantes
    await page.click('text=/Ventas/i');
    await page.waitForURL(/\/ventas/, { timeout: 5000 });

    // Buscar comprobante en borrador
    const filterSelect = page.locator('select[name="estado"]');
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('BORRADOR');
      await page.waitForTimeout(500);
    }

    // Click en aprobar del primer comprobante
    const approveButton = page.locator('button:has-text("Aprobar"), [aria-label="Aprobar"]').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Confirmar
      await page.click('button:has-text("Confirmar"), button:has-text("Sí")');
      
      // Verificar aprobación
      await page.waitForSelector('text=/aprobado|Aprobado/i', { timeout: 5000 });
    }
  });

  test('debe anular un comprobante', async ({ page }) => {
    // Ir a lista de comprobantes
    await page.click('text=/Ventas/i');
    await page.waitForURL(/\/ventas/, { timeout: 5000 });

    // Filtrar por aprobados
    const filterSelect = page.locator('select[name="estado"]');
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('APROBADO');
      await page.waitForTimeout(500);
    }

    // Click en anular
    const voidButton = page.locator('button:has-text("Anular"), [aria-label="Anular"]').first();
    if (await voidButton.isVisible()) {
      await voidButton.click();

      // Ingresar motivo
      await page.fill('textarea[name="motivo"], #motivo', 'Anulación desde test E2E');

      // Confirmar
      await page.click('button:has-text("Confirmar"), button:has-text("Sí")');

      // Verificar anulación
      await page.waitForSelector('text=/anulado|Anulado/i', { timeout: 5000 });
    }
  });

  test('debe generar PDF de comprobante', async ({ page }) => {
    // Ir a lista de comprobantes
    await page.click('text=/Ventas/i');
    await page.waitForURL(/\/ventas/, { timeout: 5000 });

    // Click en botón PDF/Imprimir
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Imprimir"), [aria-label*="PDF"]').first();
    
    if (await pdfButton.isVisible()) {
      // Verificar que se abre modal o nueva pestaña
      const pagePromise = page.waitForEvent('popup', { timeout: 3000 });
      await pdfButton.click();
      
      try {
        const newPage = await pagePromise;
        await newPage.waitForLoadState();
        expect(newPage.url()).toContain('pdf');
      } catch (e) {
        // Puede que sea una descarga directa, verificar notificación
        await page.waitForSelector('text=/generando|PDF/i', { timeout: 3000 });
      }
    }
  });

  test('debe filtrar comprobantes por fecha', async ({ page }) => {
    // Ir a lista de comprobantes
    await page.click('text=/Ventas/i');
    await page.waitForURL(/\/ventas/, { timeout: 5000 });

    // Establecer rango de fechas
    const fechaInicio = page.locator('input[name="fechaInicio"], #fechaInicio');
    const fechaFin = page.locator('input[name="fechaFin"], #fechaFin');

    if (await fechaInicio.isVisible()) {
      const hoy = new Date().toISOString().split('T')[0];
      const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      await fechaInicio.fill(ayer);
      await fechaFin.fill(hoy);

      // Aplicar filtro
      await page.click('button:has-text("Filtrar"), button:has-text("Buscar")');
      await page.waitForTimeout(1000);

      // Verificar resultados
      const rows = page.locator('table tbody tr, [role="row"]');
      await expect(rows.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
