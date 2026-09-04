import { Pool as MySQLPool } from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logSuccess, MigrationStats } from './migration-utils';

/**
 * Migración 10: Producción y Capacitación
 * - Fórmulas de Producción
 * - Órdenes de Producción
 * - Partes de Producción
 * - Cursos de Capacitación
 * - Matrículas
 * - Calificaciones
 * - Programación
 */

interface LegacyFormula {
  idformula: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  costo_estimado: number;
  idmi_empresa: number;
  estado: string;
}

interface LegacyFormulaDetalle {
  idformula_detalle: number;
  idformula: number;
  idproducto_material: number;
  cantidad: number;
  unidad_medida: string;
  costo_unitario: number;
  costo_total: number;
}

interface LegacyOrdenProduccion {
  idorden_produccion: number;
  numero_orden: string;
  fecha_emision: Date;
  fecha_programada: Date;
  fecha_ejecucion?: Date | null;
  idformula: number;
  cantidad_a_producir: number;
  estado: string; // Pendiente/EnProceso/Completado/Anulado
  idmi_empresa: number;
  idsede: number;
  idalmacen: number;
}

interface LegacyParteProduccion {
  idparte_produccion: number;
  idorden_produccion: number;
  fecha_registro: Date;
  cantidad_producida: number;
  materiales_consumidos?: string | null;
  observacion?: string | null;
  idmi_empresa: number;
}

interface LegacyCurso {
  idcurso: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  duracion_horas: number;
  costo: number;
  idmi_empresa: number;
  estado: string;
}

interface LegacyMatricula {
  idmatricula: number;
  idcurso: number;
  idalumno: number; // idpersona
  fecha_matricula: Date;
  estado: string;
  idmi_empresa: number;
}

interface LegacyCalificacion {
  idcalificacion: number;
  idmatricula: number;
  nota: number;
  fecha_evaluacion: Date;
  tipo_evaluacion: string;
  idmi_empresa: number;
}

interface LegacyProgramacion {
  idprogramacion: number;
  idcurso: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  horario: string;
  idinstructor?: number | null;
  idmi_empresa: number;
  idsede?: number | null;
}

