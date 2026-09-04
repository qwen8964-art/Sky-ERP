import { Pool as MySQLPool } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logSuccess, MigrationStats } from './migration-utils';

/**
 * Migración 08: Contabilidad
 * - Plan de Cuentas
 * - Códigos Anexo
 * - Matriz Contable
 * - Libro Diario
 * - Libro Mayor
 * - Registro de Ventas/Compras
 * - Centro de Costos
 */

interface LegacyPlanCuenta {
  idcuenta: number;
  codigo: string;
  nombre: string;
  nivel: number;
  idcuenta_padre?: number | null;
  tipo: string; // Activo/Pasivo/Patrimonio/Ingreso/Gasto
  idmi_empresa: number;
  estado: string;
}

interface LegacyCodigoAnexo {
  idcodigo_anexo: number;
  codigo: string;
  nombre: string;
  tipo: string; // CentroCosto/Proyecto/Partida
  idmi_empresa: number;
}

interface LegacyMatrizContable {
  idmatriz: number;
  idtipo_operacion: number;
  descripcion: string;
  cuenta_debe: string;
  cuenta_haber: string;
  idmi_empresa: number;
}

interface LegacyLibroDiario {
  idasiento: number;
  numero_asiento: string;
  fecha_asiento: Date;
  descripcion: string;
  idmi_empresa: number;
  idsede?: number | null;
  estado: string;
}

interface LegacyLibroDiarioDetalle {
  idasiento_detalle: number;
  idasiento: number;
  idcuenta: number;
  debe: number;
  haber: number;
  glosa?: string | null;
  idcentro_costo?: number | null;
}

interface LegacyRegistroVenta {
  idregistro_venta: number;
  periodo: string; // YYYY-MM
  idcomprobante_venta: number;
  fecha_emision: Date;
  ruc_cliente: string;
  razon_social: string;
  base_imponible: number;
  igv: number;
  total: number;
  idmi_empresa: number;
}

interface LegacyRegistroCompra {
  idregistro_compra: number;
  periodo: string;
  idcomprobante_compra: number;
  fecha_emision: Date;
  ruc_proveedor: string;
  razon_social: string;
  base_imponible: number;
  igv: number;
  total: number;
  idmi_empresa: number;
}

interface LegacyCentroCosto {
  idcentro_costo: number;
  codigo: string;
  nombre: string;
  idmi_empresa: number;
  estado: string;
}

