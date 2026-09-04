/**
 * MIGRACIÓN 4: USUARIOS Y PERMISOS
 * 
 * Migra las tablas:
 * - usuarios_skynet → Usuario
 * - usuario_privilegios → PermisoUsuario
 * - arbol_det → NodoArbol (estructura del menú)
 * - tree_det → Alternativa de árbol de navegación
 */

import { Connection } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { initStats, logMigrated, logError } from './migration-utils';

const prisma = new PrismaClient();

/**
 * Migrar Árbol de Navegación (Menú del Sistema)
 */
export async function migrateArbolNavegacion(mysqlConn: Connection) {
  console.log('\n🌳 Migrando Árbol de Navegación...');
  const stats = initStats('ArbolNavegacion');
  
  try {
    // Obtener nodos del árbol de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdArbolDet,
        IdPadre,
        Codigo,
        Nombre,
        Ruta,
        Icono,
        Orden,
        Nivel,
        Tipo,
        Modulo,
        Visible,
        Estado,
        FechaRegistro
      FROM arbol_det
      ORDER BY Nivel, Orden
    `);
    
    console.log(`   📋 Encontrados ${rows.length} nodos del árbol`);
    
    for (const row of rows) {
      try {
        // Verificar que el padre existe si no es raíz
        let idPadre = null;
        if (row.IdPadre && row.IdPadre !== row.IdArbolDet) {
          const padreExists = await prisma.nodoArbol.findUnique({
            where: { idNodo: row.IdPadre },
          });
          if (padreExists) {
            idPadre = row.IdPadre;
          }
        }
        
        await prisma.nodoArbol.upsert({
          where: { idNodo: row.IdArbolDet },
          update: {
            codigo: row.Codigo,
            nombre: row.Nombre,
            ruta: row.Ruta,
            icono: row.Icono,
            orden: parseInt(row.Orden) || 0,
            nivel: parseInt(row.Nivel) || 0,
            tipo: row.Tipo || 'MENU',
            modulo: row.Modulo,
            visible: row.Visible === 'Si' || row.Visible === 'S' || row.Visible === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idNodo: row.IdArbolDet,
            idPadre: idPadre,
            codigo: row.Codigo,
            nombre: row.Nombre,
            ruta: row.Ruta,
            icono: row.Icono,
            orden: parseInt(row.Orden) || 0,
            nivel: parseInt(row.Nivel) || 0,
            tipo: row.Tipo || 'MENU',
            modulo: row.Modulo,
            visible: row.Visible === 'Si' || row.Visible === 'S' || row.Visible === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('ArbolNavegacion');
      } catch (error: any) {
        logError('ArbolNavegacion', error, row);
      }
    }
    
    console.log(`   ✅ Nodos del árbol migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Árbol de Navegación:', error.message);
  }
}

/**
 * Migrar Usuarios del Sistema
 */
