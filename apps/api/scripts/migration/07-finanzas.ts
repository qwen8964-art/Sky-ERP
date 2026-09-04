import { Pool as MySQLPool } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logSuccess, MigrationStats } from './migration-utils';

/**
 * Migración 07: Finanzas
 * - Cajas y Bancos
 * - Operaciones de Caja/Banco
 * - Cheques Emitidos/Recibidos
 * - Letras Emitidas/Recibidas
 * - Cuentas por Cobrar
 * - Cuentas por Pagar
 * - Tipo de Cambio
 */

interface LegacyCajaBanco {
  idcaja_banco: number;
  nombre: string;
  tipo: string; // Caja/Banco
  moneda: string;
  saldo_actual: number;
  idmi_empresa: number;
  estado: string;
}

interface LegacyCbOperacion {
  idoperacion: number;
  idcaja_banco: number;
  fecha_operacion: Date;
  tipo_operacion: string; // Ingreso/Egreso/Transferencia
  monto: number;
  moneda: string;
  tipo_cambio: number;
  descripcion: string;
  idmi_empresa: number;
  idsede: number;
}

interface LegacyChequeEmitido {
  idcheque_emitido: number;
  numero_cheque: string;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto: number;
  moneda: string;
  idproveedor: number;
  idcaja_banco: number;
  estado: string; // Pendiente/Cobrado/Anulado
  idmi_empresa: number;
}

interface LegacyChequeRecibido {
  idcheque_recibido: number;
  numero_cheque: string;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto: number;
  moneda: string;
  idcliente: number;
  idcaja_banco: number;
  estado: string;
  idmi_empresa: number;
}

interface LegacyLetraEmitida {
  idletra_emitida: number;
  numero_letra: string;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto: number;
  moneda: string;
  idproveedor: number;
  estado: string;
  idmi_empresa: number;
}

interface LegacyLetraRecibida {
  idletra_recibida: number;
  numero_letra: string;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto: number;
  moneda: string;
  idcliente: number;
  estado: string;
  idmi_empresa: number;
}

interface LegacyCtasCobrar {
  idctas_cobrar: number;
  idcomprobante_venta: number;
  idcliente: number;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto_total: number;
  monto_amortizado: number;
  saldo_pendiente: number;
  moneda: string;
  estado: string; // Pendiente/Parcial/Cancelado/Anulado
  idmi_empresa: number;
  idsede: number;
}

interface LegacyCtasPagar {
  idctas_pagar: number;
  idcomprobante_compra: number;
  idproveedor: number;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto_total: number;
  monto_amortizado: number;
  saldo_pendiente: number;
  moneda: string;
  estado: string;
  idmi_empresa: number;
  idsede: number;
}

interface LegacyTipoCambio {
  idtipo_cambio: number;
  fecha: Date;
  compra: number;
  venta: number;
  fuente?: string;
}

