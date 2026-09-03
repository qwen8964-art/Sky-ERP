import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const prisma = new PrismaClient();
const app = new Hono();

// Schema para Trabajador
const trabajadorSchema = z.object({
  idPersona: z.string(),
  codigoTrabajador: z.string(),
  fechaIngreso: z.string(),
  cargo: z.string().optional(),
  area: z.string().optional(),
  tipoContrato: z.enum(['INDEFINIDO', 'PLAZO_FIJO', 'TEMPORAL', 'PRACTICANTE']).default('INDEFINIDO'),
  estado: z.boolean().default(true),
  observaciones: z.string().optional()
});

// Schema para Contrato
const contratoSchema = z.object({
  idTrabajador: z.string(),
  tipoContrato: z.enum(['INDEFINIDO', 'PLAZO_FIJO', 'TEMPORAL', 'PRACTICANTE']),
  fechaInicio: z.string(),
  fechaFin: z.string().optional(),
  remuneracion: z.number().positive(),
  moneda: z.string().default('PEN'),
  horasDiarias: z.number().default(8),
  diasSemana: z.number().default(5),
  observaciones: z.string().optional()
});

// Schema para Asistencia
const asistenciaSchema = z.object({
  idTrabajador: z.string(),
  fecha: z.string(),
  horaEntrada: z.string().optional(),
  horaSalida: z.string().optional(),
  tipoRegistro: z.enum(['NORMAL', 'TARDANZA', 'FALTA', 'VACACION', 'LICENCIA']).default('NORMAL'),
  observaciones: z.string().optional()
});

// ==================== TRABAJADORES ====================

// GET: Listar trabajadores
app.get('/trabajadores', async (c) => {
  try {
    const { estado, area, buscar } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (estado !== undefined) where.estado = estado === 'true';
    if (area) where.area = area;
    if (buscar) {
      where.persona = {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { apellidoPaterno: { contains: buscar, mode: 'insensitive' } },
          { apellidoMaterno: { contains: buscar, mode: 'insensitive' } }
        ]
      };
    }
    
    const trabajadores = await prisma.plaTrabajadores.findMany({
      where,
      include: {
        persona: {
          select: {
            nombre: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            documentoIdentidad: true,
            email: true,
            telefono: true
          }
        },
        contratos: {
          take: 1,
          orderBy: { fechaInicio: 'desc' }
        }
      },
      orderBy: { apellidoPaterno: 'asc' }
    });
    
    return c.json({ success: true, data: trabajadores });
  } catch (error) {
    console.error('Error al listar trabajadores:', error);
    return c.json({ success: false, message: 'Error al obtener trabajadores' }, 500);
  }
});

// POST: Crear trabajador
app.post('/trabajadores', zValidator('json', trabajadorSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const trabajador = await prisma.plaTrabajadores.create({
      data: {
        idPersona: body.idPersona,
        codigoTrabajador: body.codigoTrabajador,
        fechaIngreso: new Date(body.fechaIngreso),
        cargo: body.cargo,
        area: body.area,
        tipoContrato: body.tipoContrato,
        estado: body.estado,
        observaciones: body.observaciones
      },
      include: {
        persona: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Trabajador creado exitosamente',
      data: trabajador
    }, 201);
  } catch (error) {
    console.error('Error al crear trabajador:', error);
    return c.json({ success: false, message: 'Error al crear trabajador' }, 500);
  }
});

// PUT: Actualizar trabajador
app.put('/trabajadores/:id', zValidator('json', trabajadorSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    
    const trabajador = await prisma.plaTrabajadores.update({
      where: { id },
      data: body,
      include: {
        persona: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Trabajador actualizado exitosamente',
      data: trabajador
    });
  } catch (error) {
    console.error('Error al actualizar trabajador:', error);
    return c.json({ success: false, message: 'Error al actualizar trabajador' }, 500);
  }
});

// DELETE: Eliminar trabajador (soft delete)
app.delete('/trabajadores/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    await prisma.plaTrabajadores.update({
      where: { id },
      data: { eliminado: true }
    });
    
    return c.json({ success: true, message: 'Trabajador eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar trabajador:', error);
    return c.json({ success: false, message: 'Error al eliminar trabajador' }, 500);
  }
});

// ==================== CONTRATOS ====================

// GET: Listar contratos
app.get('/contratos', async (c) => {
  try {
    const { idTrabajador, tipoContrato, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idTrabajador) where.idTrabajador = idTrabajador;
    if (tipoContrato) where.tipoContrato = tipoContrato;
    if (estado) where.estado = estado === 'true';
    
    const contratos = await prisma.plaContrato.findMany({
      where,
      include: {
        trabajador: {
          include: {
            persona: {
              select: {
                nombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true
              }
            }
          }
        }
      },
      orderBy: { fechaInicio: 'desc' }
    });
    
    return c.json({ success: true, data: contratos });
  } catch (error) {
    console.error('Error al listar contratos:', error);
    return c.json({ success: false, message: 'Error al obtener contratos' }, 500);
  }
});