export async function migrateUsuarios(mysqlConn: Connection) {
  console.log('\n👤 Migrando Usuarios del Sistema...');
  const stats = initStats('Usuarios');
  
  try {
    // Obtener usuarios de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        u.IdUsuario,
        u.LOGIN,
        u.PASSWORD,
        u.IdPersona,
        u.IdMiEmpresa,
        u.IdMiSede,
        u.IdMiAlmacen,
        u.Email,
        u.Telefono,
        u.Cargo,
        u.Bloqueado,
        u.IntentosFallidos,
        u.UltimoAcceso,
        u.UltimaIP,
        u.SesionActiva,
        u.Estado,
        u.FechaRegistro,
        u.FechaModificacion
      FROM usuarios_skynet u
      WHERE u.Estado = 'A' OR u.Estado = 1
      ORDER BY u.IdUsuario
    `);
    
    console.log(`   📋 Encontrados ${rows.length} usuarios`);
    
    for (const row of rows) {
      try {
        // Verificar que la persona existe
        let idPersona = null;
        if (row.IdPersona) {
          const personaExists = await prisma.persona.findUnique({
            where: { idPersona: row.IdPersona },
          });
          if (personaExists) {
            idPersona = row.IdPersona;
          }
        }
        
        // Verificar que la empresa existe
        let idMiEmpresa = null;
        if (row.IdMiEmpresa) {
          const empresaExists = await prisma.empresa.findUnique({
            where: { idMiEmpresa: row.IdMiEmpresa },
          });
          if (empresaExists) {
            idMiEmpresa = row.IdMiEmpresa;
          }
        }
        
        // Verificar que la sede existe
        let idMiSede = null;
        if (row.IdMiSede) {
          const sedeExists = await prisma.sede.findUnique({
            where: { idMiSede: row.IdMiSede },
          });
          if (sedeExists) {
            idMiSede = row.IdMiSede;
          }
        }
        
        // Verificar que el almacén existe
        let idMiAlmacen = null;
        if (row.IdMiAlmacen) {
          const almacenExists = await prisma.almacen.findUnique({
            where: { idMiAlmacen: row.IdMiAlmacen },
          });
          if (almacenExists) {
            idMiAlmacen = row.IdMiAlmacen;
          }
        }
        
        await prisma.usuario.upsert({
          where: { idUsuario: row.IdUsuario },
          update: {
            login: row.LOGIN,
            password: row.PASSWORD, // Nota: Las passwords ya están hasheadas o en texto plano
            idPersona: idPersona,
            idMiEmpresa: idMiEmpresa,
            idMiSede: idMiSede,
            email: row.Email?.toLowerCase(),
            telefono: row.Telefono,
            cargo: row.Cargo,
            bloqueado: row.Bloqueado === 'Si' || row.Bloqueado === 'S' || row.Bloqueado === 1,
            intentosFallidos: parseInt(row.IntentosFallidos) || 0,
            ultimoAcceso: row.UltimoAcceso ? new Date(row.UltimoAcceso) : null,
            ultimaIP: row.UltimaIP,
            sesionActiva: row.SesionActiva === 'Si' || row.SesionActiva === 'S' || row.SesionActiva === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
          create: {
            idUsuario: row.IdUsuario,
            login: row.LOGIN,
            password: row.PASSWORD,
            idPersona: idPersona,
            idMiEmpresa: idMiEmpresa,
            idMiSede: idMiSede,
            idMiAlmacen: idMiAlmacen,
            email: row.Email?.toLowerCase(),
            telefono: row.Telefono,
            cargo: row.Cargo,
            bloqueado: row.Bloqueado === 'Si' || row.Bloqueado === 'S' || row.Bloqueado === 1,
            intentosFallidos: parseInt(row.IntentosFallidos) || 0,
            ultimoAcceso: row.UltimoAcceso ? new Date(row.UltimoAcceso) : null,
            ultimaIP: row.UltimaIP,
            sesionActiva: row.SesionActiva === 'Si' || row.SesionActiva === 'S' || row.SesionActiva === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
        });
        logMigrated('Usuarios');
      } catch (error: any) {
        logError('Usuarios', error, row);
      }
    }
    
    console.log(`   ✅ Usuarios migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Usuarios:', error.message);
  }
}

/**
 * Migrar Privilegios de Usuarios (Permisos por nodo del árbol)
 */
export async function migratePrivilegios(mysqlConn: Connection) {
  console.log('\n🔐 Migrando Privilegios de Usuarios...');
  const stats = initStats('Privilegios');
  
  try {
    // Obtener privilegios de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdPrivilegio,
        IdUsuario,
        IdArbolDet,
        Ver,
        Crear,
        Editar,
        Eliminar,
        Imprimir,
        Exportar,
        Aprobar,
        Anular,
        Estado,
        FechaRegistro
      FROM usuario_privilegios
      WHERE Estado = 'A' OR Estado = 1
      ORDER BY IdPrivilegio
    `);
    
    console.log(`   📋 Encontrados ${rows.length} privilegios`);
    
    for (const row of rows) {
      try {
        // Verificar que el usuario existe
        const usuarioExists = await prisma.usuario.findUnique({
          where: { idUsuario: row.IdUsuario },
        });
        
        if (!usuarioExists) {
          console.warn(`   ⚠️  Privilegio ${row.IdPrivilegio} saltado: Usuario ${row.IdUsuario} no existe`);
          stats.skipped++;
          continue;
        }
        
        // Verificar que el nodo del árbol existe
        const nodoExists = await prisma.nodoArbol.findUnique({
          where: { idNodo: row.IdArbolDet },
        });
        
        if (!nodoExists) {
          console.warn(`   ⚠️  Privilegio ${row.IdPrivilegio} saltado: Nodo ${row.IdArbolDet} no existe`);
          stats.skipped++;
          continue;
        }
        
        await prisma.permisoUsuario.upsert({
          where: { idPermiso: row.IdPrivilegio },
          update: {
            ver: row.Ver === 'Si' || row.Ver === 'S' || row.Ver === 1,
            crear: row.Crear === 'Si' || row.Crear === 'S' || row.Crear === 1,
            editar: row.Editar === 'Si' || row.Editar === 'S' || row.Editar === 1,
            eliminar: row.Eliminar === 'Si' || row.Eliminar === 'S' || row.Eliminar === 1,
            imprimir: row.Imprimir === 'Si' || row.Imprimir === 'S' || row.Imprimir === 1,
            exportar: row.Exportar === 'Si' || row.Exportar === 'S' || row.Exportar === 1,
            aprobar: row.Aprobar === 'Si' || row.Aprobar === 'S' || row.Aprobar === 1,
            anular: row.Anular === 'Si' || row.Anular === 'S' || row.Anular === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idPermiso: row.IdPrivilegio,
            idUsuario: row.IdUsuario,
            idNodo: row.IdArbolDet,
            ver: row.Ver === 'Si' || row.Ver === 'S' || row.Ver === 1,
            crear: row.Crear === 'Si' || row.Crear === 'S' || row.Crear === 1,
            editar: row.Editar === 'Si' || row.Editar === 'S' || row.Editar === 1,
            eliminar: row.Eliminar === 'Si' || row.Eliminar === 'S' || row.Eliminar === 1,
            imprimir: row.Imprimir === 'Si' || row.Imprimir === 'S' || row.Imprimir === 1,
            exportar: row.Exportar === 'Si' || row.Exportar === 'S' || row.Exportar === 1,
            aprobar: row.Aprobar === 'Si' || row.Aprobar === 'S' || row.Aprobar === 1,
            anular: row.Anular === 'Si' || row.Anular === 'S' || row.Anular === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('Privilegios');
      } catch (error: any) {
        logError('Privilegios', error, row);
      }
    }
    
    console.log(`   ✅ Privilegios migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Privilegios:', error.message);
  }
}

