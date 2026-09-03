import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const prisma = new PrismaClient();
const app = new Hono();

// Schema para Curso
const cursoSchema = z.object({
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().optional(),
  duracion: z.number().positive(), // en horas
  costo: z.number().default(0),
  estado: z.boolean().default(true)
});

// Schema para Programación de Curso
const programacionSchema = z.object({
  idCurso: z.string(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  horario: z.string(),
  idInstructor: z.string().optional(),
  cupoMaximo: z.number().positive(),
  estado: z.enum(['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO']).default('PROGRAMADO')
});

// Schema para Matrícula
const matriculaSchema = z.object({
  idProgramacion: z.string(),
  idAlumno: z.string(),
  fechaMatricula: z.string(),
  montoPago: z.number().default(0),
  estado: z.enum(['ACTIVO', 'RETIRADO', 'FINALIZADO']).default('ACTIVO'),
  observaciones: z.string().optional()
});

// Schema para Calificación
const calificacionSchema = z.object({
  idMatricula: z.string(),
  nota: z.number().min(0).max(20),
  tipoEvaluacion: z.enum(['PARCIAL', 'FINAL', 'TRABAJO', 'ASISTENCIA']).default('FINAL'),
  observaciones: z.string().optional()
});

// ==================== CURSOS ====================

// GET: Listar cursos
app.get('/cursos', async (c) => {
  try {
    const { estado, buscar } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (estado !== undefined) where.estado = estado === 'true';
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { codigo: { contains: buscar, mode: 'insensitive' } }
      ];
    }
    
    const cursos = await prisma.capCursos.findMany({
      where,
      include: {
        programaciones: {
          where: { eliminado: false },
          orderBy: { fechaInicio: 'desc' },
          take: 1
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: cursos });
  } catch (error) {
    console.error('Error al listar cursos:', error);
    return c.json({ success: false, message: 'Error al obtener cursos' }, 500);
  }
});

// POST: Crear curso
app.post('/cursos', zValidator('json', cursoSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const curso = await prisma.capCursos.create({
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        descripcion: body.descripcion,
        duracion: body.duracion,
        costo: body.costo,
        estado: body.estado
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Curso creado exitosamente',
      data: curso
    }, 201);
  } catch (error) {
    console.error('Error al crear curso:', error);
    return c.json({ success: false, message: 'Error al crear curso' }, 500);
  }
});

// PUT: Actualizar curso
app.put('/cursos/:id', zValidator('json', cursoSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    
    const curso = await prisma.capCursos.update({
      where: { id },
      data: body
    });
    
    return c.json({ 
      success: true, 
      message: 'Curso actualizado exitosamente',
      data: curso
    });
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    return c.json({ success: false, message: 'Error al actualizar curso' }, 500);
  }
});

// DELETE: Eliminar curso (soft delete)
app.delete('/cursos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    await prisma.capCursos.update({
      where: { id },
      data: { eliminado: true }
    });
    
    return c.json({ success: true, message: 'Curso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    return c.json({ success: false, message: 'Error al eliminar curso' }, 500);
  }
});

// ==================== PROGRAMACIÓN ====================

// GET: Listar programaciones
app.get('/programaciones', async (c) => {
  try {
    const { idCurso, estado, fechaDesde, fechaHasta } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idCurso) where.idCurso = idCurso;
    if (estado) where.estado = estado;
    
    if (fechaDesde || fechaHasta) {
      where.fechaInicio = {};
      if (fechaDesde) where.fechaInicio.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaInicio.lte = new Date(fechaHasta);
    }
    
    const programaciones = await prisma.capProgramacion.findMany({
      where,
      include: {
        curso: {
          select: {
            codigo: true,
            nombre: true,
            duracion: true
          }
        },
        matriculas: {
          where: { eliminado: false },
          select: {
            id: true,
            estado: true
          }
        }
      },
      orderBy: { fechaInicio: 'desc' }
    });
    
    // Agregar conteo de alumnos matriculados
    const result = programaciones.map(p => ({
      ...p,
      alumnosMatriculados: p.matriculas.filter(m => m.estado === 'ACTIVO').length
    }));
    
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error al listar programaciones:', error);
    return c.json({ success: false, message: 'Error al obtener programaciones' }, 500);
  }
});