// POST: Crear contrato
app.post('/contratos', zValidator('json', contratoSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const contrato = await prisma.plaContrato.create({
      data: {
        idTrabajador: body.idTrabajador,
        tipoContrato: body.tipoContrato,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
        remuneracion: body.remuneracion,
        moneda: body.moneda,
        horasDiarias: body.horasDiarias,
        diasSemana: body.diasSemana,
        estado: true,
        observaciones: body.observaciones
      },
      include: {
        trabajador: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Contrato creado exitosamente',
      data: contrato
    }, 201);
  } catch (error) {
    console.error('Error al crear contrato:', error);
    return c.json({ success: false, message: 'Error al crear contrato' }, 500);
  }
});

// PUT: Finalizar contrato
app.put('/contratos/:id/finalizar', async (c) => {
  try {
    const id = c.req.param('id');
    const { motivo } = await c.req.json();
    
    const contrato = await prisma.plaContrato.update({
      where: { id },
      data: { 
        estado: false,
        fechaFin: new Date(),
        observaciones: motivo || contrato.observaciones
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Contrato finalizado exitosamente',
      data: contrato
    });
  } catch (error) {
    console.error('Error al finalizar contrato:', error);
    return c.json({ success: false, message: 'Error al finalizar contrato' }, 500);
  }
});

// ==================== ASISTENCIA ====================

// GET: Listar asistencias
app.get('/asistencia', async (c) => {
  try {
    const { idTrabajador, fechaDesde, fechaHasta } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idTrabajador) where.idTrabajador = idTrabajador;
    
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
    }
    
    const asistencias = await prisma.plaAsistencia.findMany({
      where,
      include: {
        trabajador: {
          include: {
            persona: {
              select: {
                nombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true
              }
            }
          }
        }
      },
      orderBy: { fecha: 'desc' }
    });
    
    return c.json({ success: true, data: asistencias });
  } catch (error) {
    console.error('Error al listar asistencias:', error);
    return c.json({ success: false, message: 'Error al obtener asistencias' }, 500);
  }
});

// POST: Registrar asistencia
app.post('/asistencia', zValidator('json', asistenciaSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Verificar si ya existe registro para esa fecha
    const existente = await prisma.plaAsistencia.findUnique({
      where: {
        idTrabajador_fecha: {
          idTrabajador: body.idTrabajador,
          fecha: new Date(body.fecha).toISOString().split('T')[0]
        }
      }
    });
    
    if (existente) {
      // Actualizar registro existente
      const asistencia = await prisma.plaAsistencia.update({
        where: { id: existente.id },
        data: {
          horaEntrada: body.horaEntrada || existente.horaEntrada,
          horaSalida: body.horaSalida || existente.horaSalida,
          tipoRegistro: body.tipoRegistro,
          observaciones: body.observaciones
        },
        include: {
          trabajador: true
        }
      });
      
      return c.json({ 
        success: true, 
        message: 'Asistencia actualizada exitosamente',
        data: asistencia
      });
    }
    
    const asistencia = await prisma.plaAsistencia.create({
      data: {
        idTrabajador: body.idTrabajador,
        fecha: new Date(body.fecha),
        horaEntrada: body.horaEntrada,
        horaSalida: body.horaSalida,
        tipoRegistro: body.tipoRegistro,
        observaciones: body.observaciones
      },
      include: {
        trabajador: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Asistencia registrada exitosamente',
      data: asistencia
    }, 201);
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    return c.json({ success: false, message: 'Error al registrar asistencia' }, 500);
  }
});

// GET: Resumen de asistencia por período
app.get('/asistencia/resumen', async (c) => {
  try {
    const { fechaDesde, fechaHasta, idTrabajador } = c.req.query();
    
    if (!fechaDesde || !fechaHasta) {
      return c.json({ success: false, message: 'Fechas requeridas' }, 400);
    }
    
    const where: any = {
      fecha: {
        gte: new Date(fechaDesde),
        lte: new Date(fechaHasta)
      },
      eliminado: false
    };
    
    if (idTrabajador) where.idTrabajador = idTrabajador;
    
    const asistencias = await prisma.plaAsistencia.findMany({
      where,
      select: {
        idTrabajador: true,
        tipoRegistro: true
      }
    });
    
    // Agrupar por trabajador
    const resumen: any = {};
    asistencias.forEach(a => {
      if (!resumen[a.idTrabajador]) {
        resumen[a.idTrabajador] = {
          normales: 0,
          tardanzas: 0,
          faltas: 0,
          vacaciones: 0,
          licencias: 0
        };
      }
      resumen[a.idTrabajador][a.tipoRegistro.toLowerCase() + 's']++;
    });
    
    return c.json({ success: true, data: resumen });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    return c.json({ success: false, message: 'Error al obtener resumen' }, 500);
  }
});

export default app;
