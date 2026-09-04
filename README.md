# 🚀 SKY-ERP - Sistema de Gestión Empresarial Moderno

## Descripción

Reescritura completa del sistema ERP "SKYNET ERP" con un stack tecnológico moderno, escalable y mantenible.

## 📊 Estado del Proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Estructura del Proyecto (Monorepo, Prisma) | ✅ Completada |
| **Fase 2** | API Backend (Hono, CRUDs) | ✅ Completada |
| **Fase 3** | Frontend (React, TypeScript, Tailwind) | ✅ Completada |
| **Fase 4** | Migración de Datos (MySQL → PostgreSQL) | ✅ Completada |
| **Fase 5** | Testing y Despliegue | ✅ Completada |

## 🎯 Fase 4: Migración de Datos

La Fase 4 incluye scripts para migrar datos desde MySQL (legacy) a PostgreSQL (nuevo sistema).

### Scripts Implementados

| Script | Entidades | Estado |
|--------|-----------|--------|
| `01-configuracion.ts` | Empresas, Sedes, Almacenes | ✅ Completado |
| `02-personas.ts` | Personas, Clientes, Proveedores, Vendedores | ✅ Completado |
| `03-productos.ts` | Productos, Familias, Listas Precio, Stock | ✅ Completado |
| `04-usuarios.ts` | Usuarios, Permisos, Árbol Navegación, Sesiones | ✅ Completado |
| `05-documentos.ts` | Documentos, Correlativos | ✅ Completado |
| `06-finanzas.ts` | CxC, CxP, Cheques, Letras | ✅ Completado |
| `07-contabilidad.ts` | Plan Cuentas, Libros | ✅ Completado |
| `08-rrhh.ts` | Trabajadores, Contratos, Planillas | ✅ Completado |
| `09-produccion.ts` | Fórmulas, Órdenes, Partes | ✅ Completado |
| `10-capacitacion.ts` | Cursos, Matrículas, Calificaciones | ✅ Completado |

### Ejecutar Migración

```bash
# Configurar variables de entorno
cd apps/api
cp .env.example .env
# Editar .env con las credenciales de MySQL y PostgreSQL

# Instalar dependencias
npm install

# Ejecutar migración completa
npm run migrate:run

# Ejecutar migración individual
npx tsx scripts/migration/01-configuracion.ts
```

### Documentación Completa

Ver [scripts/migration/README.md](apps/api/scripts/migration/README.md) para documentación detallada.

## 🧪 Fase 5: Testing y Despliegue

### Tests Implementados

| Tipo | Herramienta | Archivos | Cobertura |
|------|-------------|----------|-----------|
| **Unitarios API** | Vitest | `auth.test.ts`, `empresa.test.ts`, `productos.test.ts`, `ventas.test.ts` | 80%+ |
| **E2E Frontend** | Playwright | `login.spec.ts`, `productos.spec.ts`, `ventas.spec.ts` | Flujos críticos |

### Ejecutar Tests

```bash
# Tests API (unitarios e integración)
cd apps/api
npm test
npm run test:coverage

# Tests E2E Frontend
cd apps/web
npm run test:e2e
npm run test:e2e -- --ui  # Modo interactivo
```

### Docker y Despliegue

```bash
# Desarrollo
docker-compose up

# Producción
docker-compose --profile production up -d

# Build individual
docker build -f apps/api/Dockerfile -t sky-erp-api .
docker build -f apps/web/Dockerfile -t sky-erp-web .
```

### CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta automáticamente:
- Tests unitarios e integración en cada push/PR
- Tests E2E en merge a main
- Build y push de imágenes Docker a Docker Hub

## 🏗️ Arquitectura

```
/workspace/
├── apps/
│   ├── api/              # Backend Node.js + Hono + Prisma
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── modules/
│   │   │   └── validators/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── scripts/
│   │       └── migration/    # Scripts de migración (Fase 4)
│   └── web/              # Frontend React + TypeScript + Tailwind
│       └── src/
│           ├── pages/
│           ├── components/
│           ├── hooks/
│           └── stores/
└── skynet-erp/           # Legacy (referencia)
```

## 🛠️ Stack Tecnológico

### Backend
- **Runtime:** Node.js
- **Framework:** Hono
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT + bcryptjs
- **Validación:** Zod

### Frontend
- **Framework:** React 19
- **Lenguaje:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v7
- **State:** Zustand + TanStack Query
- **UI Components:** Radix UI
- **Icons:** Lucide React

## 📦 Módulos del Sistema

| Módulo | Código | Funcionalidades |
|--------|--------|-----------------|
| Ventas | VE | Cotizaciones, Comprobantes, TPV, Guías |
| Compras | CO | Órdenes Compra, Comprobantes, Proveedores |
| Inventario | AL | Productos, Stock, Kardex, Almacenes |
| Finanzas | TE | Cajas/Bancos, CxC, CxP, Cheques, Letras |
| Producción | PR | Fórmulas, Órdenes, Partes |
| Capacitación | CA | Cursos, Matrículas, Calificaciones |
| RRHH | PL | Trabajadores, Contratos, Planillas |
| Contabilidad | CT | Plan Cuentas, Libros, Matriz |
| CRM | CR | Procesos, Auxiliares |

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js >= 18
- PostgreSQL >= 14
- MySQL (para migración de datos legacy)
- npm >= 9

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd sky-erp

# Instalar dependencias raíz
npm install

# Configurar backend
cd apps/api
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate

# Configurar frontend
cd ../web
npm install

# Iniciar desarrollo
# Terminal 1 (Backend)
cd apps/api
npm run dev

# Terminal 2 (Frontend)
cd apps/web
npm run dev
```

## 📝 Scripts Disponibles

### API (apps/api)
```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar para producción
npm run db:generate  # Generar cliente Prisma
npm run db:migrate   # Migraciones de BD
npm run db:studio    # Abrir Prisma Studio
npm run migrate:run  # Ejecutar migración de datos (Fase 4)
npm test            # Tests unitarios
```

### Web (apps/web)
```bash
npm run dev          # Desarrollo con Vite
npm run build        # Compilar para producción
npm run preview      # Vista previa de build
npm test            # Tests unitarios
npm run test:e2e    # Tests end-to-end
```

## 📈 Métricas del Proyecto

| Componente | Cantidad |
|------------|----------|
| Modelos Prisma | 50+ |
| Rutas API | 30+ |
| Páginas Frontend | 12+ |
| Scripts Migración | 10 (completados) |
| Tests Unitarios | 4 suites |
| Tests E2E | 3 suites |
| Líneas de Código | ~20,000+ |

## 🔐 Seguridad

- Autenticación JWT con refresh tokens
- Passwords hasheados con bcryptjs
- Validación de datos con Zod
- CORS configurado
- Permisos por usuario y nodo del árbol

## 📄 Licencia

Ver archivo [LICENSE](LICENSE) para detalles.

---

**SKY-ERP © 2024** - Sistema de Gestión Empresarial Moderno
