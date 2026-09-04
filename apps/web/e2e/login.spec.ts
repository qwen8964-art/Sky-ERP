import { test, expect } from '@playwright/test';

test.describe('Sky-ERP E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ir al login antes de cada test
    await page.goto('/');
  });

  test('debe mostrar la página de login correctamente', async ({ page }) => {
    await expect(page).toHaveTitle(/Sky-ERP/);
    await expect(page.locator('h1')).toContainText(/Iniciar Sesión|Login/i);
    await expect(page.locator('input[type="text"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.fill('input[type="text"], input[type="email"]', 'usuario_invalido');
    await page.fill('input[type="password"]', 'password_invalido');
    await page.click('button[type="submit"]');

    // Esperar mensaje de error
    await page.waitForSelector('text=/Error|Credenciales|Inválido/i', { timeout: 5000 });
    await expect(page.locator('text=/Error|Credenciales|Inválido/i')).toBeVisible();
  });

  test('debe navegar al dashboard después del login exitoso', async ({ page }) => {
    // Usar credenciales de test (ajustar según seed data)
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar navegación al dashboard
    await page.waitForURL(/\/dashboard|\/home/, { timeout: 10000 });
    
    // Verificar elementos del dashboard
    await expect(page.locator('text=/Dashboard|Panel|Inicio/i')).toBeVisible();
  });
});
