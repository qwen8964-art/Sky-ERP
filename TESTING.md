# Sky-ERP - Testing Guide

## 📋 Overview

Este documento describe cómo ejecutar las pruebas del proyecto Sky-ERP, incluyendo tests unitarios, de integración y end-to-end (E2E).

## 🧪 Tipos de Tests

### 1. Tests Unitarios (Vitest)

Los tests unitarios verifican funciones individuales y componentes de forma aislada.

#### API Backend

```bash
cd apps/api

# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch (desarrollo)
npm test -- --watch

# Ejecutar tests con coverage
npm test -- --coverage

# Ejecutar tests específicos
npm test -- auth.test.ts
npm test -- empresa.test.ts
```

**Archivos de test existentes:**
- `src/__tests__/auth.test.ts` - Tests para autenticación
- `src/__tests__/empresa.test.ts` - Tests para gestión de empresas

#### Frontend Web

```bash
cd apps/web

# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm test -- --watch

# Ejecutar tests con coverage
npm test -- --coverage

# Ejecutar tests específicos
npm test -- Button.test.tsx
npm test -- Login.test.tsx
```

**Archivos de test existentes:**
- `src/components/ui/Button.test.tsx` - Tests para componente Button
- `src/pages/__tests__/Login.test.tsx` - Tests para página de Login

### 2. Tests End-to-End (Playwright)

Los tests E2E verifican flujos completos de la aplicación desde la perspectiva del usuario.

```bash
# Instalar navegadores de Playwright (solo primera vez)
npx playwright install

# Ejecutar todos los tests E2E
npx playwright test

# Ejecutar tests en modo UI
npx playwright test --ui

# Ejecutar tests específicos
npx playwright test login.spec.ts

# Ejecutar tests en navegador específico
npx playwright test --project=chromium
npx playwright test --project=firefox

# Generar reporte HTML
npx playwright test --reporter=html
npx playwright show-report
```

**Archivos de test existentes:**
- `tests/e2e/login.spec.ts` - Tests E2E para login y navegación

## 📊 Cobertura de Tests

### API Backend

| Módulo | Tests Unitarios | Estado |
|--------|----------------|--------|
| Auth | ✅ 7 tests | Completo |
| Empresa | ✅ 8 tests | Completo |
| Sede | ⏳ Pendiente | Por implementar |
| Almacén | ⏳ Pendiente | Por implementar |
| Ventas | ⏳ Pendiente | Por implementar |
| Compras | ⏳ Pendiente | Por implementar |
| Inventario | ⏳ Pendiente | Por implementar |

### Frontend Web

| Componente/Página | Tests Unitarios | Estado |
|-------------------|----------------|--------|
| Button | ✅ 13 tests | Completo |
| Login Page | ✅ 5 tests | Completo |
| Dashboard | ⏳ Pendiente | Por implementar |
| Ventas Pages | ⏳ Pendiente | Por implementar |
| Inventario Pages | ⏳ Pendiente | Por implementar |

### E2E Tests

| Flujo | Tests E2E | Estado |
|-------|-----------|--------|
| Login | ✅ 6 tests | Completo |
| Navegación a módulos | ✅ 2 tests | Completo |
| Responsive design | ✅ 2 tests | Completo |

## 🚀 CI/CD Pipeline

El pipeline de CI/CD está configurado en `.github/workflows/ci-cd.yml` e incluye:

### Jobs

1. **Test**: Ejecuta tests unitarios para API y Web
2. **E2E**: Ejecuta tests end-to-end con Playwright
3. **Build**: Construye ambas aplicaciones
4. **Deploy**: Despliega a producción (solo en main)

### Ejecución Local del Pipeline

```bash
# Simular pipeline localmente
npm run test              # Tests unitarios
npm run test:e2e          # Tests E2E
npm run build             # Build de producción
```

## 🐳 Docker para Testing

```bash
# Levantar entorno completo con Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ejecutar tests dentro del contenedor
docker-compose exec api npm test
docker-compose exec web npm test

# Detener entorno
docker-compose down
```

## 📈 Métricas de Calidad

### Coverage Mínimo Requerido

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Verificar Coverage

```bash
# API
cd apps/api
npm test -- --coverage
open coverage/index.html

# Web
cd apps/web
npm test -- --coverage
open coverage/index.html
```

## 🔧 Configuración

### Variables de Entorno para Tests

Crear archivo `.env.test` en cada app:

**apps/api/.env.test:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skynet_erp_test
JWT_SECRET=test-secret-key-for-testing-only
PORT=4001
NODE_ENV=test
```

**apps/web/.env.test:**
```env
VITE_API_URL=http://localhost:4001
NODE_ENV=test
```

## 📝 Mejores Prácticas

1. **Nomenclatura**: Los archivos de test deben terminar en `.test.ts` o `.spec.ts`
2. **Ubicación**: 
   - API: `src/__tests__/`
   - Web: `src/**/__tests__/` o junto al componente
   - E2E: `tests/e2e/`
3. **Mocks**: Usar `vi.mock()` para dependencias externas
4. **Arrange-Act-Assert**: Seguir patrón AAA en los tests
5. **Tests Independientes**: Cada test debe ser independiente y no depender de otros
6. **Cleanup**: Limpiar mocks y estados en `beforeEach`

## 🐛 Debugging

### Tests Unitarios

```bash
# Ejecutar test específico con logs
npm test -- --reporter=verbose auth.test.ts

# Ejecutar con inspect
npm test -- --inspect auth.test.ts
```

### Tests E2E

```bash
# Ejecutar en modo debug
npx playwright test --debug

# Ejecutar con trace
npx playwright test --trace on
npx playwright show-trace
```

## 📚 Recursos Adicionales

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Mocking with Vitest](https://vitest.dev/guide/mocking.html)

## ✅ Checklist de Testing

Antes de hacer commit:

- [ ] Tests unitarios pasan localmente
- [ ] Coverage mínimo alcanzado (80%)
- [ ] Tests E2E críticos pasan
- [ ] No hay console.errors en los tests
- [ ] Los nuevos features tienen tests asociados
