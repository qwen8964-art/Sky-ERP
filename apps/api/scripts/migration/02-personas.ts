/**
 * MIGRACIÓN 2: PERSONAS UNIFICADAS
 * 
 * Migra y unifica las tablas:
 * - persona → Persona (base)
 * - cliente → Persona (tipo: CLIENTE)
 * - proveedor → Persona (tipo: PROVEEDOR)
 * - vendedores → Persona (tipo: VENDEDOR)
 * 
 * Nota: En el nuevo sistema, una Persona puede tener múltiples roles
 */

import { Connection } from 'mysql2/promise';
import { Prisma, PrismaClient } from '@prisma/client';
import { initStats, logMigrated, logError } from './migration-utils';

const prisma = new PrismaClient();

/**
 * Migrar Personas (tabla base)
 */
export async function migratePersonas(mysqlConn: Connection) {
  console.log('\n👤 Migrando Personas...');
  const stats = initStats('Personas');
  
  try {
    // Obtener personas de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdPersona,
        TipoDocumento,
        NumeroDocumento,
        Nombres,
        Apellidos,
        RazonSocial,
        Genero,
        FechaNacimiento,
        Direccion,
        Referencia,
        IdDistrito,
        Provincia,
        Region,
        Pais,
        Telefono,
        Celular,
        Email,
        Web,
        Profesion,
        LOGIN,
        PASSWORD,
        Estado,
        FechaRegistro,
        FechaModificacion
      FROM persona
      ORDER BY IdPersona
    `);
    
    console.log(`   📋 Encontradas ${rows.length} personas`);
    
    for (const row of rows) {
      try {
        await prisma.persona.upsert({
          where: { idPersona: row.IdPersona },
          update: {
            tipoDocumento: row.TipoDocumento || 'DNI',
            numeroDocumento: row.NumeroDocumento,
            nombres: row.Nombres,
            apellidos: row.Apellidos,
            razonSocial: row.RazonSocial,
            genero: row.Genero,
            fechaNacimiento: row.FechaNacimiento ? new Date(row.FechaNacimiento) : null,
            direccion: row.Direccion,
            referencia: row.Referencia,
            idDistrito: row.IdDistrito,
            provincia: row.Provincia,
            region: row.Region,
            pais: row.Pais || 'PE',
            telefono: row.Telefono,
            celular: row.Celular,
            email: row.Email?.toLowerCase(),
            web: row.Web,
            profesion: row.Profesion,
            login: row.LOGIN,
            password: row.PASSWORD,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
          create: {
            idPersona: row.IdPersona,
            tipoDocumento: row.TipoDocumento || 'DNI',
            numeroDocumento: row.NumeroDocumento,
            nombres: row.Nombres,
            apellidos: row.Apellidos,
            razonSocial: row.RazonSocial,
            genero: row.Genero,
            fechaNacimiento: row.FechaNacimiento ? new Date(row.FechaNacimiento) : null,
            direccion: row.Direccion,
            referencia: row.Referencia,
            idDistrito: row.IdDistrito,
            provincia: row.Provincia,
            region: row.Region,
            pais: row.Pais || 'PE',
            telefono: row.Telefono,
            celular: row.Celular,
            email: row.Email?.toLowerCase(),
            web: row.Web,
            profesion: row.Profesion,
            login: row.LOGIN,
            password: row.PASSWORD,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
        });
        logMigrated('Personas');
      } catch (error: any) {
        logError('Personas', error, row);
      }
    }
    
    console.log(`   ✅ Personas migradas: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Personas:', error.message);
  }
}

/**
 * Migrar Clientes y asignar rol CLIENTE
 */
