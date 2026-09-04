# 🗺️ Sky-ERP: Roadmap de Implementación y Fases Pendientes

> **Documento Maestro de Desarrollo**  
> **Versión:** 1.0.0  
> **Última Actualización:** Octubre 2023  
> **Estado del Proyecto:** Fase 5 Completada (Testing & Deploy) - Pre-Producción

---

## 📋 Resumen Ejecutivo

El proyecto **Sky-ERP** ha completado exitosamente las Fases 1 a 5 (Estructura, Backend, Frontend, Migración y Testing). Sin embargo, una auditoría técnica exhaustiva ha identificado riesgos críticos de integridad de datos, cumplimiento legal (SUNAT) y escalabilidad que deben abordarse antes del despliegue en producción.

Este documento detalla el plan de acción para llevar el sistema de un estado "Funcional" a un estado "Empresarial/Producción".

---

## 🚨 Hallazgos de Auditoría (Punto de Partida)

Antes de iniciar nuevas funcionalidades, se deben resolver los siguientes puntos críticos identificados:

### 1. Críticos (Bloqueantes para Producción)
- [ ] **Falta de Transaccionalidad:** Operaciones de venta/compra no usan transacciones atómicas, riesgo de corrupción de datos (stock vs documento).
- [ ] **Cumplimiento Legal (SUNAT):** Ausencia de facturación electrónica (UBL 2.1) y libros electrónicos PLE.
- [ ] **Manejo de Errores:** Exposición de stack traces y falta de estandarización en respuestas de error.
- [ ] **Validación de Stock:** Condiciones de carrera permiten stock negativo.

### 2. Altos (Deuda Técnica)
- [ ] **Arquitectura Anémica:** Lógica de negocio dispersa en controladores.
- [ ] **Hardcoding:** IGV (18%) y configuraciones críticas hardcodeadas.
- [ ] **Seguridad JWT:** Falta de rotación de tokens y manejo de expiración robusto.
- [ ] **UI/UX:** Validación de formularios solo en backend, estados de carga inconsistentes.

### 3. Medios (Escalabilidad)
- [ ] **Rendimiento:** Ausencia de caché (Redis) y colas de procesamiento.
- [ ] **Tiempo Real:** No hay WebSockets para notificaciones.
- [ ] **Auditoría:** Logs de trazabilidad insuficientes.

---

## 🛣️ Roadmap de Implementación Detallado

### 🏁 Fase 6: Estabilización del Core y Seguridad
**Objetivo:** Garantizar integridad de datos y seguridad básica.  
**Duración Estimada:** 2 Semanas

| ID | Tarea | Descripción Técnica | Prioridad |
|----|-------|---------------------|-----------|
| 6.1 | **Transaccionalidad ACID** | Envolver operaciones de Venta/Compra/Traslado en `prisma.$transaction()`. Implementar bloqueos optimistas/pesimistas para stock. | 🔴 Crítica |
| 6.2 | **Middleware de Errores Global** | Crear `ErrorHandler` centralizado. Estandarizar respuesta `{ success: false, code, message, details }`. Ocultar detalles internos en prod. | 🔴 Crítica |
| 6.3 | **Refactor a Service Layer** | Mover lógica de negocio de Controladores a Servicios (`VentaService`, `StockService`). Controladores solo manejan HTTP. | 🟠 Alta |
| 6.4 | **Validación Zod Robusta** | Revisar todos los schemas. Agregar validaciones complejas (RUC válido, fechas lógicas). | 🟠 Alta |
| 6.5 | **Seguridad JWT Avanzada** | Implementar Refresh Tokens. Configurar expiración corta de Access Tokens. Blacklist de tokens revocados. | 🟠 Alta |
| 6.6 | **Sistema de Auditoría (Logs)** | Middleware que registre: Usuario, IP, Endpoint, Payload, Tiempo, Estado. Tabla `system_logs`. | 🟠 Alta |

