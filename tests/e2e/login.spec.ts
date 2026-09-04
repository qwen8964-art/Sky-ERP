import { test, expect } from '@playwright/test';

test.describe('Sky-ERP E2E Tests', () => {
  // Test de página de login
  test('debe cargar la página de login correctamente', async ({ page }) => {
    await page.goto('/');
    
    // Verificar título
    await expect(page).toHaveTitle(/SKY-ERP/);
    
    // Verificar elementos principales
    await expect(page.getByText('SKYNET ERP')).toBeVisible();
    await expect(page.getByText('Sistema de Gestión Empresarial')).toBeVisible();
    
    // Verificar campos del formulario
    await expect(page.getByLabel(/empresa/i)).toBeVisible();
    await expect(page.getByLabel(/usuario/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('/');
    
    // Llenar formulario con credenciales inválidas
    await page.getByLabel(/empresa/i).fill('1');
    await page.getByLabel(/usuario/i).fill('invaliduser');
    await page.getByLabel(/contraseña/i).fill('wrongpassword');
    
    // Enviar formulario
    await page.getByRole('button', { name: /ingresar/i }).click();
    
    // Esperar mensaje de error
    await expect(page.getByText(/credenciales inválidas|error/i)).toBeVisible({ timeout: 5000 });
  });

  // Test de navegación después del login (requiere autenticación)
  test('debe navegar al dashboard después de login exitoso', async ({ page }) => {
    await page.goto('/');
    
    // Usar credenciales válidas (ajustar según datos de prueba)
    await page.getByLabel(/empresa/i).fill('1');
    await page.getByLabel(/usuario/i).fill('admin');
    await page.getByLabel(/contraseña/i).fill('admin123');
    
    await page.getByRole('button', { name: /ingresar/i }).click();
    
    // Esperar navegación al dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Verificar elementos del dashboard
    await expect(page.getByText(/dashboard|bienvenido/i)).toBeVisible({ timeout: 5000 });
  });

  // Test de módulos principales
  test('debe acceder al módulo de ventas', async ({ page }) => {
    // Asumiendo que ya está autenticado
    await page.goto('/dashboard');
    
    // Buscar enlace a ventas en el sidebar o menú
    const ventasLink = page.getByText(/ventas/i).first();
    await expect(ventasLink).toBeVisible();
    await ventasLink.click();
    
    // Verificar navegación a página de ventas
    await expect(page).toHaveURL(/\/ventas/, { timeout: 5000 });
  });

  test('debe acceder al módulo de inventario', async ({ page }) => {
    await page.goto('/dashboard');
    
    const inventarioLink = page.getByText(/inventario|productos/i).first();
    await expect(inventarioLink).toBeVisible();
    await inventarioLink.click();
    
    await expect(page).toHaveURL(/\/inventario/, { timeout: 5000 });
  });

  // Test de responsive
  test('debe ser responsive en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verificar que los elementos sean visibles en móvil
    await expect(page.getByText('SKYNET ERP')).toBeVisible();
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
  });

  test('debe ser responsive en tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.getByText('SKYNET ERP')).toBeVisible();
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
  });
});
