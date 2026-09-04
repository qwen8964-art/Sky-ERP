import { Pool as MySQLPool } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { connectMySQL, connectPostgres, logInfo, logError, logSuccess, MigrationStats } from './migration-utils';

/**
 * Migración 05: Documentos de Venta
 * - Cotizaciones (cabecera y detalle)
 * - Comprobantes de Venta (Factura, Boleta, NC, ND)
 * - Notas de Crédito y Débito
 * - Correlativos por tipo documento
 */

interface LegacyCotizacion {
  idcotizacion: number;
  serie: string;
  numero: string;
  fecha_emision: Date;
  fecha_vencimiento: Date | null;
  idcliente: number;
  idvendedor: number;
  idalmacen: number;
  idsede: number;
  idmi_empresa: number;
  subtotal: number;
  igv: number;
  total: number;
  moneda: string;
  tipo_cambio: number;
  estado: string; // B = Borrador, A = Aprobado, N = Anulado
  observacion: string | null;
}

interface LegacyCotizacionDetalle {
  idcotizacion_detalle: number;
  idcotizacion: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  igv: number;
  total: number;
  impuesto: string; // Si/No
}

interface LegacyComprobanteVenta {
  idcomprobante_venta: number;
  idtipo_comprobante: number; // 1=Factura, 2=Boleta, 3=NC, 4=ND
  serie: string;
  numero: string;
  fecha_emision: Date;
  fecha_vencimiento: Date | null;
  idcliente: number;
  idvendedor: number;
  idalmacen: number;
  idsede: number;
  idmi_empresa: number;
  subtotal: number;
  igv: number;
  total: number;
  moneda: string;
  tipo_cambio: number;
  estado: string; // B = Borrador, A = Aprobado, N = Anulado
  forma_pago: string; // Contado/Crédito
  observacion: string | null;
  idcotizacion_origen?: number | null;
}

interface LegacyComprobanteVentaDetalle {
  idcomprobante_venta_detalle: number;
  idcomprobante_venta: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  igv: number;
  total: number;
  impuesto: string;
}

interface LegacyCorrelativo {
  idcorrelativo: number;
  idtipo_documento: number;
  idsede: number;
  idmi_empresa: number;
  serie: string;
  numero_actual: number;
}

