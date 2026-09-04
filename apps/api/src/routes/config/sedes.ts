import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const sedeSchema = z.object({
  nombre: z.string().min(1),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  responsable: z.string().optional(),
  activo: z.boolean().default(true),
});

export const sedesRouter = new Hono();

// GET /api/sedes - Listar todas las sedes (opcionalmente filtradas por empresa)
sedesRouter.get('/', async (c) => {
  try {
    const empresaId = c.req.query('empresaId');
    const where: any = { activo: true };
    
    if (empresaId) {
      where.IdMiEmpresa = parseInt(empresaId);
    }
    
    const sedes = await prisma.mi_sede.findMany({
      where,
      include: {
        empresa: true,
        almacenes: {
          where: { activo: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: sedes });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener sedes' }, 500);
  }
});

// GET /api/sedes/:id - Obtener sede por ID
sedesRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const sede = await prisma.mi_sede.findUnique({
      where: { IdMiSede: id },
      include: {
        empresa: true,
        almacenes: true
      }
    });
    
    if (!sede) {
      return c.json({ success: false, error: 'Sede no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: sede });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener sede' }, 500);
  }
});

// POST /api/sedes - Crear nueva sede
sedesRouter.post('/', zValidator('json', sedeSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const empresaId = body.empresaId || 1; // Default a primera empresa si no se especifica
    
    const sede = await prisma.mi_sede.create({
      data: {
        ...body,
        IdMiEmpresa: empresaId,
        fechaRegistro: new Date(),
      },
      include: {
        empresa: true,
        almacenes: true
      }
    });
    
    return c.json({ success: true, data: sede, message: 'Sede creada exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear sede' }, 500);
  }
});

// PUT /api/sedes/:id - Actualizar sede
sedesRouter.put('/:id', zValidator('json', sedeSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const sede = await prisma.mi_sede.update({
      where: { IdMiSede: id },
      data: body,
      include: {
        empresa: true,
        almacenes: true
      }
    });
    
    return c.json({ success: true, data: sede, message: 'Sede actualizada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar sede' }, 500);
  }
});

// DELETE /api/sedes/:id - Eliminar sede (soft delete)
sedesRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.mi_sede.update({
      where: { IdMiSede: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Sede eliminada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar sede' }, 500);
  }
});

export default sedesRouter;