### ⚖️ Fase 7: Lógica de Negocio Avanzada y Motor Contable
**Objetivo:** Automatización contable y reglas de negocio complejas.  
**Duración Estimada:** 3 Semanas

| ID | Tarea | Descripción Técnica | Prioridad |
|----|-------|---------------------|-----------|
| 7.1 | **Motor de Impuestos Dinámico** | Configurar IGV/ISC/ICBPER desde BD. Soporte para productos exonerados/inafectos. | 🟠 Alta |
| 7.2 | **Gestión de Stock Concurrente** | Implementar cola de reservas de stock. Prevenir ventas sobre stock no disponible. | 🟠 Alta |
| 7.3 | **Motor Contable Automático** | Matriz contable dinámica. Generación automática de asientos al aprobar documentos (Venta, Compra, Banco). | 🟡 Media |
| 7.4 | **Módulo de Nómina (RRHH)** | Cálculo de planillas: AFP, Essalud, ONP, Gratificaciones, CTS, Vacaciones. | 🟡 Media |
| 7.5 | **MRP Básico (Producción)** | Explosión de materiales. Cálculo de requerimientos basado en Órdenes de Producción. | 🟡 Media |

### 🇵🇪 Fase 8: Cumplimiento Legal (SUNAT) - CRÍTICO PARA PERÚ
**Objetivo:** Emisión de comprobantes electrónicos válidos y libros tributarios.  
**Duración Estimada:** 4-6 Semanas

| ID | Tarea | Descripción Técnica | Prioridad |
|----|-------|---------------------|-----------|
| 8.1 | **Facturación Electrónica (UBL 2.1)** | Generación de XML UBL. Firma digital con certificado .pfx. Comunicación con SOAP SUNAT. | 🔴 Crítica |
| 8.2 | **Gestión de CDRE/RUE** | Descarga y procesamiento de Respuestas SUNAT (Aceptado/Rechazado). | 🔴 Crítica |
| 8.3 | **Libros Electrónicos PLE** | Generación de archivos TXT para Libro Diario, Mayor, Ventas, Compras (formato SUNAT). | 🔴 Crítica |
| 8.4 | **Consulta RUC/DNI** | Integración con API de RENIEC/SUNAT (o proveedores terceros como ApisPeru/DniPeru). | 🟠 Alta |
| 8.5 | **Reportes Legales** | Formato impreso de Facturas/Boletas según normativa vigente. | 🟠 Alta |

### 🚀 Fase 9: Escalabilidad y Rendimiento
**Objetivo:** Soportar alta concurrencia y mejorar experiencia de usuario.  
**Duración Estimada:** 3 Semanas

| ID | Tarea | Descripción Técnica | Prioridad |
|----|-------|---------------------|-----------|
| 9.1 | **Implementación de Redis** | Caché para consultas frecuentes (Listas de precios, Configuración, Sesiones). | 🟡 Media |
| 9.2 | **Colas de Trabajo (BullMQ)** | Procesamiento asíncrono: Envío de emails, Generación de PDFs pesados, Envío a SUNAT. | 🟡 Media |
| 9.3 | **WebSockets (Socket.io)** | Notificaciones en tiempo real: Nueva venta, Stock bajo, Aprobación de documentos. | 🟡 Media |
| 9.4 | **Multi-Tenancy (SaaS)** | Aislamiento estricto de datos por empresa (Row Level Security o Schema por tenant). | 🟢 Baja |
| 9.5 | **Optimización DB** | Índices compuestos, particionamiento de tablas históricas (Kardex, Asientos). | 🟢 Baja |

### 📊 Fase 10: Business Intelligence y Reportes Avanzados
**Objetivo:** Transformar datos en información estratégica.  
**Duración Estimada:** 4 Semanas

