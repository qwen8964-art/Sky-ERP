/**
 * MIGRACIÓN 1: EMPRESAS, SEDES Y ALMACENES
 * 
 * Migra las tablas:
 * - mi_empresa → Empresa
 * - mi_sede → Sede
 * - mi_almacen → Almacen
 */

import { Connection } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { initStats, logMigrated, logError } from './migration-utils';

const prisma = new PrismaClient();

/**
 * Migrar Empresas
 */
export async function migrateEmpresas(mysqlConn: Connection) {
  console.log('\n📦 Migrando Empresas...');
  const stats = initStats('Empresas');
  
  try {
    // Obtener empresas de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdMiEmpresa,
        Ruc,
        RazonSocial,
        NombreComercial,
        Direccion,
        Telefono,
        Email,
        Web,
        Logo,
        IGV,
        Moneda,
        Estado,
        FechaRegistro
      FROM mi_empresa
      WHERE Estado = 'A' OR Estado = 1
    `);
    
    console.log(`   📋 Encontradas ${rows.length} empresas`);
    
    for (const row of rows) {
      try {
        await prisma.empresa.upsert({
          where: { idMiEmpresa: row.IdMiEmpresa },
          update: {
            ruc: row.Ruc,
            razonSocial: row.RazonSocial,
            nombreComercial: row.NombreComercial,
            direccion: row.Direccion,
            telefono: row.Telefono,
            email: row.Email,
            web: row.Web,
            logo: row.Logo,
            igv: parseFloat(row.IGV) || 18,
            moneda: row.Moneda || 'PEN',
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
          create: {
            idMiEmpresa: row.IdMiEmpresa,
            ruc: row.Ruc,
            razonSocial: row.RazonSocial,
            nombreComercial: row.NombreComercial,
            direccion: row.Direccion,
            telefono: row.Telefono,
            email: row.Email,
            web: row.Web,
            logo: row.Logo,
            igv: parseFloat(row.IGV) || 18,
            moneda: row.Moneda || 'PEN',
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('Empresas');
      } catch (error: any) {
        logError('Empresas', error, row);
      }
    }
    
    console.log(`   ✅ Empresas migradas: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Empresas:', error.message);
  }
}

/**
 * Migrar Sedes
 */
export async function migrateSedes(mysqlConn: Connection) {
  console.log('\n🏢 Migrando Sedes...');
  const stats = initStats('Sedes');
  
  try {
    // Obtener sedes de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdMiSede,
        IdMiEmpresa,
        Codigo,
        Nombre,
        Direccion,
        Telefono,
        Email,
        Responsable,
        Estado,
        FechaRegistro
      FROM mi_sede
      WHERE Estado = 'A' OR Estado = 1
    `);
    
    console.log(`   📋 Encontradas ${rows.length} sedes`);
    
    for (const row of rows) {
      try {
        // Verificar que la empresa existe
        const empresaExists = await prisma.empresa.findUnique({
          where: { idMiEmpresa: row.IdMiEmpresa },
        });
        
        if (!empresaExists) {
          console.warn(`   ⚠️  Sede ${row.IdMiSede} saltada: Empresa ${row.IdMiEmpresa} no existe`);
          stats.skipped++;
          continue;
        }
        
        await prisma.sede.upsert({
          where: { idMiSede: row.IdMiSede },
          update: {
            codigo: row.Codigo,
            nombre: row.Nombre,
            direccion: row.Direccion,
            telefono: row.Telefono,
            email: row.Email,
            responsable: row.Responsable,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
          create: {
            idMiSede: row.IdMiSede,
            idMiEmpresa: row.IdMiEmpresa,
            codigo: row.Codigo,
            nombre: row.Nombre,
            direccion: row.Direccion,
            telefono: row.Telefono,
            email: row.Email,
            responsable: row.Responsable,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('Sedes');
      } catch (error: any) {
        logError('Sedes', error, row);
      }
    }
    
    console.log(`   ✅ Sedes migradas: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Sedes:', error.message);
  }
}

/**
 * Migrar Almacenes
 */
export async function migrateAlmacenes(mysqlConn: Connection) {
  console.log('\n📦 Migrando Almacenes...');
  const stats = initStats('Almacenes');
  
  try {
    // Obtener almacenes de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdMiAlmacen,
        IdMiSede,
        Codigo,
        Nombre,
        Direccion,
        Telefono,
        Responsable,
        Tipo,
        Estado,
        FechaRegistro
      FROM mi_almacen
      WHERE Estado = 'A' OR Estado = 1
    `);
    
    console.log(`   📋 Encontrados ${rows.length} almacenes`);
    
    for (const row of rows) {
      try {
        // Verificar que la sede existe
        const sedeExists = await prisma.sede.findUnique({
          where: { idMiSede: row.IdMiSede },
        });
        
        if (!sedeExists) {
          console.warn(`   ⚠️  Almacén ${row.IdMiAlmacen} saltado: Sede ${row.IdMiSede} no existe`);
          stats.skipped++;
          continue;
        }
        
        await prisma.almacen.upsert({
          where: { idMiAlmacen: row.IdMiAlmacen },
          update: {
            codigo: row.Codigo,
            nombre: row.Nombre,
            direccion: row.Direccion,
            telefono: row.Telefono,
            responsable: row.Responsable,
            tipo: row.Tipo || 'GENERAL',
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
          create: {
            idMiAlmacen: row.IdMiAlmacen,
            idMiSede: row.IdMiSede,
            codigo: row.Codigo,
            nombre: row.Nombre,
            direccion: row.Direccion,
            telefono: row.Telefono,
            responsable: row.Responsable,
            tipo: row.Tipo || 'GENERAL',
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('Almacenes');
      } catch (error: any) {
        logError('Almacenes', error, row);
      }
    }
    
    console.log(`   ✅ Almacenes migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Almacenes:', error.message);
  }
}

/**
 * Ejecutar todas las migraciones de configuración
 */
export async function runConfiguracionMigration(mysqlConn: Connection) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INICIANDO MIGRACIÓN DE CONFIGURACIÓN');
  console.log('='.repeat(80));
  
  await migrateEmpresas(mysqlConn);
  await migrateSedes(mysqlConn);
  await migrateAlmacenes(mysqlConn);
  
  console.log('\n✅ MIGRACIÓN DE CONFIGURACIÓN COMPLETADA');
}
