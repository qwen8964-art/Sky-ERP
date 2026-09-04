/**
 * MIGRACIÓN 3: PRODUCTOS E INVENTARIO
 * 
 * Migra las tablas:
 * - productos → Producto
 * - familia_grupo → Familia (árbol jerárquico)
 * - tipo_lista_precio → ListaPrecio
 * - precio_venta_productos → PrecioProducto
 * - alm_stock → Stock
 * - stock_series → SerieProducto
 */

import { Connection } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { initStats, logMigrated, logError } from './migration-utils';

const prisma = new PrismaClient();

/**
 * Migrar Familias y Grupos (árbol jerárquico)
 */
export async function migrateFamilias(mysqlConn: Connection) {
  console.log('\n📁 Migrando Familias y Grupos...');
  const stats = initStats('Familias');
  
  try {
    // Obtener familias/grupos de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdFamilia,
        IdPadre,
        Codigo,
        Nombre,
        Descripcion,
        Tipo,
        Nivel,
        Orden,
        Estado,
        FechaRegistro
      FROM familia_grupo
      ORDER BY Nivel, Orden
    `);
    
    console.log(`   📋 Encontradas ${rows.length} familias/grupos`);
    
    for (const row of rows) {
      try {
        // Verificar que el padre existe si no es raíz
        let idPadre = null;
        if (row.IdPadre && row.IdPadre !== row.IdFamilia) {
          const padreExists = await prisma.familia.findUnique({
            where: { idFamilia: row.IdPadre },
          });
          if (padreExists) {
            idPadre = row.IdPadre;
          }
        }
        
        await prisma.familia.upsert({
          where: { idFamilia: row.IdFamilia },
          update: {
            codigo: row.Codigo,
            nombre: row.Nombre,
            descripcion: row.Descripcion,
            tipo: row.Tipo || 'GRUPO',
            nivel: parseInt(row.Nivel) || 0,
            orden: parseInt(row.Orden) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idFamilia: row.IdFamilia,
            idPadre: idPadre,
            codigo: row.Codigo,
            nombre: row.Nombre,
            descripcion: row.Descripcion,
            tipo: row.Tipo || 'GRUPO',
            nivel: parseInt(row.Nivel) || 0,
            orden: parseInt(row.Orden) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('Familias');
      } catch (error: any) {
        logError('Familias', error, row);
      }
    }
    
    console.log(`   ✅ Familias migradas: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Familias:', error.message);
  }
}

/**
 * Migrar Productos
 */