export async function migrateProduccionCapacitacion(
  mysqlPool: MySQLPool,
  prisma: PrismaClient,
  stats: MigrationStats
): Promise<void> {
  const module = 'PRODUCCION_CAPACITACION';
  
  try {
    logInfo(module, 'Iniciando migración de producción y capacitación...');

    // ===== PRODUCCIÓN =====
    
    // 1. Migrar Fórmulas
    logInfo(module, 'Migrando fórmulas de producción...');
    const [formulasRows] = await mysqlPool.query<LegacyFormula[]>(
      'SELECT * FROM produccion_formula WHERE 1=1'
    );

    let formulasMigrated = 0;
    for (const formula of formulasRows) {
      try {
        await prisma.produccionFormula.upsert({
          where: {
            idmi_empresa_idformula_legacy: {
              idmi_empresa: formula.idmi_empresa,
              idformula_legacy: formula.idformula,
            },
          },
          update: {
            codigo: formula.codigo,
            nombre: formula.nombre,
            descripcion: formula.descripcion || undefined,
            costo_estimado: formula.costo_estimado,
            estado: formula.estado === 'Activo',
          },
          create: {
            idformula_legacy: formula.idformula,
            idmi_empresa: formula.idmi_empresa,
            codigo: formula.codigo,
            nombre: formula.nombre,
            descripcion: formula.descripcion || undefined,
            costo_estimado: formula.costo_estimado,
            estado: formula.estado === 'Activo',
          },
        });
        formulasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando fórmula ${formula.idformula}: ${error.message}`);
      }
    }
    logSuccess(module, `Fórmulas migradas: ${formulasMigrated}/${formulasRows.length}`);
    stats.add('formulas', formulasMigrated, formulasRows.length);

    // 2. Migrar Detalle de Fórmulas
    logInfo(module, 'Migrando detalle de fórmulas...');
    const [formulasDetRows] = await mysqlPool.query<LegacyFormulaDetalle[]>(
      'SELECT * FROM produccion_formula_detalle WHERE 1=1'
    );

    let formulasDetMigrated = 0;
    for (const det of formulasDetRows) {
      try {
        await prisma.produccionFormulaDetalle.create({
          data: {
            idformula_detalle_legacy: det.idformula_detalle,
            idformula: det.idformula,
            idproducto_material: det.idproducto_material,
            cantidad: det.cantidad,
            unidad_medida: det.unidad_medida,
            costo_unitario: det.costo_unitario,
            costo_total: det.costo_total,
          },
        });
        formulasDetMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando detalle fórmula ${det.idformula_detalle}: ${error.message}`);
      }
    }
    logSuccess(module, `Detalles de fórmula migrados: ${formulasDetMigrated}/${formulasDetRows.length}`);
    stats.add('formulas_detalle', formulasDetMigrated, formulasDetRows.length);

    // 3. Migrar Órdenes de Producción
    logInfo(module, 'Migrando órdenes de producción...');
    const [ordenesProdRows] = await mysqlPool.query<LegacyOrdenProduccion[]>(
      'SELECT * FROM produccion_orden WHERE 1=1'
    );

    let ordenesProdMigrated = 0;
    for (const ord of ordenesProdRows) {
      try {
        await prisma.produccionOrden.upsert({
          where: {
            idmi_empresa_idorden_produccion_legacy: {
              idmi_empresa: ord.idmi_empresa,
              idorden_produccion_legacy: ord.idorden_produccion,
            },
          },
          update: {
            numero_orden: ord.numero_orden,
            fecha_emision: ord.fecha_emision,
            fecha_programada: ord.fecha_programada,
            fecha_ejecucion: ord.fecha_ejecucion || undefined,
            idformula: ord.idformula,
            cantidad_a_producir: ord.cantidad_a_producir,
            estado: ord.estado.toUpperCase() as any,
            idsede: ord.idsede,
            idalmacen: ord.idalmacen,
          },
          create: {
            idorden_produccion_legacy: ord.idorden_produccion,
            idmi_empresa: ord.idmi_empresa,
            numero_orden: ord.numero_orden,
            fecha_emision: ord.fecha_emision,
            fecha_programada: ord.fecha_programada,
            fecha_ejecucion: ord.fecha_ejecucion || undefined,
            idformula: ord.idformula,
            cantidad_a_producir: ord.cantidad_a_producir,
            estado: ord.estado.toUpperCase() as any,
            idsede: ord.idsede,
            idalmacen: ord.idalmacen,
          },
        });
        ordenesProdMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando orden producción ${ord.idorden_produccion}: ${error.message}`);
      }
    }
    logSuccess(module, `Órdenes de producción migradas: ${ordenesProdMigrated}/${ordenesProdRows.length}`);
    stats.add('ordenes_produccion', ordenesProdMigrated, ordenesProdRows.length);

    // 4. Migrar Partes de Producción
    logInfo(module, 'Migrando partes de producción...');
    const [partesProdRows] = await mysqlPool.query<LegacyParteProduccion[]>(
      'SELECT * FROM produccion_parte WHERE 1=1'
    );

    let partesProdMigrated = 0;
    for (const parte of partesProdRows) {
      try {
        await prisma.produccionParte.create({
          data: {
            idparte_produccion_legacy: parte.idparte_produccion,
            idorden_produccion: parte.idorden_produccion,
            fecha_registro: parte.fecha_registro,
            cantidad_producida: parte.cantidad_producida,
            materiales_consumidos: parte.materiales_consumidos || undefined,
            observacion: parte.observacion || undefined,
            idmi_empresa: parte.idmi_empresa,
          },
        });
        partesProdMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando parte producción ${parte.idparte_produccion}: ${error.message}`);
      }
    }
    logSuccess(module, `Partes de producción migrados: ${partesProdMigrated}/${partesProdRows.length}`);
    stats.add('partes_produccion', partesProdMigrated, partesProdRows.length);

    // ===== CAPACITACIÓN =====

    // 5. Migrar Cursos
    logInfo(module, 'Migrando cursos de capacitación...');
    const [cursosRows] = await mysqlPool.query<LegacyCurso[]>(
      'SELECT * FROM cap_cursos WHERE 1=1'
    );

    let cursosMigrated = 0;
    for (const curso of cursosRows) {
      try {
        await prisma.capCurso.upsert({
          where: {
            idmi_empresa_idcurso_legacy: {
              idmi_empresa: curso.idmi_empresa,
              idcurso_legacy: curso.idcurso,
            },
          },
          update: {
            codigo: curso.codigo,
            nombre: curso.nombre,
            descripcion: curso.descripcion || undefined,
            duracion_horas: curso.duracion_horas,
            costo: curso.costo,
            estado: curso.estado === 'Activo',
          },
          create: {
            idcurso_legacy: curso.idcurso,
            idmi_empresa: curso.idmi_empresa,
            codigo: curso.codigo,
            nombre: curso.nombre,
            descripcion: curso.descripcion || undefined,
            duracion_horas: curso.duracion_horas,
            costo: curso.costo,
            estado: curso.estado === 'Activo',
          },
        });
        cursosMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando curso ${curso.idcurso}: ${error.message}`);
      }
    }
    logSuccess(module, `Cursos migrados: ${cursosMigrated}/${cursosRows.length}`);
    stats.add('cursos', cursosMigrated, cursosRows.length);

    // 6. Migrar Matrículas
    logInfo(module, 'Migrando matrículas...');
    const [matriculasRows] = await mysqlPool.query<LegacyMatricula[]>(
      'SELECT * FROM cap_matricula WHERE 1=1'
    );

    let matriculasMigrated = 0;
    for (const mat of matriculasRows) {
      try {
        await prisma.capMatricula.create({
          data: {
            idmatricula_legacy: mat.idmatricula,
            idcurso: mat.idcurso,
            idalumno: mat.idalumno,
            fecha_matricula: mat.fecha_matricula,
            estado: mat.estado.toUpperCase() as any,
            idmi_empresa: mat.idmi_empresa,
          },
        });
        matriculasMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando matrícula ${mat.idmatricula}: ${error.message}`);
      }
    }
    logSuccess(module, `Matrículas migradas: ${matriculasMigrated}/${matriculasRows.length}`);
    stats.add('matriculas', matriculasMigrated, matriculasRows.length);

    // 7. Migrar Calificaciones
    logInfo(module, 'Migrando calificaciones...');
    const [calificacionesRows] = await mysqlPool.query<LegacyCalificacion[]>(
      'SELECT * FROM cap_calificaciones WHERE 1=1'
    );

    let calificacionesMigrated = 0;
    for (const cal of calificacionesRows) {
      try {
        await prisma.capCalificacione.create({
          data: {
            idcalificacion_legacy: cal.idcalificacion,
            idmatricula: cal.idmatricula,
            nota: cal.nota,
            fecha_evaluacion: cal.fecha_evaluacion,
            tipo_evaluacion: cal.tipo_evaluacion.toUpperCase() as any,
            idmi_empresa: cal.idmi_empresa,
          },
        });
        calificacionesMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando calificación ${cal.idcalificacion}: ${error.message}`);
      }
    }
    logSuccess(module, `Calificaciones migradas: ${calificacionesMigrated}/${calificacionesRows.length}`);
    stats.add('calificaciones', calificacionesMigrated, calificacionesRows.length);

    // 8. Migrar Programación
    logInfo(module, 'Migrando programación de cursos...');
    const [programacionRows] = await mysqlPool.query<LegacyProgramacion[]>(
      'SELECT * FROM cap_programacion WHERE 1=1'
    );

    let programacionMigrated = 0;
    for (const prog of programacionRows) {
      try {
        await prisma.capProgramacion.create({
          data: {
            idprogramacion_legacy: prog.idprogramacion,
            idcurso: prog.idcurso,
            fecha_inicio: prog.fecha_inicio,
            fecha_fin: prog.fecha_fin,
            horario: prog.horario,
            idinstructor: prog.idinstructor || undefined,
            idmi_empresa: prog.idmi_empresa,
            idsede: prog.idsede || undefined,
          },
        });
        programacionMigrated++;
      } catch (error: any) {
        logError(module, `Error migrando programación ${prog.idprogramacion}: ${error.message}`);
      }
    }
    logSuccess(module, `Programaciones migradas: ${programacionMigrated}/${programacionRows.length}`);
    stats.add('programacion', programacionMigrated, programacionRows.length);

    logSuccess(module, '✅ Migración de producción y capacitación completada');
  } catch (error: any) {
    logError(module, `Error crítico en migración de producción/capacitación: ${error.message}`);
    throw error;
  }
}
