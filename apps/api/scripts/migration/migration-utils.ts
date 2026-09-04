/**
 * FASE 4: MIGRACIÓN DE DATOS - SKY-ERP
 * 
 * Scripts para migrar datos desde MySQL (Legacy) a PostgreSQL (Nuevo Sistema)
 * 
 * Módulos de migración:
 * 1. Empresas, Sedes y Almacenes
 * 2. Personas unificadas (Clientes, Proveedores, Vendedores)
 * 3. Productos y Familias
 * 4. Usuarios y Permisos
 * 5. Documentos y Correlativos
 * 6. Stock e Inventario
 * 7. Finanzas (CxC, CxP, Cheques, Letras)
 * 8. Contabilidad
 * 9. RRHH
 * 10. Producción
 * 11. Capacitación
 */

import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Configuración de conexión MySQL (Legacy)
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'skynet_erp_legacy',
};

// Configuración de conexión PostgreSQL (Nuevo)
const POSTGRES_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'skyerp',
};

// Estadísticas de migración
interface MigrationStats {
  entity: string;
  migrated: number;
  skipped: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

const stats: Map<string, MigrationStats> = new Map();

/**
 * Conectar a MySQL Legacy
 */
async function connectToMySQL() {
  console.log('🔵 Conectando a MySQL Legacy...');
  try {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Conectado a MySQL Legacy');
    return connection;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    throw error;
  }
}

/**
 * Conectar a PostgreSQL (Prisma)
 */
async function connectToPostgreSQL() {
  console.log('🟢 Conectando a PostgreSQL...');
  try {
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL');
    return prisma;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
    throw error;
  }
}

/**
 * Inicializar estadísticas para una entidad
 */
function initStats(entity: string): MigrationStats {
  const stat: MigrationStats = {
    entity,
    migrated: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date(),
  };
  stats.set(entity, stat);
  return stat;
}

/**
 * Registrar migración exitosa
 */
function logMigrated(entity: string, count: number = 1) {
  const stat = stats.get(entity);
  if (stat) {
    stat.migrated += count;
  }
}

/**
 * Registro de error
 */
function logError(entity: string, error: any, data?: any) {
  const stat = stats.get(entity);
  if (stat) {
    stat.errors++;
  }
  console.error(`   ❌ Error en ${entity}:`, error.message);
  if (data) {
    console.error('      Datos:', JSON.stringify(data).substring(0, 200));
  }
}

/**
 * Imprimir resumen de migración
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('='.repeat(80));
  
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  stats.forEach((stat, entity) => {
    stat.endTime = new Date();
    const duration = ((stat.endTime.getTime() - stat.startTime.getTime()) / 1000).toFixed(2);
    console.log(`\n${entity}:`);
    console.log(`   ✅ Migrados: ${stat.migrated}`);
    console.log(`   ⏭️  Saltados: ${stat.skipped}`);
    console.log(`   ❌ Errores: ${stat.errors}`);
    console.log(`   ⏱️  Tiempo: ${duration}s`);
    
    totalMigrated += stat.migrated;
    totalSkipped += stat.skipped;
    totalErrors += stat.errors;
  });
  
  console.log('\n' + '-'.repeat(80));
  console.log(`TOTAL: ${totalMigrated} migrados, ${totalSkipped} saltados, ${totalErrors} errores`);
  console.log('='.repeat(80));
}

export {
  connectToMySQL,
  connectToPostgreSQL,
  initStats,
  logMigrated,
  logError,
  printSummary,
  PrismaClient,
};
