# Documentación de Testing - Sky-ERP

## 📋 Overview

Este documento describe la estrategia de testing implementada para el proyecto Sky-ERP, incluyendo tests unitarios, de integración y end-to-end (E2E).

## 🏗️ Arquitectura de Testing

### Herramientas Utilizadas

| Tipo de Test | Herramienta | Propósito |
|--------------|-------------|-----------|
| **Unitarios** | Vitest | Tests rápidos de funciones y componentes |
| **Integración API** | Supertest + Vitest | Tests de endpoints REST |
| **E2E** | Playwright | Tests de flujos completos en navegador |
| **Coverage** | c8/v8 | Medición de cobertura de código |

## 📁 Estructura de Tests

```
/workspace/
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── __tests__/
│   │           ├── auth.test.ts          # Autenticación
│   │           ├── empresa.test.ts       # CRUD Empresas
│   │           ├── productos.test.ts     # CRUD Productos
│   │           └── ventas.test.ts        # Flujo Ventas
│   │
│   └── web/
│       └── e2e/
│           ├── login.spec.ts             # Login y Auth
│           ├── productos.spec.ts         # Gestión Productos
│           └── ventas.spec.ts            # Gestión Ventas
│
└── .github/
    └── workflows/
        └── ci.yml                        # Pipeline CI/CD
```

## 🚀 Ejecución de Tests

### Tests Unitarios e Integración (API)

```bash
# Todos los tests
cd apps/api
npm run test

# Con coverage
npm run test:coverage

# Watch mode (desarrollo)
npm run test:watch

# Test específico
npm run test -- productos.test.ts
```

### Tests E2E (Frontend)

```bash
# Todos los tests E2E
cd apps/web
npm run test:e2e

# Con UI (debugging)
npm run test:e2e -- --ui

# Test específico
npm run test:e2e -- login.spec.ts

# Generar reporte HTML
npm run test:e2e -- --reporter=html
```

## 📝 Tipos de Tests

### 1. Tests Unitarios

Prueban funciones individuales de forma aislada.

**Ejemplo:**
```typescript
import { describe, it, expect } from 'vitest';
import { calcularIGV } from '../utils/calculos';

describe('calcularIGV', () => {
  it('debe calcular correctamente el IGV del 18%', () => {
    expect(calcularIGV(100)).toBe(18);
    expect(calcularIGV(1000)).toBe(180);
  });
});
```

### 2. Tests de Integración (API)

Prueban endpoints completos con base de datos real.

**Características:**
- Configuran datos de prueba en `beforeAll`
- Limpian datos en `afterAll`
- Usan transacciones para aislamiento
- Validan códigos HTTP y respuestas JSON

**Ejemplo:**
```typescript
describe('POST /api/productos', () => {
  it('debe crear un producto correctamente', async () => {
    const response = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${authToken}`)
      .send(nuevoProducto);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('idProducto');
  });
});
```

### 3. Tests E2E

Simulan interacciones reales de usuario en el navegador.

**Flujos Cubiertos:**
- Login con credenciales válidas/inválidas
- CRUD completo de productos
- Creación, aprobación y anulación de ventas
- Filtrado y búsqueda
- Generación de reportes PDF

**Ejemplo:**
```typescript
test('debe crear un nuevo producto', async ({ page }) => {
  await page.click('text="Nuevo"');
  await page.fill('#nombre', 'Producto Test');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text="Guardado exitosamente"')).toBeVisible();
});
```

## 🔧 Configuración

### Vitest (`vite.config.ts`)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
```

### Playwright (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['html'], ['junit', { outputFile: 'test-results.xml' }]],
});
```

## 📊 Cobertura Esperada

| Módulo | Cobertura Mínima | Estado |
|--------|-----------------|--------|
| **Auth** | 90% | ✅ Completado |
| **Empresas** | 80% | ✅ Completado |
| **Productos** | 80% | ✅ Completado |
| **Ventas** | 75% | ✅ Completado |
| **Compras** | 70% | ⏳ Pendiente |
| **Inventario** | 70% | ⏳ Pendiente |
| **Finanzas** | 70% | ⏳ Pendiente |
| **RRHH** | 60% | ⏳ Pendiente |

## 🔄 CI/CD Integration

El pipeline de GitHub Actions ejecuta automáticamente:

1. **En cada push/PR:**
   - Tests unitarios e integración
   - Build de aplicaciones
   - Upload de resultados

2. **Solo en main:**
   - Tests E2E completos
   - Build y push de imágenes Docker

## 🐛 Debugging

### Tests Fallidos

```bash
# Ver logs detallados
npm run test -- --reporter=verbose

# Ejecutar test específico con console.log visible
npm run test -- --no-capture

# E2E con modo headed (ver navegador)
npm run test:e2e -- --headed
```

### Screenshots y Videos

Los tests E2E capturan automáticamente:
- Screenshot al fallar
- Video completo de la ejecución

Ubicación: `apps/web/test-results/`

## 📈 Mejores Prácticas

1. **Nombres descriptivos:** `debe_crear_producto_con_codigo_unico`
2. **Aislamiento:** Cada test debe ser independiente
3. **Datos de prueba:** Usar factories o fixtures
4. **Limpieza:** Siempre limpiar datos en `afterEach`
5. **Asserts específicos:** Validar solo lo necesario
6. **Timeouts adecuados:** Ni muy cortos ni muy largos

## 🔗 Recursos Adicionales

- [Documentación Vitest](https://vitest.dev/)
- [Documentación Playwright](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Guía de Testing de Hono](https://hono.dev/docs/guides/testing)

## 📞 Soporte

Para consultas sobre testing, contactar al equipo de desarrollo o revisar la documentación oficial de las herramientas utilizadas.