export async function migrateProductos(mysqlConn: Connection) {
  console.log('\n📦 Migrando Productos...');
  const stats = initStats('Productos');
  
  try {
    // Obtener productos de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        p.IdProducto,
        p.Codigo,
        p.CodigoBarra,
        p.Nombre,
        p.NombreCorto,
        p.Descripcion,
        p.IdFamilia,
        p.Unidad,
        p.Equivalencia,
        p.PrecioCompra,
        p.PrecioVenta,
        p.StockMinimo,
        p.StockMaximo,
        p.Impuesto,
        p.TipoGravamen,
        p.Marca,
        p.Modelo,
        p.Color,
        p.Talla,
        p.ControlaSerie,
        p.ControlaLote,
        p.Perecible,
        p.FechaVencimiento,
        p.Imagen,
        p.Web,
        p.Estado,
        p.FechaRegistro,
        p.FechaModificacion
      FROM productos p
      WHERE p.Estado = 'A' OR p.Estado = 1
      ORDER BY p.IdProducto
    `);
    
    console.log(`   📋 Encontrados ${rows.length} productos`);
    
    for (const row of rows) {
      try {
        // Verificar que la familia existe
        let idFamilia = null;
        if (row.IdFamilia) {
          const familiaExists = await prisma.familia.findUnique({
            where: { idFamilia: row.IdFamilia },
          });
          if (familiaExists) {
            idFamilia = row.IdFamilia;
          }
        }
        
        await prisma.producto.upsert({
          where: { idProducto: row.IdProducto },
          update: {
            codigo: row.Codigo,
            codigoBarra: row.CodigoBarra,
            nombre: row.Nombre,
            nombreCorto: row.NombreCorto,
            descripcion: row.Descripcion,
            idFamilia: idFamilia,
            unidad: row.Unidad || 'UNIDAD',
            equivalencia: parseFloat(row.Equivalencia) || 1,
            precioCompra: parseFloat(row.PrecioCompra) || 0,
            precioVenta: parseFloat(row.PrecioVenta) || 0,
            stockMinimo: parseFloat(row.StockMinimo) || 0,
            stockMaximo: parseFloat(row.StockMaximo) || 0,
            impuesto: row.Impuesto === 'Si' || row.Impuesto === 'S' || row.Impuesto === 1,
            tipoGravamen: row.TipoGravamen || 'GRAVADO',
            marca: row.Marca,
            modelo: row.Modelo,
            color: row.Color,
            talla: row.Talla,
            controlaSerie: row.ControlaSerie === 'Si' || row.ControlaSerie === 'S' || row.ControlaSerie === 1,
            controlaLote: row.ControlaLote === 'Si' || row.ControlaLote === 'S' || row.ControlaLote === 1,
            perecible: row.Perecible === 'Si' || row.Perecible === 'S' || row.Perecible === 1,
            imagen: row.Imagen,
            web: row.Web === 'Si' || row.Web === 'S' || row.Web === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
          create: {
            idProducto: row.IdProducto,
            codigo: row.Codigo,
            codigoBarra: row.CodigoBarra,
            nombre: row.Nombre,
            nombreCorto: row.NombreCorto,
            descripcion: row.Descripcion,
            idFamilia: idFamilia,
            unidad: row.Unidad || 'UNIDAD',
            equivalencia: parseFloat(row.Equivalencia) || 1,
            precioCompra: parseFloat(row.PrecioCompra) || 0,
            precioVenta: parseFloat(row.PrecioVenta) || 0,
            stockMinimo: parseFloat(row.StockMinimo) || 0,
            stockMaximo: parseFloat(row.StockMaximo) || 0,
            impuesto: row.Impuesto === 'Si' || row.Impuesto === 'S' || row.Impuesto === 1,
            tipoGravamen: row.TipoGravamen || 'GRAVADO',
            marca: row.Marca,
            modelo: row.Modelo,
            color: row.Color,
            talla: row.Talla,
            controlaSerie: row.ControlaSerie === 'Si' || row.ControlaSerie === 'S' || row.ControlaSerie === 1,
            controlaLote: row.ControlaLote === 'Si' || row.ControlaLote === 'S' || row.ControlaLote === 1,
            perecible: row.Perecible === 'Si' || row.Perecible === 'S' || row.Perecible === 1,
            imagen: row.Imagen,
            web: row.Web === 'Si' || row.Web === 'S' || row.Web === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
        });
        logMigrated('Productos');
      } catch (error: any) {
        logError('Productos', error, row);
      }
    }
    
    console.log(`   ✅ Productos migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Productos:', error.message);
  }
}

/**
 * Migrar Listas de Precios
 */
export async function migrateListasPrecio(mysqlConn: Connection) {
  console.log('\n💰 Migrando Listas de Precios...');
  const stats = initStats('ListasPrecio');
  
  try {
    // Obtener listas de precios de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdLista,
        Codigo,
        Nombre,
        Descripcion,
        Moneda,
        PorcentajeIncremento,
        Redondeo,
        Estado,
        FechaRegistro
      FROM tipo_lista_precio
      WHERE Estado = 'A' OR Estado = 1
      ORDER BY IdLista
    `);
    
    console.log(`   📋 Encontradas ${rows.length} listas de precios`);
    
    for (const row of rows) {
      try {
        await prisma.listaPrecio.upsert({
          where: { idLista: row.IdLista },
          update: {
            codigo: row.Codigo,
            nombre: row.Nombre,
            descripcion: row.Descripcion,
            moneda: row.Moneda || 'PEN',
            porcentajeIncremento: parseFloat(row.PorcentajeIncremento) || 0,
            redondeo: row.Redondeo === 'Si' || row.Redondeo === 'S' || row.Redondeo === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idLista: row.IdLista,
            codigo: row.Codigo,
            nombre: row.Nombre,
            descripcion: row.Descripcion,
            moneda: row.Moneda || 'PEN',
            porcentajeIncremento: parseFloat(row.PorcentajeIncremento) || 0,
            redondeo: row.Redondeo === 'Si' || row.Redondeo === 'S' || row.Redondeo === 1,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('ListasPrecio');
      } catch (error: any) {
        logError('ListasPrecio', error, row);
      }
    }
    
    console.log(`   ✅ Listas de precios migradas: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Listas de Precios:', error.message);
  }
}