// POST: Crear programación
app.post('/programaciones', zValidator('json', programacionSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const programacion = await prisma.capProgramacion.create({
      data: {
        idCurso: body.idCurso,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        horario: body.horario,
        idInstructor: body.idInstructor,
        cupoMaximo: body.cupoMaximo,
        estado: body.estado
      },
      include: {
        curso: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Programación creada exitosamente',
      data: programacion
    }, 201);
  } catch (error) {
    console.error('Error al crear programación:', error);
    return c.json({ success: false, message: 'Error al crear programación' }, 500);
  }
});

// PUT: Actualizar estado de programación
app.put('/programaciones/:id/estado', async (c) => {
  try {
    const id = c.req.param('id');
    const { estado } = await c.req.json();
    
    const programacion = await prisma.capProgramacion.update({
      where: { id },
      data: { estado }
    });
    
    return c.json({ 
      success: true, 
      message: 'Estado actualizado exitosamente',
      data: programacion
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return c.json({ success: false, message: 'Error al actualizar estado' }, 500);
  }
});

// ==================== MATRÍCULAS ====================

// GET: Listar matrículas
app.get('/matriculas', async (c) => {
  try {
    const { idProgramacion, idAlumno, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idProgramacion) where.idProgramacion = idProgramacion;
    if (idAlumno) where.idAlumno = idAlumno;
    if (estado) where.estado = estado;
    
    const matriculas = await prisma.capMatricula.findMany({
      where,
      include: {
        programacion: {
          include: {
            curso: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        },
        alumno: {
          select: {
            nombre: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            documentoIdentidad: true
          }
        },
        calificaciones: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { fechaMatricula: 'desc' }
    });
    
    return c.json({ success: true, data: matriculas });
  } catch (error) {
    console.error('Error al listar matrículas:', error);
    return c.json({ success: false, message: 'Error al obtener matrículas' }, 500);
  }
});

// POST: Crear matrícula
app.post('/matriculas', zValidator('json', matriculaSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Verificar cupo disponible
    const programacion = await prisma.capProgramacion.findUnique({
      where: { id: body.idProgramacion },
      include: {
        matriculas: {
          where: { estado: 'ACTIVO', eliminado: false }
        }
      }
    });
    
    if (!programacion) {
      return c.json({ success: false, message: 'Programación no encontrada' }, 404);
    }
    
    if (programacion.matriculas.length >= programacion.cupoMaximo) {
      return c.json({ success: false, message: 'No hay cupos disponibles' }, 400);
    }
    
    const matricula = await prisma.capMatricula.create({
      data: {
        idProgramacion: body.idProgramacion,
        idAlumno: body.idAlumno,
        fechaMatricula: new Date(body.fechaMatricula),
        montoPago: body.montoPago,
        estado: body.estado,
        observaciones: body.observaciones
      },
      include: {
        programacion: true,
        alumno: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Matrícula creada exitosamente',
      data: matricula
    }, 201);
  } catch (error) {
    console.error('Error al crear matrícula:', error);
    return c.json({ success: false, message: 'Error al crear matrícula' }, 500);
  }
});

// PUT: Retirar alumno
app.put('/matriculas/:id/retirar', async (c) => {
  try {
    const id = c.req.param('id');
    const { motivo } = await c.req.json();
    
    const matricula = await prisma.capMatricula.update({
      where: { id },
      data: { 
        estado: 'RETIRADO',
        observaciones: motivo || matricula.observaciones
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Alumno retirado exitosamente',
      data: matricula
    });
  } catch (error) {
    console.error('Error al retirar alumno:', error);
    return c.json({ success: false, message: 'Error al retirar alumno' }, 500);
  }
});

// ==================== CALIFICACIONES ====================

// GET: Listar calificaciones
app.get('/calificaciones', async (c) => {
  try {
    const { idMatricula } = c.req.query();
    
    const where: any = { eliminado: false };
    if (idMatricula) where.idMatricula = idMatricula;
    
    const calificaciones = await prisma.capCalificaciones.findMany({
      where,
      include: {
        matricula: {
          include: {
            alumno: {
              select: {
                nombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true
              }
            },
            programacion: {
              include: {
                curso: {
                  select: {
                    nombre: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return c.json({ success: true, data: calificaciones });
  } catch (error) {
    console.error('Error al listar calificaciones:', error);
    return c.json({ success: false, message: 'Error al obtener calificaciones' }, 500);
  }
});

// POST: Registrar calificación
app.post('/calificaciones', zValidator('json', calificacionSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const calificacion = await prisma.capCalificaciones.create({
      data: {
        idMatricula: body.idMatricula,
        nota: body.nota,
        tipoEvaluacion: body.tipoEvaluacion,
        observaciones: body.observaciones
      },
      include: {
        matricula: true
      }
    });
    
    // Verificar si el alumno aprobó (promedio >= 11)
    const todasCalificaciones = await prisma.capCalificaciones.findMany({
      where: { idMatricula: body.idMatricula, eliminado: false }
    });
    
    const promedio = todasCalificaciones.reduce((sum, c) => sum + c.nota, 0) / todasCalificaciones.length;
    
    if (promedio >= 11) {
      await prisma.capMatricula.update({
        where: { id: body.idMatricula },
        data: { estado: 'FINALIZADO' }
      });
    }
    
    return c.json({ 
      success: true, 
      message: 'Calificación registrada exitosamente',
      data: calificacion
    }, 201);
  } catch (error) {
    console.error('Error al registrar calificación:', error);
    return c.json({ success: false, message: 'Error al registrar calificación' }, 500);
  }
});

// GET: Resumen de curso
app.get('/programaciones/:id/resumen', async (c) => {
  try {
    const id = c.req.param('id');
    
    const programacion = await prisma.capProgramacion.findUnique({
      where: { id },
      include: {
        matriculas: {
          where: { eliminado: false },
          include: {
            calificaciones: {
              where: { eliminado: false }
            }
          }
        },
        curso: true
      }
    });
    
    if (!programacion) {
      return c.json({ success: false, message: 'Programación no encontrada' }, 404);
    }
    
    const matriculasActivas = programacion.matriculas.filter(m => m.estado === 'ACTIVO');
    const matriculasFinalizadas = programacion.matriculas.filter(m => m.estado === 'FINALIZADO');
    
    // Calcular promedios
    const promedios = matriculasFinalizadas.map(m => {
      const notas = m.calificaciones;
      const promedio = notas.reduce((sum, n) => sum + n.nota, 0) / notas.length;
      return promedio;
    });
    
    const promedioGeneral = promedios.length > 0 
      ? promedios.reduce((sum, p) => sum + p, 0) / promedios.length 
      : 0;
    
    return c.json({
      success: true,
      data: {
        curso: programacion.curso.nombre,
        fechaInicio: programacion.fechaInicio,
        fechaFin: programacion.fechaFin,
        cupoMaximo: programacion.cupoMaximo,
        alumnosMatriculados: matriculasActivas.length,
        alumnosRetirados: programacion.matriculas.filter(m => m.estado === 'RETIRADO').length,
        alumnosFinalizados: matriculasFinalizadas.length,
        promedioGeneral: Math.round(promedioGeneral * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    return c.json({ success: false, message: 'Error al obtener resumen' }, 500);
  }
});

export default app;
