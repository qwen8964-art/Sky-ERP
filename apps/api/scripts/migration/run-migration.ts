/**
 * SCRIPT PRINCIPAL DE MIGRACIÓN - FASE 4
 *
 * Ejecuta todas las migraciones en el orden correcto:
 * 1. Configuración (Empresas, Sedes, Almacenes)
 * 2. Personas Unificadas (Clientes, Proveedores, Vendedores)
 * 3. Productos e Inventario
 * 4. Usuarios y Permisos
 * 5. Documentos de Venta
 * 6. Documentos de Compra
 * 7. Finanzas
 * 8. Contabilidad
 * 9. RRHH
 * 10. Producción y Capacitación
 */

import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Importar utilidades
import { connectToMySQL, connectToPostgreSQL, printSummary, MigrationStats } from './migration-utils';

// Importar módulos de migración
import { runConfiguracionMigration } from './01-configuracion';
import { runPersonasMigration } from './02-personas';
import { runProductosMigration } from './03-productos';
import { runUsuariosMigration } from './04-usuarios';
import { migrateDocumentosVenta } from './05-documentos-venta';
import { migrateDocumentosCompra } from './06-documentos-compra';
import { migrateFinanzas } from './07-finanzas';
import { migrateContabilidad } from './08-contabilidad';
import { migrateRRHH } from './09-rrhh';
import { migrateProduccionCapacitacion } from './10-produccion-capacitacion';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Configuración de conexión MySQL (Legacy)
 */
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'skynet_erp_legacy',
};

/**
 * Función principal de migración
 */
async function runMigration() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 SKY-ERP - FASE 4: MIGRACIÓN DE DATOS');
  console.log('='.repeat(80));
  console.log(`\n📅 Fecha: ${new Date().toISOString()}`);
  console.log(`📊 Origen: MySQL (${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database})`);
  console.log(`📊 Destino: PostgreSQL (Prisma)`);
  console.log('\n' + '-'.repeat(80));

  let mysqlConn;

  try {
    // Conectar a ambas bases de datos
    mysqlConn = await connectToMySQL();
    await connectToPostgreSQL();

    console.log('\n✅ Conexiones establecidas correctamente');

    // ========================================
    // EJECUTAR MIGRACIONES EN ORDEN
    // ========================================
    
    const stats = new MigrationStats();

    // 1. Configuración (Empresas, Sedes, Almacenes)
    await runConfiguracionMigration(mysqlConn);

    // 2. Personas Unificadas (Clientes, Proveedores, Vendedores)
    await runPersonasMigration(mysqlConn);

    // 3. Productos e Inventario
    await runProductosMigration(mysqlConn);

    // 4. Usuarios y Permisos
    await runUsuariosMigration(mysqlConn);

    // 5. Documentos de Venta (Cotizaciones, Comprobantes, Correlativos)
    await migrateDocumentosVenta(mysqlConn, prisma, stats);

    // 6. Documentos de Compra (Órdenes, Comprobantes, Guías)
    await migrateDocumentosCompra(mysqlConn, prisma, stats);

    // 7. Finanzas (Cajas, Bancos, Cheques, Letras, CTxC, CTxP)
    await migrateFinanzas(mysqlConn, prisma, stats);

    // 8. Contabilidad (Plan Cuentas, Libro Diario, Registros)
    await migrateContabilidad(mysqlConn, prisma, stats);

    // 9. RRHH (Trabajadores, Contratos, Planillas, Boletas)
    await migrateRRHH(mysqlConn, prisma, stats);

    // 10. Producción y Capacitación
    await migrateProduccionCapacitacion(mysqlConn, prisma, stats);

    // Imprimir resumen final
    printSummary(stats);

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ ERROR CRÍTICO EN LA MIGRACIÓN:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cerrar conexiones
    if (mysqlConn) {
      await mysqlConn.end();
      console.log('🔴 Conexión MySQL cerrada');
    }

    await prisma.$disconnect();
    console.log('🔴 Conexión PostgreSQL cerrada');
  }
}

// Ejecutar migración
runMigration()
  .then(() => {
    console.log('\n✅ Proceso de migración finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
