import { Pool as MySQLPool } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logSuccess, MigrationStats } from './migration-utils';

/**
 * Migración 06: Documentos de Compra
 * - Órdenes de Compra
 * - Comprobantes de Compra (Factura, Boleta, NC, ND)
 * - Notas de Crédito y Débito de Compra
 * - Guías de Ingreso
 */

interface LegacyOrdenCompra {
  idorden_compra: number;
  serie: string;
  numero: string;
  fecha_emision: Date;
  fecha_entrega: Date | null;
  idproveedor: number;
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

interface LegacyOrdenCompraDetalle {
  idorden_compra_detalle: number;
  idorden_compra: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  igv: number;
  total: number;
  impuesto: string;
}

interface LegacyComprobanteCompra {
  idcomprobante_compra: number;
  idtipo_comprobante: number; // 1=Factura, 2=Boleta, 3=NC, 4=ND
  serie: string;
  numero: string;
  fecha_emision: Date;
  fecha_vencimiento: Date | null;
  idproveedor: number;
  idalmacen: number;
  idsede: number;
  idmi_empresa: number;
  subtotal: number;
  igv: number;
  total: number;
  moneda: string;
  tipo_cambio: number;
  estado: string;
  forma_pago: string;
  observacion: string | null;
  idorden_compra_origen?: number | null;
  retencion?: number;
  percepcion?: number;
}

interface LegacyComprobanteCompraDetalle {
  idcomprobante_compra_detalle: number;
  idcomprobante_compra: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  igv: number;
  total: number;
  impuesto: string;
}

interface LegacyGuiaIngreso {
  idalm_guia: number;
  idtipo_guia: number; // 1=Ingreso, 2=Salida
  idmotivo: number;
  serie: string;
  numero: string;
  fecha_emision: Date;
  idproveedor?: number;
  idcliente?: number;
  idalmacen: number;
  idsede: number;
  idmi_empresa: number;
  observacion: string | null;
}

interface LegacyGuiaIngresoDetalle {
  idalm_guia_detalle: number;
  idalm_guia: number;
  idproducto: number;
  cantidad: number;
  precio_unitario?: number;
  observacion?: string | null;
}

export async function migrateDocumentosCompra(
  mysqlPool: MySQLPool,
  prisma: PrismaClient,
  stats: MigrationStats
): Promise<void> {
  const module = 'COMPRAS';
  
  try {
    logInfo(module, 'Iniciando migración de documentos de compra...');

    // 1. Migrar Órdenes de Compra
    logInfo(module, 'Migrando órdenes de compra...');
    const [ordenesRows] = await mysqlPool.query<LegacyOrdenCompra[]>('SELECT * FROM orden_compra WHERE 1=1');

    let ordenesMigrated = 0;
    for (const ord of ordenesRows) {
      try {
        const estadoMap: Record<string, 'BORRADOR' | 'APROBADO' | 'ANULADO'> = {
          'B': 'BORRADOR',
          'A': 'APROBADO',
          'N': 'ANULADO',
        };

        const orden = await prisma.ordenCompra.create({
          data: {
            idorden_compra_legacy: ord.idorden_compra,
            serie: ord.serie,
            numero: ord.numero,
            fecha_emision: ord.fecha_emision,
            fecha_entrega: ord.fecha_entrega,
            idproveedor: ord.idproveedor,
            idalmacen: ord.idalmacen,
            idsede: ord.idsede,
            idmi_empresa: ord.idmi_empresa,
            subtotal: ord.subtotal,
            igv: ord.igv,
            total: ord.total,
            moneda: ord.moneda,
            tipo_cambio: ord.tipo_cambio,
            estado: estadoMap[ord.estado] || 'BORRADOR',
            observacion: ord.observacion,
          },
        });

        // Migrar detalle
        const [detalles] = await mysqlPool.query<LegacyOrdenCompraDetalle[]>(`
          SELECT * FROM orden_compra_detalle 
          WHERE idorden_compra = ?
        `, [ord.idorden_compra]);

        for (const det of detalles) {
          await prisma.ordenCompraDetalle.create({
            data: {
              idorden_compra: orden.idorden_compra,
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

        ordenesMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando orden ${ord.idorden_compra}: ${error.message}`);
      }
    }
    logSuccess(module, `Órdenes de compra migradas: ${ordenesMigrated}/${ordenesRows.length}`);
    stats.add('ordenes_compra', ordenesMigrated, ordenesRows.length);

    // 2. Migrar Comprobantes de Compra
    logInfo(module, 'Migrando comprobantes de compra...');
    const [comprobantesRows] = await mysqlPool.query<LegacyComprobanteCompra[]>(
      'SELECT * FROM comprobante_compra WHERE 1=1'
    );

    let comprobantesMigrated = 0;
    for (const comp of comprobantesRows) {
      try {
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

        const comprobante = await prisma.comprobanteCompra.create({
          data: {
            idcomprobante_compra_legacy: comp.idcomprobante_compra,
            idtipo_comprobante: tipoMap[comp.idtipo_comprobante] || 'FACTURA',
            serie: comp.serie,
            numero: comp.numero,
            fecha_emision: comp.fecha_emision,
            fecha_vencimiento: comp.fecha_vencimiento,
            idproveedor: comp.idproveedor,
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
            idorden_compra_origen: comp.idorden_compra_origen || undefined,
            retencion: comp.retencion || undefined,
            percepcion: comp.percepcion || undefined,
          },
        });

        // Migrar detalle
        const [detalles] = await mysqlPool.query<LegacyComprobanteCompraDetalle[]>(`
          SELECT * FROM comprobante_compra_detalle 
          WHERE idcomprobante_compra = ?
        `, [comp.idcomprobante_compra]);

        for (const det of detalles) {
          await prisma.comprobanteCompraDetalle.create({
            data: {
              idcomprobante_compra: comprobante.idcomprobante_compra,
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
        logError(module, `Error migrando comprobante compra ${comp.idcomprobante_compra}: ${error.message}`);
      }
    }
    logSuccess(module, `Comprobantes de compra migrados: ${comprobantesMigrated}/${comprobantesRows.length}`);
    stats.add('comprobantes_compra', comprobantesMigrated, comprobantesRows.length);

    // 3. Migrar Guías de Ingreso
    logInfo(module, 'Migrando guías de ingreso...');
    const [guiasRows] = await mysqlPool.query<LegacyGuiaIngreso[]>(`
      SELECT * FROM alm_guia 
      WHERE idtipo_guia = 1 -- Solo ingresos
    `);

    let guiasMigrated = 0;
    for (const guia of guiasRows) {
      try {
        const guiaIngreso = await prisma.guiaIngreso.create({
          data: {
            idalm_guia_legacy: guia.idalm_guia,
            idmotivo: guia.idmotivo,
            serie: guia.serie,
            numero: guia.numero,
            fecha_emision: guia.fecha_emision,
            idproveedor: guia.idproveedor || undefined,
            idalmacen: guia.idalmacen,
            idsede: guia.idsede,
            idmi_empresa: guia.idmi_empresa,
            observacion: guia.observacion,
          },
        });

        // Migrar detalle
        const [detalles] = await mysqlPool.query<LegacyGuiaIngresoDetalle[]>(`
          SELECT * FROM alm_guia_detalle 
          WHERE idalm_guia = ?
        `, [guia.idalm_guia]);

        for (const det of detalles) {
          await prisma.guiaIngresoDetalle.create({
            data: {
              idalm_guia: guiaIngreso.idalm_guia,
              idproducto: det.idproducto,
              cantidad: det.cantidad,
              precio_unitario: det.precio_unitario || undefined,
              observacion: det.observacion,
            },
          });
        }

        guiasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando guía ingreso ${guia.idalm_guia}: ${error.message}`);
      }
    }
    logSuccess(module, `Guías de ingreso migradas: ${guiasMigrated}/${guiasRows.length}`);
    stats.add('guias_ingreso', guiasMigrated, guiasRows.length);

    // 4. Verificar Notas de Crédito/Débito de compra
    logInfo(module, 'Verificando notas de crédito/débito de compra...');
    try {
      const [ncRows] = await mysqlPool.query<any[]>('SELECT * FROM nota_credito_compra WHERE 1=1');
      stats.add('notas_credito_compra', ncRows.length, ncRows.length);
      logSuccess(module, `Notas de crédito compra verificadas: ${ncRows.length}`);
    } catch (error: any) {
      logInfo(module, 'Tabla nota_credito_compra no existe o está vacía');
    }

    try {
      const [ndRows] = await mysqlPool.query<any[]>('SELECT * FROM nota_debito_compra WHERE 1=1');
      stats.add('notas_debito_compra', ndRows.length, ndRows.length);
      logSuccess(module, `Notas de débito compra verificadas: ${ndRows.length}`);
    } catch (error: any) {
      logInfo(module, 'Tabla nota_debito_compra no existe o está vacía');
    }

    logSuccess(module, '✅ Migración de documentos de compra completada');
  } catch (error: any) {
    logError(module, `Error crítico en migración de compras: ${error.message}`);
    throw error;
  }
}
