# 🚀 FASE 4: MIGRACIÓN DE DATOS - SKY-ERP

## Descripción

Esta carpeta contiene los scripts para migrar datos desde la base de datos MySQL del sistema legacy hacia la nueva base de datos PostgreSQL utilizando Prisma ORM.

## 📋 Requisitos Previos

1. **Tener instaladas ambas bases de datos:**
   - MySQL (con la base de datos legacy `skynet_erp_legacy`)
   - PostgreSQL (con la base de datos vacía `skyerp`)

2. **Configurar las variables de entorno:**
   
   Copiar `.env.example` a `.env` y configurar:
   
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env`:
   ```env
   # PostgreSQL (Destino)
   DATABASE_URL="postgresql://usuario:password@localhost:5432/skyerp?schema=public"
   
   # MySQL Legacy (Origen)
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=tu_password_mysql
   MYSQL_DATABASE=skynet_erp_legacy
   ```

3. **Instalar dependencias:**
   
   ```bash
   npm install
   ```

## 📁 Estructura de Scripts

```
scripts/migration/
├── migration-utils.ts       # Utilidades comunes (conexiones, logs, estadísticas)
├── 01-configuracion.ts      # Migración de Empresas, Sedes, Almacenes
├── 02-personas.ts           # Migración de Personas unificadas (Clientes, Proveedores, Vendedores)
├── 03-productos.ts          # Migración de Productos, Familias, Stock, Precios
├── 04-usuarios.ts           # (Pendiente) Migración de Usuarios y Permisos
├── 05-documentos.ts         # (Pendiente) Migración de Documentos y Correlativos
├── 06-finanzas.ts           # (Pendiente) Migración de Finanzas (CxC, CxP, Cheques, Letras)
├── 07-contabilidad.ts       # (Pendiente) Migración de Contabilidad
├── 08-rrhh.ts               # (Pendiente) Migración de Recursos Humanos
├── 09-produccion.ts         # (Pendiente) Migración de Producción
├── 10-capacitacion.ts       # (Pendiente) Migración de Capacitación
└── run-migration.ts         # Script principal que ejecuta todas las migraciones
```

## 🔧 Ejecutar Migración

### Migración Completa

Ejecutar todos los scripts de migración en orden:

```bash
npm run migrate:run
```

### Migración Individual por Módulo

Si deseas ejecutar solo un módulo específico, puedes modificar `run-migration.ts` o crear scripts individuales:

```bash
# Ejemplo: Solo migrar configuración
npx tsx scripts/migration/01-configuracion.ts

# Ejemplo: Solo migrar personas
npx tsx scripts/migration/02-personas.ts

# Ejemplo: Solo migrar productos
npx tsx scripts/migration/03-productos.ts
```

## 📊 Orden de Migración

El orden es crítico debido a las relaciones entre tablas:

1. **Configuración** → Empresas, Sedes, Almacenes
2. **Personas** → Personas base, luego Clientes, Proveedores, Vendedores
3. **Productos** → Familias, Productos, Listas Precio, Stock
4. **Usuarios** → Usuarios del sistema, Permisos
5. **Documentos** → Correlativos, Comprobantes, Guías
6. **Finanzas** → Cuentas por Cobrar/Pagar, Cheques, Letras
7. **Contabilidad** → Plan de cuentas, Libros
8. **RRHH** → Trabajadores, Contratos, Planillas
9. **Producción** → Fórmulas, Órdenes, Partes
10. **Capacitación** → Cursos, Matrículas, Calificaciones

## 📈 Estadísticas de Migración

Al finalizar, el script mostrará un resumen:

```
================================================================================
📊 RESUMEN DE MIGRACIÓN
================================================================================

Empresas:
   ✅ Migrados: 5
   ⏭️  Saltados: 0
   ❌ Errores: 0
   ⏱️  Tiempo: 0.45s

Personas:
   ✅ Migrados: 1250
   ⏭️  Saltados: 15
   ❌ Errores: 2
   ⏱️  Tiempo: 3.21s

...

TOTAL: 5432 migrados, 45 saltados, 3 errores
================================================================================
```

## ⚠️ Consideraciones Importantes

### 1. Datos Duplicados
- El script usa `upsert` para evitar duplicados
- Si hay conflictos, se actualizan los registros existentes

### 2. Integridad Referencial
- Los scripts verifican que las entidades relacionadas existan antes de crear
- Si una entidad padre no existe, el registro hijo se salta con advertencia

### 3. Estados de Registros
- Solo se migran registros con `Estado = 'A'` o `Estado = 1`
- Los registros inactivos se omiten

### 4. Fechas
- Las fechas de MySQL se convierten a objetos `Date` de JavaScript
- Las fechas nulas se manejan apropiadamente

### 5. Emails
- Todos los emails se convierten a minúsculas para consistencia

### 6. Roles de Persona
- Una Persona puede tener múltiples roles (CLIENTE, PROVEEDOR, VENDEDOR)
- Los roles se acumulan en un array

## 🐛 Solución de Problemas

### Error de Conexión MySQL
```
Error: connect ECONNREFUSED
```
**Solución:** Verificar que MySQL esté corriendo y las credenciales sean correctas.

### Error de Conexión PostgreSQL
```
Error: password authentication failed
```
**Solución:** Verificar `DATABASE_URL` en `.env` y que PostgreSQL esté corriendo.

### Error de Tabla No Encontrada
```
Table 'skynet_erp_legacy.mi_empresa' doesn't exist
```
**Solución:** Asegurarse de que la base de datos legacy tenga el nombre correcto y las tablas existan.

### Error de Violación de Llave Foránea
```
Foreign key constraint failed
```
**Solución:** Ejecutar las migraciones en el orden correcto. No saltar pasos.

## 📝 Próximos Pasos

Después de completar la migración:

1. **Validar datos migrados:**
   ```bash
   npm run db:studio
   ```

2. **Ejecutar tests de integridad:**
   ```bash
   npm test
   ```

3. **Continuar con migraciones pendientes:**
   - Usuarios y Permisos
   - Documentos y Correlativos
   - Finanzas
   - Contabilidad
   - RRHH
   - Producción
   - Capacitación

## 📞 Soporte

Para reportar errores o sugerencias, crear un issue en el repositorio del proyecto.

---

**SKY-ERP © 2024** - Sistema de Gestión Empresarial