| ID | Tarea | Descripción Técnica | Prioridad |
|----|-------|---------------------|-----------|
| 10.1 | **Motor de Reportes Dinámico** | Construcción de queries dinámicas con filtros avanzados. Exportación Excel/PDF. | 🟡 Media |
| 10.2 | **Dashboard Ejecutivo** | KPIs en tiempo real: Ventas vs Meta, Margen, Rotación de Inventarios, Flujo de Caja. | 🟡 Media |
| 10.3 | **Migración de 170+ Reportes Legacy** | Adaptación de reportes históricos al nuevo motor. | 🟢 Baja |

---

## 🏗️ Estándares Técnicos y Arquitectura

Para todas las fases futuras, se debe adherir estrictamente a:

### 1. Patrón de Diseño
- **Controller-Service-Repository**:
  - `Controller`: Manejo de Request/Response, Validación inicial.
  - `Service`: Lógica de negocio pura, Transacciones, Reglas complejas.
  - `Repository` (Prisma): Acceso directo a DB.

### 2. Manejo de Errores
```typescript
// Estándar de respuesta de error
{
  "success": false,
  "error": {
    "code": "STOCK_INSUFFICIENT",
    "message": "No hay suficiente stock para el producto X",
    "details": { "available": 5, "requested": 10 }
  }
}
```

### 3. Transaccionalidad
Toda operación que modifique más de una tabla o afecte stock/dinero DEBE usar:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Validar stock
  // 2. Crear documento
  // 3. Descontar stock
  // 4. Generar cuenta por cobrar
}, { timeout: 10000 });
```

### 4. Validaciones
- **Frontend:** Validación inmediata (Zod + React Hook Form) para UX.
- **Backend:** Validación defensiva obligatoria (Zod Schema) para Seguridad.

---

## 📅 Cronograma Sugerido (Hitos)

| Hito | Fecha Objetivo | Entregable Clave |
|------|----------------|------------------|
| **M1: Core Estable** | +2 Semanas | Transacciones OK, Errores manejados, Auth seguro. |
| **M2: Negocio Completo** | +5 Semanas | Contabilidad auto, RRHH, Stock seguro. |
| **M3: Legal Perú** | +9 Semanas | Facturación Electrónica operativa, Libros PLE. |
| **M4: Escalable** | +12 Semanas | Redis, Colas, WebSockets activos. |
| **M5: Lanzamiento** | +16 Semanas | Beta cerrada con clientes reales. |

---

## 🛠️ Recursos y Dependencias Externas

| Recurso | Uso | Proveedor Sugerido |
|---------|-----|--------------------|
| **Certificado Digital** | Firma XML | Autoridad Certificadora (ej. Izenpe, Camerfirma) |
| **API RUC/DNI** | Validación socios | ApisPeru, DniPeru, Reniec (directo) |
| **Servidor SMTP** | Envío correos | AWS SES, SendGrid, Gmail |
| **Hosting DB** | PostgreSQL Prod | AWS RDS, Supabase, Neon |
| **CI/CD** | Deploy automático | GitHub Actions (Configurado) |

---

## ✅ Checklist de "Definition of Done" (DoD)

Para considerar una tarea de este roadmap como completada, debe cumplir:
1. [ ] Código implementado y revisado (PR aprobado).
2. [ ] Tests unitarios escritos y pasando (>80% cobertura en lógica crítica).
3. [ ] Pruebas manuales de flujo feliz y casos borde realizadas.
4. [ ] Documentación actualizada (Swagger/README).
5. [ ] Desplegado en ambiente de Staging.
6. [ ] Validado contra datos reales (si aplica).

---

## 📝 Notas para el Equipo de Desarrollo

- **Prioridad SUNAT:** En el contexto peruano, sin facturación electrónica el ERP no es vendible. La Fase 8 tiene prioridad sobre la 9 y 10.
- **Deuda Técnica:** No acumular más deuda. Si se detecta un "atajo" inseguro, refactorizar inmediatamente en la Fase 6.
- **Datos Reales:** Usar los scripts de migración (Fase 4) constantemente para probar con volumen de datos real, no solo datos dummy.

---

*Este documento es vivo y debe actualizarse al completar cada hito o surgir nuevos requerimientos.*