export async function migrateFinanzas(
  mysqlPool: MySQLPool,
  prisma: PrismaClient,
  stats: MigrationStats
): Promise<void> {
  const module = 'FINANZAS';
  
  try {
    logInfo(module, 'Iniciando migración de finanzas...');

    // 1. Migrar Cajas y Bancos
    logInfo(module, 'Migrando cajas y bancos...');
    const [cajasRows] = await mysqlPool.query<LegacyCajaBanco[]>('SELECT * FROM caja_banco WHERE 1=1');

    let cajasMigrated = 0;
    for (const caja of cajasRows) {
      try {
        await prisma.cajaBanco.upsert({
          where: {
            idmi_empresa_idcaja_banco: {
              idmi_empresa: caja.idmi_empresa,
              idcaja_banco_legacy: caja.idcaja_banco,
            },
          },
          update: {
            nombre: caja.nombre,
            tipo: caja.tipo === 'Banco' ? 'BANCO' : 'CAJA',
            moneda: caja.moneda,
            saldo_actual: caja.saldo_actual,
            estado: caja.estado === 'Activo',
          },
          create: {
            idcaja_banco_legacy: caja.idcaja_banco,
            idmi_empresa: caja.idmi_empresa,
            nombre: caja.nombre,
            tipo: caja.tipo === 'Banco' ? 'BANCO' : 'CAJA',
            moneda: caja.moneda,
            saldo_actual: caja.saldo_actual,
            estado: caja.estado === 'Activo',
          },
        });
        cajasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando caja/banco ${caja.idcaja_banco}: ${error.message}`);
      }
    }
    logSuccess(module, `Cajas/Bancos migrados: ${cajasMigrated}/${cajasRows.length}`);
    stats.add('cajas_bancos', cajasMigrated, cajasRows.length);

    // 2. Migrar Operaciones de Caja/Banco
    logInfo(module, 'Migrando operaciones de caja/banco...');
    const [operacionesRows] = await mysqlPool.query<LegacyCbOperacion[]>(
      'SELECT * FROM cb_operaciones WHERE 1=1'
    );

    let operacionesMigrated = 0;
    for (const op of operacionesRows) {
      try {
        await prisma.cbOperacion.create({
          data: {
            idoperacion_legacy: op.idoperacion,
            idcaja_banco: op.idcaja_banco,
            fecha_operacion: op.fecha_operacion,
            tipo_operacion: op.tipo_operacion.toUpperCase() as any,
            monto: op.monto,
            moneda: op.moneda,
            tipo_cambio: op.tipo_cambio,
            descripcion: op.descripcion,
            idmi_empresa: op.idmi_empresa,
            idsede: op.idsede,
          },
        });
        operacionesMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando operación ${op.idoperacion}: ${error.message}`);
      }
    }
    logSuccess(module, `Operaciones migradas: ${operacionesMigrated}/${operacionesRows.length}`);
    stats.add('cb_operaciones', operacionesMigrated, operacionesRows.length);

    // 3. Migrar Cheques Emitidos
    logInfo(module, 'Migrando cheques emitidos...');
    const [chequesEmitidosRows] = await mysqlPool.query<LegacyChequeEmitido[]>(
      'SELECT * FROM cheques_emitidos WHERE 1=1'
    );

    let chequesEmitidosMigrated = 0;
    for (const cheque of chequesEmitidosRows) {
      try {
        await prisma.chequeEmitido.create({
          data: {
            idcheque_emitido_legacy: cheque.idcheque_emitido,
            numero_cheque: cheque.numero_cheque,
            fecha_emision: cheque.fecha_emision,
            fecha_vencimiento: cheque.fecha_vencimiento,
            monto: cheque.monto,
            moneda: cheque.moneda,
            idproveedor: cheque.idproveedor,
            idcaja_banco: cheque.idcaja_banco,
            estado: cheque.estado.toUpperCase() as any,
            idmi_empresa: cheque.idmi_empresa,
          },
        });
        chequesEmitidosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando cheque emitido ${cheque.idcheque_emitido}: ${error.message}`);
      }
    }
    logSuccess(module, `Cheques emitidos migrados: ${chequesEmitidosMigrated}/${chequesEmitidosRows.length}`);
    stats.add('cheques_emitidos', chequesEmitidosMigrated, chequesEmitidosRows.length);

    // 4. Migrar Cheques Recibidos
    logInfo(module, 'Migrando cheques recibidos...');
    const [chequesRecibidosRows] = await mysqlPool.query<LegacyChequeRecibido[]>(
      'SELECT * FROM cheques_recibidos WHERE 1=1'
    );

    let chequesRecibidosMigrated = 0;
    for (const cheque of chequesRecibidosRows) {
      try {
        await prisma.chequeRecibido.create({
          data: {
            idcheque_recibido_legacy: cheque.idcheque_recibido,
            numero_cheque: cheque.numero_cheque,
            fecha_emision: cheque.fecha_emision,
            fecha_vencimiento: cheque.fecha_vencimiento,
            monto: cheque.monto,
            moneda: cheque.moneda,
            idcliente: cheque.idcliente,
            idcaja_banco: cheque.idcaja_banco,
            estado: cheque.estado.toUpperCase() as any,
            idmi_empresa: cheque.idmi_empresa,
          },
        });
        chequesRecibidosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando cheque recibido ${cheque.idcheque_recibido}: ${error.message}`);
      }
    }
    logSuccess(module, `Cheques recibidos migrados: ${chequesRecibidosMigrated}/${chequesRecibidosRows.length}`);
    stats.add('cheques_recibidos', chequesRecibidosMigrated, chequesRecibidosRows.length);

    // 5. Migrar Letras Emitidas
    logInfo(module, 'Migrando letras emitidas...');
    const [letrasEmitidasRows] = await mysqlPool.query<LegacyLetraEmitida[]>(
      'SELECT * FROM letras_emitidas WHERE 1=1'
    );

    let letrasEmitidasMigrated = 0;
    for (const letra of letrasEmitidasRows) {
      try {
        await prisma.letraEmitida.create({
          data: {
            idletra_emitida_legacy: letra.idletra_emitida,
            numero_letra: letra.numero_letra,
            fecha_emision: letra.fecha_emision,
            fecha_vencimiento: letra.fecha_vencimiento,
            monto: letra.monto,
            moneda: letra.moneda,
            idproveedor: letra.idproveedor,
            estado: letra.estado.toUpperCase() as any,
            idmi_empresa: letra.idmi_empresa,
          },
        });
        letrasEmitidasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando letra emitida ${letra.idletra_emitida}: ${error.message}`);
      }
    }
    logSuccess(module, `Letras emitidas migradas: ${letrasEmitidasMigrated}/${letrasEmitidasRows.length}`);
    stats.add('letras_emitidas', letrasEmitidasMigrated, letrasEmitidasRows.length);

    // 6. Migrar Letras Recibidas
    logInfo(module, 'Migrando letras recibidas...');
    const [letrasRecibidasRows] = await mysqlPool.query<LegacyLetraRecibida[]>(
      'SELECT * FROM leras_recibidas WHERE 1=1'
    );

    let letrasRecibidasMigrated = 0;
    for (const letra of letrasRecibidasRows) {
      try {
        await prisma.letraRecibida.create({
          data: {
            idletra_recibida_legacy: letra.idletra_recibida,
            numero_letra: letra.numero_letra,
            fecha_emision: letra.fecha_emision,
            fecha_vencimiento: letra.fecha_vencimiento,
            monto: letra.monto,
            moneda: letra.moneda,
            idcliente: letra.idcliente,
            estado: letra.estado.toUpperCase() as any,
            idmi_empresa: letra.idmi_empresa,
          },
        });
        letrasRecibidasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando letra recibida ${letra.idletra_recibida}: ${error.message}`);
      }
    }
    logSuccess(module, `Letras recibidas migradas: ${letrasRecibidasMigrated}/${letrasRecibidasRows.length}`);
    stats.add('letras_recibidas', letrasRecibidasMigrated, letrasRecibidasRows.length);

    // 7. Migrar Cuentas por Cobrar
    logInfo(module, 'Migrando cuentas por cobrar...');
    const [ctasCobrarRows] = await mysqlPool.query<LegacyCtasCobrar[]>(
      'SELECT * FROM ctas_cobrar WHERE 1=1'
    );

    let ctasCobrarMigrated = 0;
    for (const cta of ctasCobrarRows) {
      try {
        await prisma.ctasCobrar.create({
          data: {
            idctas_cobrar_legacy: cta.idctas_cobrar,
            idcomprobante_venta: cta.idcomprobante_venta,
            idcliente: cta.idcliente,
            fecha_emision: cta.fecha_emision,
            fecha_vencimiento: cta.fecha_vencimiento,
            monto_total: cta.monto_total,
            monto_amortizado: cta.monto_amortizado,
            saldo_pendiente: cta.saldo_pendiente,
            moneda: cta.moneda,
            estado: cta.estado.toUpperCase() as any,
            idmi_empresa: cta.idmi_empresa,
            idsede: cta.idsede,
          },
        });
        ctasCobrarMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando cta x cobrar ${cta.idctas_cobrar}: ${error.message}`);
      }
    }
    logSuccess(module, `Cuentas x cobrar migradas: ${ctasCobrarMigrated}/${ctasCobrarRows.length}`);
    stats.add('ctas_cobrar', ctasCobrarMigrated, ctasCobrarRows.length);

    // 8. Migrar Cuentas por Pagar
    logInfo(module, 'Migrando cuentas por pagar...');
    const [ctasPagarRows] = await mysqlPool.query<LegacyCtasPagar[]>(
      'SELECT * FROM ctas_pagar WHERE 1=1'
    );

    let ctasPagarMigrated = 0;
    for (const cta of ctasPagarRows) {
      try {
        await prisma.ctasPagar.create({
          data: {
            idctas_pagar_legacy: cta.idctas_pagar,
            idcomprobante_compra: cta.idcomprobante_compra,
            idproveedor: cta.idproveedor,
            fecha_emision: cta.fecha_emision,
            fecha_vencimiento: cta.fecha_vencimiento,
            monto_total: cta.monto_total,
            monto_amortizado: cta.monto_amortizado,
            saldo_pendiente: cta.saldo_pendiente,
            moneda: cta.moneda,
            estado: cta.estado.toUpperCase() as any,
            idmi_empresa: cta.idmi_empresa,
            idsede: cta.idsede,
          },
        });
        ctasPagarMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando cta x pagar ${cta.idctas_pagar}: ${error.message}`);
      }
    }
    logSuccess(module, `Cuentas x pagar migradas: ${ctasPagarMigrated}/${ctasPagarRows.length}`);
    stats.add('ctas_pagar', ctasPagarMigrated, ctasPagarRows.length);

    // 9. Migrar Tipo de Cambio
    logInfo(module, 'Migrando tipo de cambio...');
    const [tipoCambioRows] = await mysqlPool.query<LegacyTipoCambio[]>(
      'SELECT * FROM tipo_cambio ORDER BY fecha DESC LIMIT 365'
    );

    let tipoCambioMigrated = 0;
    for (const tc of tipoCambioRows) {
      try {
        await prisma.tipoCambio.upsert({
          where: {
            fecha: tc.fecha,
          },
          update: {
            compra: tc.compra,
            venta: tc.venta,
            fuente: tc.fuente || 'MANUAL',
          },
          create: {
            fecha: tc.fecha,
            compra: tc.compra,
            venta: tc.venta,
            fuente: tc.fuente || 'MANUAL',
          },
        });
        tipoCambioMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando tipo cambio ${tc.fecha}: ${error.message}`);
      }
    }
    logSuccess(module, `Tipos de cambio migrados: ${tipoCambioMigrated}/${tipoCambioRows.length}`);
    stats.add('tipo_cambio', tipoCambioMigrated, tipoCambioRows.length);

    logSuccess(module, '✅ Migración de finanzas completada');
  } catch (error: any) {
    logError(module, `Error crítico en migración de finanzas: ${error.message}`);
    throw error;
  }
}