/**
 * Migrar Sesiones Activas de Usuarios
 */
export async function migrateSesiones(mysqlConn: Connection) {
  console.log('\n🔑 Migrando Sesiones de Usuarios...');
  const stats = initStats('Sesiones');
  
  try {
    // Obtener sesiones activas de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdSesion,
        IdUsuario,
        Token,
        IP,
        UserAgent,
        FechaInicio,
        FechaUltimaActividad,
        FechaFin,
        Activa,
        FechaRegistro
      FROM usuario_sesiones
      WHERE Activa = 'Si' OR Activa = 'S' OR Activa = 1
      ORDER BY IdSesion
    `);
    
    console.log(`   📋 Encontradas ${rows.length} sesiones activas`);
    
    for (const row of rows) {
      try {
        // Verificar que el usuario existe
        const usuarioExists = await prisma.usuario.findUnique({
          where: { idUsuario: row.IdUsuario },
        });
        
        if (!usuarioExists) {
          console.warn(`   ⚠️  Sesión ${row.IdSesion} saltada: Usuario ${row.IdUsuario} no existe`);
          stats.skipped++;
          continue;
        }
        
        await prisma.sesionUsuario.upsert({
          where: { idSesion: row.IdSesion },
          update: {
            token: row.Token,
            ip: row.IP,
            userAgent: row.UserAgent,
            fechaInicio: row.FechaInicio ? new Date(row.FechaInicio) : new Date(),
            fechaUltimaActividad: row.FechaUltimaActividad ? new Date(row.FechaUltimaActividad) : new Date(),
            fechaFin: row.FechaFin ? new Date(row.FechaFin) : null,
            activa: row.Activa === 'Si' || row.Activa === 'S' || row.Activa === 1,
          },
          create: {
            idSesion: row.IdSesion,
            idUsuario: row.IdUsuario,
            token: row.Token,
            ip: row.IP,
            userAgent: row.UserAgent,
            fechaInicio: row.FechaInicio ? new Date(row.FechaInicio) : new Date(),
            fechaUltimaActividad: row.FechaUltimaActividad ? new Date(row.FechaUltimaActividad) : new Date(),
            fechaFin: row.FechaFin ? new Date(row.FechaFin) : null,
            activa: row.Activa === 'Si' || row.Activa === 'S' || row.Activa === 1,
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('Sesiones');
      } catch (error: any) {
        logError('Sesiones', error, row);
      }
    }
    
    console.log(`   ✅ Sesiones migradas: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Sesiones:', error.message);
  }
}

/**
 * Ejecutar todas las migraciones de usuarios y permisos
 */
export async function runUsuariosMigration(mysqlConn: Connection) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INICIANDO MIGRACIÓN DE USUARIOS Y PERMISOS');
  console.log('='.repeat(80));
  
  // Primero migrar el árbol de navegación (para que existan los nodos)
  await migrateArbolNavegacion(mysqlConn);
  
  // Luego migrar usuarios
  await migrateUsuarios(mysqlConn);
  
  // Migrar privilegios (depende de usuarios y nodos)
  await migratePrivilegios(mysqlConn);
  
  // Migrar sesiones activas
  await migrateSesiones(mysqlConn);
  
  console.log('\n✅ MIGRACIÓN DE USUARIOS Y PERMISOS COMPLETADA');
}
