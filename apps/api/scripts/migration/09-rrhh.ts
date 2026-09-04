import { Pool as MySQLPool } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logSuccess, MigrationStats } from './migration-utils';

/**
 * Migración 09: Recursos Humanos
 * - Trabajadores
 * - Contratos
 * - Asistencia
 * - Turnos
 * - Planillas
 * - Boletas
 * - Vacaciones
 * - CTS
 * - Quinta Categoría
 * - AFP y Salud
 */

interface LegacyTrabajador {
  idtrabajador: number;
  idpersona: number;
  codigo_trabajador: string;
  fecha_ingreso: Date;
  fecha_salida?: Date | null;
  estado: string;
  idmi_empresa: number;
}

interface LegacyContrato {
  idcontrato: number;
  idtrabajador: number;
  tipo_contrato: string;
  fecha_inicio: Date;
  fecha_fin?: Date | null;
  remuneracion: number;
  moneda: string;
  idmi_empresa: number;
}

interface LegacyAsistencia {
  idasistencia: number;
  idtrabajador: number;
  fecha: Date;
  hora_entrada: string;
  hora_salida: string;
  tardanza_minutos: number;
  idturno?: number | null;
  idmi_empresa: number;
}

interface LegacyTurno {
  idturno: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  idmi_empresa: number;
}

interface LegacyPlanilla {
  idplanilla: number;
  periodo: string; // YYYY-MM
  fecha_pago: Date;
  total_trabajadores: number;
  total_remuneraciones: number;
  total_descuentos: number;
  total_neto: number;
  idmi_empresa: number;
  estado: string;
}

interface LegacyBoleta {
  idboleta: number;
  idplanilla: number;
  idtrabajador: number;
  remuneracion_bruta: number;
  descuentos_afp: number;
  descuentos_salud: number;
  descuentos_otras: number;
  total_descuentos: number;
  neto_pagar: number;
}

interface LegacyVacaciones {
  idvacaciones: number;
  idtrabajador: number;
  periodo: string;
  dias_vacaciones: number;
  dias_gozados: number;
  estado: string;
  idmi_empresa: number;
}

interface LegacyCTS {
  idcts: number;
  idtrabajador: number;
  periodo: string;
  monto_depuesto: number;
  banco: string;
  idmi_empresa: number;
}

interface LegacyQuintaCat {
  idquinta_cat: number;
  idtrabajador: number;
  anio: number;
  remuneracion_anual: number;
  impuesto_calculado: number;
  idmi_empresa: number;
}