export async function migrateContabilidad(
  mysqlPool: MySQLPool,
  prisma: PrismaClient,
  stats: MigrationStats
): Promise<void> {
  const module = 'CONTABILIDAD';
  
  try {
    logInfo(module, 'Iniciando migración de contabilidad...');

    // 1. Migrar Plan de Cuentas
    logInfo(module, 'Migrando plan de cuentas...');
    const [cuentasRows] = await mysqlPool.query<LegacyPlanCuenta[]>(
      'SELECT * FROM ct_plan_cuenta WHERE 1=1'
    );

    let cuentasMigrated = 0;
    for (const cuenta of cuentasRows) {
      try {
        await prisma.ctPlanCuenta.upsert({
          where: {
            idmi_empresa_idcuenta_legacy: {
              idmi_empresa: cuenta.idmi_empresa,
              idcuenta_legacy: cuenta.idcuenta,
            },
          },
          update: {
            codigo: cuenta.codigo,
            nombre: cuenta.nombre,
            nivel: cuenta.nivel,
            idcuenta_padre: cuenta.idcuenta_padre || undefined,
            tipo: cuenta.tipo.toUpperCase() as any,
            estado: cuenta.estado === 'Activo',
          },
          create: {
            idcuenta_legacy: cuenta.idcuenta,
            idmi_empresa: cuenta.idmi_empresa,
            codigo: cuenta.codigo,
            nombre: cuenta.nombre,
            nivel: cuenta.nivel,
            idcuenta_padre: cuenta.idcuenta_padre || undefined,
            tipo: cuenta.tipo.toUpperCase() as any,
            estado: cuenta.estado === 'Activo',
          },
        });
        cuentasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando cuenta ${cuenta.idcuenta}: ${error.message}`);
      }
    }
    logSuccess(module, `Cuentas migradas: ${cuentasMigrated}/${cuentasRows.length}`);
    stats.add('plan_cuentas', cuentasMigrated, cuentasRows.length);

    // 2. Migrar Códigos Anexo
    logInfo(module, 'Migrando códigos anexo...');
    const [anexosRows] = await mysqlPool.query<LegacyCodigoAnexo[]>(
      'SELECT * FROM ct_codigo_anexo WHERE 1=1'
    );

    let anexosMigrated = 0;
    for (const anexo of anexosRows) {
      try {
        await prisma.ctCodigoAnexo.create({
          data: {
            idcodigo_anexo_legacy: anexo.idcodigo_anexo,
            codigo: anexo.codigo,
            nombre: anexo.nombre,
            tipo: anexo.tipo.toUpperCase() as any,
            idmi_empresa: anexo.idmi_empresa,
          },
        });
        anexosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando código anexo ${anexo.idcodigo_anexo}: ${error.message}`);
      }
    }
    logSuccess(module, `Códigos anexo migrados: ${anexosMigrated}/${anexosRows.length}`);
    stats.add('codigos_anexo', anexosMigrated, anexosRows.length);

    // 3. Migrar Matriz Contable
    logInfo(module, 'Migrando matriz contable...');
    const [matrizRows] = await mysqlPool.query<LegacyMatrizContable[]>(
      'SELECT * FROM ct_matriz_contable WHERE 1=1'
    );

    let matrizMigrated = 0;
    for (const matriz of matrizRows) {
      try {
        await prisma.ctMatrizContable.create({
          data: {
            idmatriz_legacy: matriz.idmatriz,
            idtipo_operacion: matriz.idtipo_operacion,
            descripcion: matriz.descripcion,
            cuenta_debe: matriz.cuenta_debe,
            cuenta_haber: matriz.cuenta_haber,
            idmi_empresa: matriz.idmi_empresa,
          },
        });
        matrizMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando matriz ${matriz.idmatriz}: ${error.message}`);
      }
    }
    logSuccess(module, `Matrices contables migradas: ${matrizMigrated}/${matrizRows.length}`);
    stats.add('matriz_contable', matrizMigrated, matrizRows.length);

    // 4. Migrar Libro Diario (Cabecera)
    logInfo(module, 'Migrando libro diario...');
    const [asientosRows] = await mysqlPool.query<LegacyLibroDiario[]>(
      'SELECT * FROM ct_libro_diario WHERE 1=1'
    );

    let asientosMigrated = 0;
    for (const asiento of asientosRows) {
      try {
        const asientoCreated = await prisma.ctLibroDiario.create({
          data: {
            idasiento_legacy: asiento.idasiento,
            numero_asiento: asiento.numero_asiento,
            fecha_asiento: asiento.fecha_asiento,
            descripcion: asiento.descripcion,
            idmi_empresa: asiento.idmi_empresa,
            idsede: asiento.idsede || undefined,
            estado: asiento.estado.toUpperCase() as any,
          },
        });

        // Migrar detalle del asiento
        const [detalles] = await mysqlPool.query<LegacyLibroDiarioDetalle[]>(`
          SELECT * FROM ct_libro_diario_detalle 
          WHERE idasiento = ?
        `, [asiento.idasiento]);

        for (const det of detalles) {
          await prisma.ctLibroDiarioDetalle.create({
            data: {
              idasiento: asientoCreated.idasiento,
              idcuenta: det.idcuenta,
              debe: det.debe,
              haber: det.haber,
              glosa: det.glosa,
              idcentro_costo: det.idcentro_costo || undefined,
            },
          });
        }

        asientosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando asiento ${asiento.idasiento}: ${error.message}`);
      }
    }
    logSuccess(module, `Asientos migrados: ${asientosMigrated}/${asientosRows.length}`);
    stats.add('libro_diario', asientosMigrated, asientosRows.length);

    // 5. Migrar Registro de Ventas
    logInfo(module, 'Migrando registro de ventas...');
    const [regVentasRows] = await mysqlPool.query<LegacyRegistroVenta[]>(
      'SELECT * FROM ct_registro_venta WHERE 1=1'
    );

    let regVentasMigrated = 0;
    for (const reg of regVentasRows) {
      try {
        await prisma.ctRegistroVenta.create({
          data: {
            idregistro_venta_legacy: reg.idregistro_venta,
            periodo: reg.periodo,
            idcomprobante_venta: reg.idcomprobante_venta,
            fecha_emision: reg.fecha_emision,
            ruc_cliente: reg.ruc_cliente,
            razon_social: reg.razon_social,
            base_imponible: reg.base_imponible,
            igv: reg.igv,
            total: reg.total,
            idmi_empresa: reg.idmi_empresa,
          },
        });
        regVentasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando registro venta ${reg.idregistro_venta}: ${error.message}`);
      }
    }
    logSuccess(module, `Registros de venta migrados: ${regVentasMigrated}/${regVentasRows.length}`);
    stats.add('registro_ventas', regVentasMigrated, regVentasRows.length);

    // 6. Migrar Registro de Compras
    logInfo(module, 'Migrando registro de compras...');
    const [regComprasRows] = await mysqlPool.query<LegacyRegistroCompra[]>(
      'SELECT * FROM ct_registro_compra WHERE 1=1'
    );

    let regComprasMigrated = 0;
    for (const reg of regComprasRows) {
      try {
        await prisma.ctRegistroCompra.create({
          data: {
            idregistro_compra_legacy: reg.idregistro_compra,
            periodo: reg.periodo,
            idcomprobante_compra: reg.idcomprobante_compra,
            fecha_emision: reg.fecha_emision,
            ruc_proveedor: reg.ruc_proveedor,
            razon_social: reg.razon_social,
            base_imponible: reg.base_imponible,
            igv: reg.igv,
            total: reg.total,
            idmi_empresa: reg.idmi_empresa,
          },
        });
        regComprasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando registro compra ${reg.idregistro_compra}: ${error.message}`);
      }
    }
    logSuccess(module, `Registros de compra migrados: ${regComprasMigrated}/${regComprasRows.length}`);
    stats.add('registro_compras', regComprasMigrated, regComprasRows.length);

    // 7. Migrar Centro de Costos
    logInfo(module, 'Migrando centros de costo...');
    const [ccRows] = await mysqlPool.query<LegacyCentroCosto[]>(
      'SELECT * FROM centro_costo WHERE 1=1'
    );

    let ccMigrated = 0;
    for (const cc of ccRows) {
      try {
        await prisma.centroCosto.upsert({
          where: {
            idmi_empresa_idcentro_costo_legacy: {
              idmi_empresa: cc.idmi_empresa,
              idcentro_costo_legacy: cc.idcentro_costo,
            },
          },
          update: {
            codigo: cc.codigo,
            nombre: cc.nombre,
            estado: cc.estado === 'Activo',
          },
          create: {
            idcentro_costo_legacy: cc.idcentro_costo,
            idmi_empresa: cc.idmi_empresa,
            codigo: cc.codigo,
            nombre: cc.nombre,
            estado: cc.estado === 'Activo',
          },
        });
        ccMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando centro costo ${cc.idcentro_costo}: ${error.message}`);
      }
    }
    logSuccess(module, `Centros de costo migrados: ${ccMigrated}/${ccRows.length}`);
    stats.add('centro_costo', ccMigrated, ccRows.length);

    logSuccess(module, '✅ Migración de contabilidad completada');
  } catch (error: any) {
    logError(module, `Error crítico en migración de contabilidad: ${error.message}`);
    throw error;
  }
}