export async function migrateClientes(mysqlConn: Connection) {
  console.log('\n🛒 Migrando Clientes...');
  const stats = initStats('Clientes');
  
  try {
    // Obtener clientes de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        c.IdCliente,
        c.IdPersona,
        c.TipoCliente,
        c.Descuento,
        c.LimiteCredito,
        c.Moneda,
        c.Vendedor,
        c.Ruta,
        c.Zona,
        c.Estado,
        c.FechaRegistro
      FROM cliente c
      INNER JOIN persona p ON c.IdPersona = p.IdPersona
      WHERE c.Estado = 'A' OR c.Estado = 1
      ORDER BY c.IdCliente
    `);
    
    console.log(`   📋 Encontrados ${rows.length} clientes`);
    
    for (const row of rows) {
      try {
        // Verificar que la persona existe
        const personaExists = await prisma.persona.findUnique({
          where: { idPersona: row.IdPersona },
        });
        
        if (!personaExists) {
          console.warn(`   ⚠️  Cliente ${row.IdCliente} saltado: Persona ${row.IdPersona} no existe`);
          stats.skipped++;
          continue;
        }
        
        // Crear o actualizar cliente con rol
        await prisma.cliente.upsert({
          where: { idCliente: row.IdCliente },
          update: {
            tipoCliente: row.TipoCliente || 'NATURAL',
            descuento: parseFloat(row.Descuento) || 0,
            limiteCredito: parseFloat(row.LimiteCredito) || 0,
            moneda: row.Moneda || 'PEN',
            idVendedor: row.Vendedor,
            ruta: row.Ruta,
            zona: row.Zona,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idCliente: row.IdCliente,
            idPersona: row.IdPersona,
            tipoCliente: row.TipoCliente || 'NATURAL',
            descuento: parseFloat(row.Descuento) || 0,
            limiteCredito: parseFloat(row.LimiteCredito) || 0,
            moneda: row.Moneda || 'PEN',
            idVendedor: row.Vendedor,
            ruta: row.Ruta,
            zona: row.Zona,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        
        // Actualizar persona para incluir rol de cliente
        await prisma.persona.update({
          where: { idPersona: row.IdPersona },
          data: {
            roles: {
              push: 'CLIENTE',
            },
          },
        });
        
        logMigrated('Clientes');
      } catch (error: any) {
        logError('Clientes', error, row);
      }
    }
    
    console.log(`   ✅ Clientes migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Clientes:', error.message);
  }
}

/**
 * Migrar Proveedores y asignar rol PROVEEDOR
 */
export async function migrateProveedores(mysqlConn: Connection) {
  console.log('\n📦 Migrando Proveedores...');
  const stats = initStats('Proveedores');
  
  try {
    // Obtener proveedores de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        p.IdProveedor,
        p.IdPersona,
        p.TipoProveedor,
        p.Contacto,
        p.CelularContacto,
        p.EmailContacto,
        p.PlazoPago,
        p.LimiteCredito,
        p.Moneda,
        p.CuentaBancaria,
        p.Banco,
        p.PorcentajeRetencion,
        p.PorcentajePercepcion,
        p.Estado,
        p.FechaRegistro
      FROM proveedor p
      INNER JOIN persona per ON p.IdPersona = per.IdPersona
      WHERE p.Estado = 'A' OR p.Estado = 1
      ORDER BY p.IdProveedor
    `);
    
    console.log(`   📋 Encontrados ${rows.length} proveedores`);
    
    for (const row of rows) {
      try {
        // Verificar que la persona existe
        const personaExists = await prisma.persona.findUnique({
          where: { idPersona: row.IdPersona },
        });
        
        if (!personaExists) {
          console.warn(`   ⚠️  Proveedor ${row.IdProveedor} saltado: Persona ${row.IdPersona} no existe`);
          stats.skipped++;
          continue;
        }
        
        // Crear o actualizar proveedor
        await prisma.proveedor.upsert({
          where: { idProveedor: row.IdProveedor },
          update: {
            tipoProveedor: row.TipoProveedor || 'NATURAL',
            contacto: row.Contacto,
            celularContacto: row.CelularContacto,
            emailContacto: row.EmailContacto?.toLowerCase(),
            plazoPago: parseInt(row.PlazoPago) || 0,
            limiteCredito: parseFloat(row.LimiteCredito) || 0,
            moneda: row.Moneda || 'PEN',
            cuentaBancaria: row.CuentaBancaria,
            banco: row.Banco,
            porcentajeRetencion: parseFloat(row.PorcentajeRetencion) || 0,
            porcentajePercepcion: parseFloat(row.PorcentajePercepcion) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idProveedor: row.IdProveedor,
            idPersona: row.IdPersona,
            tipoProveedor: row.TipoProveedor || 'NATURAL',
            contacto: row.Contacto,
            celularContacto: row.CelularContacto,
            emailContacto: row.EmailContacto?.toLowerCase(),
            plazoPago: parseInt(row.PlazoPago) || 0,
            limiteCredito: parseFloat(row.LimiteCredito) || 0,
            moneda: row.Moneda || 'PEN',
            cuentaBancaria: row.CuentaBancaria,
            banco: row.Banco,
            porcentajeRetencion: parseFloat(row.PorcentajeRetencion) || 0,
            porcentajePercepcion: parseFloat(row.PorcentajePercepcion) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        
        // Actualizar persona para incluir rol de proveedor
        await prisma.persona.update({
          where: { idPersona: row.IdPersona },
          data: {
            roles: {
              push: 'PROVEEDOR',
            },
          },
        });
        
        logMigrated('Proveedores');
      } catch (error: any) {
        logError('Proveedores', error, row);
      }
    }
    
    console.log(`   ✅ Proveedores migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Proveedores:', error.message);
  }
}