export async function migrateRRHH(
  mysqlPool: MySQLPool,
  prisma: PrismaClient,
  stats: MigrationStats
): Promise<void> {
  const module = 'RRHH';
  
  try {
    logInfo(module, 'Iniciando migración de recursos humanos...');

    // 1. Migrar Trabajadores
    logInfo(module, 'Migrando trabajadores...');
    const [trabajadoresRows] = await mysqlPool.query<LegacyTrabajador[]>(
      'SELECT * FROM pla_trabajadores WHERE 1=1'
    );

    let trabajadoresMigrated = 0;
    for (const trab of trabajadoresRows) {
      try {
        await prisma.plaTrabajador.upsert({
          where: {
            idmi_empresa_idtrabajador_legacy: {
              idmi_empresa: trab.idmi_empresa,
              idtrabajador_legacy: trab.idtrabajador,
            },
          },
          update: {
            idpersona: trab.idpersona,
            codigo_trabajador: trab.codigo_trabajador,
            fecha_ingreso: trab.fecha_ingreso,
            fecha_salida: trab.fecha_salida || undefined,
            estado: trab.estado === 'Activo',
          },
          create: {
            idtrabajador_legacy: trab.idtrabajador,
            idmi_empresa: trab.idmi_empresa,
            idpersona: trab.idpersona,
            codigo_trabajador: trab.codigo_trabajador,
            fecha_ingreso: trab.fecha_ingreso,
            fecha_salida: trab.fecha_salida || undefined,
            estado: trab.estado === 'Activo',
          },
        });
        trabajadoresMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando trabajador ${trab.idtrabajador}: ${error.message}`);
      }
    }
    logSuccess(module, `Trabajadores migrados: ${trabajadoresMigrated}/${trabajadoresRows.length}`);
    stats.add('trabajadores', trabajadoresMigrated, trabajadoresRows.length);

    // 2. Migrar Contratos
    logInfo(module, 'Migrando contratos...');
    const [contratosRows] = await mysqlPool.query<LegacyContrato[]>(
      'SELECT * FROM pla_contrato WHERE 1=1'
    );

    let contratosMigrated = 0;
    for (const cont of contratosRows) {
      try {
        await prisma.plaContrato.create({
          data: {
            idcontrato_legacy: cont.idcontrato,
            idtrabajador: cont.idtrabajador,
            tipo_contrato: cont.tipo_contrato.toUpperCase() as any,
            fecha_inicio: cont.fecha_inicio,
            fecha_fin: cont.fecha_fin || undefined,
            remuneracion: cont.remuneracion,
            moneda: cont.moneda,
            idmi_empresa: cont.idmi_empresa,
          },
        });
        contratosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando contrato ${cont.idcontrato}: ${error.message}`);
      }
    }
    logSuccess(module, `Contratos migrados: ${contratosMigrated}/${contratosRows.length}`);
    stats.add('contratos', contratosMigrated, contratosRows.length);

    // 3. Migrar Turnos
    logInfo(module, 'Migrando turnos...');
    const [turnosRows] = await mysqlPool.query<LegacyTurno[]>(
      'SELECT * FROM pla_turno WHERE 1=1'
    );

    let turnosMigrated = 0;
    for (const turno of turnosRows) {
      try {
        await prisma.plaTurno.upsert({
          where: {
            idmi_empresa_idturno_legacy: {
              idmi_empresa: turno.idmi_empresa,
              idturno_legacy: turno.idturno,
            },
          },
          update: {
            nombre: turno.nombre,
            hora_inicio: turno.hora_inicio,
            hora_fin: turno.hora_fin,
          },
          create: {
            idturno_legacy: turno.idturno,
            idmi_empresa: turno.idmi_empresa,
            nombre: turno.nombre,
            hora_inicio: turno.hora_inicio,
            hora_fin: turno.hora_fin,
          },
        });
        turnosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando turno ${turno.idturno}: ${error.message}`);
      }
    }
    logSuccess(module, `Turnos migrados: ${turnosMigrated}/${turnosRows.length}`);
    stats.add('turnos', turnosMigrated, turnosRows.length);

    // 4. Migrar Asistencia
    logInfo(module, 'Migrando asistencia...');
    const [asistenciaRows] = await mysqlPool.query<LegacyAsistencia[]>(
      'SELECT * FROM pla_asistencia WHERE 1=1 LIMIT 10000'
    );

    let asistenciaMigrated = 0;
    for (const asis of asistenciaRows) {
      try {
        await prisma.plaAsistencia.create({
          data: {
            idasistencia_legacy: asis.idasistencia,
            idtrabajador: asis.idtrabajador,
            fecha: asis.fecha,
            hora_entrada: asis.hora_entrada,
            hora_salida: asis.hora_salida,
            tardanza_minutos: asis.tardanza_minutos,
            idturno: asis.idturno || undefined,
            idmi_empresa: asis.idmi_empresa,
          },
        });
        asistenciaMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando asistencia ${asis.idasistencia}: ${error.message}`);
      }
    }
    logSuccess(module, `Registros de asistencia migrados: ${asistenciaMigrated}/${asistenciaRows.length}`);
    stats.add('asistencia', asistenciaMigrated, asistenciaRows.length);

    // 5. Migrar Planillas
    logInfo(module, 'Migrando planillas...');
    const [planillasRows] = await mysqlPool.query<LegacyPlanilla[]>(
      'SELECT * FROM pla_planilla WHERE 1=1'
    );

    let planillasMigrated = 0;
    for (const plan of planillasRows) {
      try {
        await prisma.plaPlanilla.create({
          data: {
            idplanilla_legacy: plan.idplanilla,
            periodo: plan.periodo,
            fecha_pago: plan.fecha_pago,
            total_trabajadores: plan.total_trabajadores,
            total_remuneraciones: plan.total_remuneraciones,
            total_descuentos: plan.total_descuentos,
            total_neto: plan.total_neto,
            idmi_empresa: plan.idmi_empresa,
            estado: plan.estado.toUpperCase() as any,
          },
        });
        planillasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando planilla ${plan.idplanilla}: ${error.message}`);
      }
    }
    logSuccess(module, `Planillas migradas: ${planillasMigrated}/${planillasRows.length}`);
    stats.add('planillas', planillasMigrated, planillasRows.length);

    // 6. Migrar Boletas
    logInfo(module, 'Migrando boletas...');
    const [boletasRows] = await mysqlPool.query<LegacyBoleta[]>(
      'SELECT * FROM pla_boleta WHERE 1=1'
    );

    let boletasMigrated = 0;
    for (const bol of boletasRows) {
      try {
        await prisma.plaBoleta.create({
          data: {
            idboleta_legacy: bol.idboleta,
            idplanilla: bol.idplanilla,
            idtrabajador: bol.idtrabajador,
            remuneracion_bruta: bol.remuneracion_bruta,
            descuentos_afp: bol.descuentos_afp,
            descuentos_salud: bol.descuentos_salud,
            descuentos_otras: bol.descuentos_otras,
            total_descuentos: bol.total_descuentos,
            neto_pagar: bol.neto_pagar,
          },
        });
        boletasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando boleta ${bol.idboleta}: ${error.message}`);
      }
    }
    logSuccess(module, `Boletas migradas: ${boletasMigrated}/${boletasRows.length}`);
    stats.add('boletas', boletasMigrated, boletasRows.length);

    // 7. Migrar Vacaciones
    logInfo(module, 'Migrando vacaciones...');
    const [vacacionesRows] = await mysqlPool.query<LegacyVacaciones[]>(
      'SELECT * FROM pla_vacaciones WHERE 1=1'
    );

    let vacacionesMigrated = 0;
    for (const vac of vacacionesRows) {
      try {
        await prisma.plaVacacione.create({
          data: {
            idvacaciones_legacy: vac.idvacaciones,
            idtrabajador: vac.idtrabajador,
            periodo: vac.periodo,
            dias_vacaciones: vac.dias_vacaciones,
            dias_gozados: vac.dias_gozados,
            estado: vac.estado.toUpperCase() as any,
            idmi_empresa: vac.idmi_empresa,
          },
        });
        vacacionesMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando vacaciones ${vac.idvacaciones}: ${error.message}`);
      }
    }
    logSuccess(module, `Vacaciones migradas: ${vacacionesMigrated}/${vacacionesRows.length}`);
    stats.add('vacaciones', vacacionesMigrated, vacacionesRows.length);

    // 8. Migrar CTS
    logInfo(module, 'Migrando CTS...');
    const [ctsRows] = await mysqlPool.query<LegacyCTS[]>(
      'SELECT * FROM pla_cts WHERE 1=1'
    );

    let ctsMigrated = 0;
    for (const ct of ctsRows) {
      try {
        await prisma.plaCt.create({
          data: {
            idcts_legacy: ct.idcts,
            idtrabajador: ct.idtrabajador,
            periodo: ct.periodo,
            monto_depuesto: ct.monto_depuesto,
            banco: ct.banco,
            idmi_empresa: ct.idmi_empresa,
          },
        });
        ctsMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando CTS ${ct.idcts}: ${error.message}`);
      }
    }
    logSuccess(module, `CTS migrados: ${ctsMigrated}/${ctsRows.length}`);
    stats.add('cts', ctsMigrated, ctsRows.length);

    // 9. Migrar Quinta Categoría
    logInfo(module, 'Migrando quinta categoría...');
    const [quintaRows] = await mysqlPool.query<LegacyQuintaCat[]>(
      'SELECT * FROM pla_quinta_cat WHERE 1=1'
    );

    let quintaMigrated = 0;
    for (const q of quintaRows) {
      try {
        await prisma.plaQuintaCat.create({
          data: {
            idquinta_cat_legacy: q.idquinta_cat,
            idtrabajador: q.idtrabajador,
            anio: q.anio,
            remuneracion_anual: q.remuneracion_anual,
            impuesto_calculado: q.impuesto_calculado,
            idmi_empresa: q.idmi_empresa,
          },
        });
        quintaMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando quinta cat ${q.idquinta_cat}: ${error.message}`);
      }
    }
    logSuccess(module, `Quinta categoría migrada: ${quintaMigrated}/${quintaRows.length}`);
    stats.add('quinta_categoria', quintaMigrated, quintaRows.length);

    logSuccess(module, '✅ Migración de recursos humanos completada');
  } catch (error: any) {
    logError(module, `Error crítico en migración de RRHH: ${error.message}`);
    throw error;
  }
}