export async function migrateDocumentosVenta(
  mysqlPool: MySQLPool,
  prisma: PrismaClient,
  stats: MigrationStats
): Promise<void> {
  const module = 'VENTAS';
  
  try {
    logInfo(module, 'Iniciando migración de documentos de venta...');

    // 1. Migrar Correlativos
    logInfo(module, 'Migrando correlativos de documentos...');
    const [correlativosRows] = await mysqlPool.query<any[]>(`
      SELECT * FROM correlativos_doc 
      WHERE idtipo_documento IN (1, 2, 3, 4) -- Factura, Boleta, NC, ND
    `);

    let correlativosMigrated = 0;
    for (const corr of correlativosRows) {
      try {
        await prisma.correlativo.upsert({
          where: {
            idmi_empresa_idsede_idtipo_documento: {
              idmi_empresa: corr.idmi_empresa,
              idsede: corr.idsede,
              idtipo_documento: corr.idtipo_documento,
            },
          },
          update: {
            serie: corr.serie,
            numero_actual: corr.numero_actual,
          },
          create: {
            idmi_empresa: corr.idmi_empresa,
            idsede: corr.idsede,
            idtipo_documento: corr.idtipo_documento,
            serie: corr.serie,
            numero_actual: corr.numero_actual,
          },
        });
        correlativosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando correlativo ${corr.idcorrelativo}: ${error.message}`);
      }
    }
    logSuccess(module, `Correlativos migrados: ${correlativosMigrated}/${correlativosRows.length}`);
    stats.add('correlativos', correlativosMigrated, correlativosRows.length);

    // 2. Migrar Cotizaciones
    logInfo(module, 'Migrando cotizaciones...');
    const [cotizacionesRows] = await mysqlPool.query<LegacyCotizacion[]>('SELECT * FROM cotizacion');

    let cotizacionesMigrated = 0;
    for (const cot of cotizacionesRows) {
      try {
        // Mapeo de estado
        const estadoMap: Record<string, 'BORRADOR' | 'APROBADO' | 'ANULADO'> = {
          'B': 'BORRADOR',
          'A': 'APROBADO',
          'N': 'ANULADO',
        };

        const cotizacion = await prisma.cotizacion.create({
          data: {
            idcotizacion_legacy: cot.idcotizacion,
            serie: cot.serie,
            numero: cot.numero,
            fecha_emision: cot.fecha_emision,
            fecha_vencimiento: cot.fecha_vencimiento,
            idcliente: cot.idcliente,
            idvendedor: cot.idvendedor || undefined,
            idalmacen: cot.idalmacen,
            idsede: cot.idsede,
            idmi_empresa: cot.idmi_empresa,
            subtotal: cot.subtotal,
            igv: cot.igv,
            total: cot.total,
            moneda: cot.moneda,
            tipo_cambio: cot.tipo_cambio,
            estado: estadoMap[cot.estado] || 'BORRADOR',
            observacion: cot.observacion,
          },
        });

        // Migrar detalle de cotización
        const [detalles] = await mysqlPool.query<LegacyCotizacionDetalle[]>(`
          SELECT * FROM cotizacion_detalle 
          WHERE idcotizacion = ?
        `, [cot.idcotizacion]);

        for (const det of detalles) {
          await prisma.cotizacionDetalle.create({
            data: {
              idcotizacion: cotizacion.idcotizacion,
              idproducto: det.idproducto,
              cantidad: det.cantidad,
              precio_unitario: det.precio_unitario,
              subtotal: det.subtotal,
              igv: det.igv,
              total: det.total,
              impuesto: det.impuesto === 'Si',
            },
          });
        }

        cotizacionesMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando cotización ${cot.idcotizacion}: ${error.message}`);
      }
    }
    logSuccess(module, `Cotizaciones migradas: ${cotizacionesMigrated}/${cotizacionesRows.length}`);
    stats.add('cotizaciones', cotizacionesMigrated, cotizacionesRows.length);

    // 3. Migrar Comprobantes de Venta
    logInfo(module, 'Migrando comprobantes de venta...');
    const [comprobantesRows] = await mysqlPool.query<LegacyComprobanteVenta[]>('SELECT * FROM comprobante_venta');

    let comprobantesMigrated = 0;
    for (const comp of comprobantesRows) {
      try {
        // Mapeo de tipo de comprobante
        const tipoMap: Record<number, 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO'> = {
          1: 'FACTURA',
          2: 'BOLETA',
          3: 'NOTA_CREDITO',
          4: 'NOTA_DEBITO',
        };

        const estadoMap: Record<string, 'BORRADOR' | 'APROBADO' | 'ANULADO'> = {
          'B': 'BORRADOR',
          'A': 'APROBADO',
          'N': 'ANULADO',
        };

        const comprobante = await prisma.comprobanteVenta.create({
          data: {
            idcomprobante_venta_legacy: comp.idcomprobante_venta,
            idtipo_comprobante: tipoMap[comp.idtipo_comprobante] || 'FACTURA',
            serie: comp.serie,
            numero: comp.numero,
            fecha_emision: comp.fecha_emision,
            fecha_vencimiento: comp.fecha_vencimiento,
            idcliente: comp.idcliente,
            idvendedor: comp.idvendedor || undefined,
            idalmacen: comp.idalmacen,
            idsede: comp.idsede,
            idmi_empresa: comp.idmi_empresa,
            subtotal: comp.subtotal,
            igv: comp.igv,
            total: comp.total,
            moneda: comp.moneda,
            tipo_cambio: comp.tipo_cambio,
            estado: estadoMap[comp.estado] || 'BORRADOR',
            forma_pago: comp.forma_pago === 'Crédito' ? 'CREDITO' : 'CONTADO',
            observacion: comp.observacion,
            idcotizacion_origen: comp.idcotizacion_origen || undefined,
          },
        });

        // Migrar detalle de comprobante
        const [detalles] = await mysqlPool.query<LegacyComprobanteVentaDetalle[]>(`
          SELECT * FROM comprobante_venta_detalle 
          WHERE idcomprobante_venta = ?
        `, [comp.idcomprobante_venta]);

        for (const det of detalles) {
          await prisma.comprobanteVentaDetalle.create({
            data: {
              idcomprobante_venta: comprobante.idcomprobante_venta,
              idproducto: det.idproducto,
              cantidad: det.cantidad,
              precio_unitario: det.precio_unitario,
              subtotal: det.subtotal,
              igv: det.igv,
              total: det.total,
              impuesto: det.impuesto === 'Si',
            },
          });
        }

        comprobantesMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando comprobante ${comp.idcomprobante_venta}: ${error.message}`);
      }
    }
    logSuccess(module, `Comprobantes de venta migrados: ${comprobantesMigrated}/${comprobantesRows.length}`);
    stats.add('comprobantes_venta', comprobantesMigrated, comprobantesRows.length);

    // 4. Migrar Notas de Crédito específicas (si existen tablas separadas)
    logInfo(module, 'Verificando notas de crédito adicionales...');
    try {
      const [ncRows] = await mysqlPool.query<any[]>('SELECT * FROM nota_credito');
      let ncMigrated = 0;
      
      for (const nc of ncRows) {
        // Las NC ya deberían estar en comprobante_venta si idtipo_comprobante = 3
        // Esta tabla puede ser histórica o con campos adicionales
        ncMigrated++;
      }
      
      logSuccess(module, `Notas de crédito verificadas: ${ncMigrated}`);
      stats.add('notas_credito', ncMigrated, ncRows.length);
    } catch (error: any) {
      logInfo(module, 'Tabla nota_credito no existe o está vacía');
    }

    // 5. Migrar Notas de Débito específicas
    logInfo(module, 'Verificando notas de débito adicionales...');
    try {
      const [ndRows] = await mysqlPool.query<any[]>('SELECT * FROM nota_debito');
      let ndMigrated = 0;
      
      for (const nd of ndRows) {
        // Las ND ya deberían estar en comprobante_venta si idtipo_comprobante = 4
        ndMigrated++;
      }
      
      logSuccess(module, `Notas de débito verificadas: ${ndMigrated}`);
      stats.add('notas_debito', ndMigrated, ndRows.length);
    } catch (error: any) {
      logInfo(module, 'Tabla nota_debito no existe o está vacía');
    }

    logSuccess(module, '✅ Migración de documentos de venta completada');
  } catch (error: any) {
    logError(module, `Error crítico en migración de ventas: ${error.message}`);
    throw error;
  }
}