/**
 * Migrar Vendedores y asignar rol VENDEDOR
 */
export async function migrateVendedores(mysqlConn: Connection) {
  console.log('\n💼 Migrando Vendedores...');
  const stats = initStats('Vendedores');
  
  try {
    // Obtener vendedores de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        v.IdVendedor,
        v.IdPersona,
        v.Codigo,
        v.Nombre,
        v.Apellido,
        v.DNI,
        v.Direccion,
        v.Telefono,
        v.Celular,
        v.Email,
        v.Comision,
        v.Sueldo,
        v.Estado,
        v.FechaRegistro
      FROM vendedores v
      WHERE v.Estado = 'A' OR v.Estado = 1
      ORDER BY v.IdVendedor
    `);
    
    console.log(`   📋 Encontrados ${rows.length} vendedores`);
    
    for (const row of rows) {
      try {
        let idPersona = row.IdPersona;
        
        // Si no tiene IdPersona, buscar por DNI o crear una nueva
        if (!idPersona) {
          const existingPersona = await prisma.persona.findFirst({
            where: {
              numeroDocumento: row.DNI,
            },
          });
          
          if (existingPersona) {
            idPersona = existingPersona.idPersona;
          } else {
            // Crear nueva persona
            const nuevaPersona = await prisma.persona.create({
              data: {
                tipoDocumento: 'DNI',
                numeroDocumento: row.DNI,
                nombres: row.Nombre,
                apellidos: row.Apellido,
                telefono: row.Telefono,
                celular: row.Celular,
                email: row.Email?.toLowerCase(),
                direccion: row.Direccion,
                estado: 'ACTIVO',
                roles: ['VENDEDOR'],
              },
            });
            idPersona = nuevaPersona.idPersona;
          }
        } else {
          // Actualizar persona existente con rol de vendedor
          await prisma.persona.update({
            where: { idPersona },
            data: {
              roles: {
                push: 'VENDEDOR',
              },
            },
          });
        }
        
        // Crear o actualizar vendedor
        await prisma.vendedor.upsert({
          where: { idVendedor: row.IdVendedor },
          update: {
            codigo: row.Codigo,
            nombre: row.Nombre,
            apellido: row.Apellido,
            comision: parseFloat(row.Comision) || 0,
            sueldo: parseFloat(row.Sueldo) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idVendedor: row.IdVendedor,
            idPersona: idPersona,
            codigo: row.Codigo,
            nombre: row.Nombre,
            apellido: row.Apellido,
            comision: parseFloat(row.Comision) || 0,
            sueldo: parseFloat(row.Sueldo) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        
        logMigrated('Vendedores');
      } catch (error: any) {
        logError('Vendedores', error, row);
      }
    }
    
    console.log(`   ✅ Vendedores migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Vendedores:', error.message);
  }
}

/**
 * Ejecutar todas las migraciones de personas
 */
export async function runPersonasMigration(mysqlConn: Connection) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INICIANDO MIGRACIÓN DE PERSONAS UNIFICADAS');
  console.log('='.repeat(80));
  
  // Primero migrar personas base
  await migratePersonas(mysqlConn);
  
  // Luego migrar cada rol
  await migrateClientes(mysqlConn);
  await migrateProveedores(mysqlConn);
  await migrateVendedores(mysqlConn);
  
  console.log('\n✅ MIGRACIÓN DE PERSONAS UNIFICADAS COMPLETADA');
}