/**
 * Migrar Precios de Productos por Lista
 */
export async function migratePreciosProductos(mysqlConn: Connection) {
  console.log('\n💵 Migrando Precios de Productos...');
  const stats = initStats('PreciosProductos');
  
  try {
    // Obtener precios de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdPrecio,
        IdProducto,
        IdLista,
        IdMiSede,
        Precio,
        PrecioMinimo,
        Estado,
        FechaRegistro
      FROM precio_venta_productos
      WHERE Estado = 'A' OR Estado = 1
      ORDER BY IdPrecio
    `);
    
    console.log(`   📋 Encontrados ${rows.length} precios`);
    
    for (const row of rows) {
      try {
        await prisma.precioProducto.upsert({
          where: { idPrecio: row.IdPrecio },
          update: {
            precio: parseFloat(row.Precio) || 0,
            precioMinimo: parseFloat(row.PrecioMinimo) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
          },
          create: {
            idPrecio: row.IdPrecio,
            idProducto: row.IdProducto,
            idLista: row.IdLista,
            idMiSede: row.IdMiSede,
            precio: parseFloat(row.Precio) || 0,
            precioMinimo: parseFloat(row.PrecioMinimo) || 0,
            estado: row.Estado === 'A' || row.Estado === 1 ? 'ACTIVO' : 'INACTIVO',
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
          },
        });
        logMigrated('PreciosProductos');
      } catch (error: any) {
        logError('PreciosProductos', error, row);
      }
    }
    
    console.log(`   ✅ Precios de productos migrados: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Precios de Productos:', error.message);
  }
}

/**
 * Migrar Stock por Almacén
 */
export async function migrateStock(mysqlConn: Connection) {
  console.log('\n📊 Migrando Stock...');
  const stats = initStats('Stock');
  
  try {
    // Obtener stock de MySQL
    const [rows]: any = await mysqlConn.query(`
      SELECT 
        IdStock,
        IdProducto,
        IdMiAlmacen,
        Cantidad,
        CostoPromedio,
        UltimoCosto,
        FechaRegistro,
        FechaModificacion
      FROM alm_stock
      WHERE Cantidad != 0
      ORDER BY IdStock
    `);
    
    console.log(`   📋 Encontrados ${rows.length} registros de stock`);
    
    for (const row of rows) {
      try {
        await prisma.stock.upsert({
          where: { idStock: row.IdStock },
          update: {
            cantidad: parseFloat(row.Cantidad) || 0,
            costoPromedio: parseFloat(row.CostoPromedio) || 0,
            ultimoCosto: parseFloat(row.UltimoCosto) || 0,
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
          create: {
            idStock: row.IdStock,
            idProducto: row.IdProducto,
            idMiAlmacen: row.IdMiAlmacen,
            cantidad: parseFloat(row.Cantidad) || 0,
            costoPromedio: parseFloat(row.CostoPromedio) || 0,
            ultimoCosto: parseFloat(row.UltimoCosto) || 0,
            fechaRegistro: row.FechaRegistro ? new Date(row.FechaRegistro) : new Date(),
            fechaModificacion: row.FechaModificacion ? new Date(row.FechaModificacion) : new Date(),
          },
        });
        logMigrated('Stock');
      } catch (error: any) {
        logError('Stock', error, row);
      }
    }
    
    console.log(`   ✅ Stock migrado: ${stats.migrated}`);
  } catch (error: any) {
    console.error('   ❌ Error general migrando Stock:', error.message);
  }
}

/**
 * Ejecutar todas las migraciones de productos e inventario
 */
export async function runProductosMigration(mysqlConn: Connection) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INICIANDO MIGRACIÓN DE PRODUCTOS E INVENTARIO');
  console.log('='.repeat(80));
  
  // Primero migrar familias (para que existan al migrar productos)
  await migrateFamilias(mysqlConn);
  
  // Luego migrar productos
  await migrateProductos(mysqlConn);
  
  // Migrar listas de precios
  await migrateListasPrecio(mysqlConn);
  
  // Migrar precios de productos
  await migratePreciosProductos(mysqlConn);
  
  // Migrar stock
  await migrateStock(mysqlConn);
  
  console.log('\n✅ MIGRACIÓN DE PRODUCTOS E INVENTARIO COMPLETADA');
}
