import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const almacenSchema = z.object({
  nombre: z.string().min(1),
  direccion: z.string().optional(),
  responsable: z.string().optional(),
  telefono: z.string().optional(),
  tipo: z.enum(['PRINCIPAL', 'SECUNDARIO', 'TRANSITO']).default('PRINCIPAL'),
  activo: z.boolean().default(true),
});

export const almacenesRouter = new Hono();

// GET /api/almacenes - Listar todos los almacenes (filtrables por sede)
almacenesRouter.get('/', async (c) => {
  try {
    const sedeId = c.req.query('sedeId');
    const where: any = { activo: true };
    
    if (sedeId) {
      where.IdMiSede = parseInt(sedeId);
    }
    
    const almacenes = await prisma.mi_almacen.findMany({
      where,
      include: {
        sede: {
          include: {
            empresa: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: almacenes });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener almacenes' }, 500);
  }
});

// GET /api/almacenes/:id - Obtener almacén por ID
almacenesRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const almacen = await prisma.mi_almacen.findUnique({
      where: { IdMiAlmacen: id },
      include: {
        sede: {
          include: {
            empresa: true
          }
        }
      }
    });
    
    if (!almacen) {
      return c.json({ success: false, error: 'Almacén no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: almacen });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener almacén' }, 500);
  }
});

// POST /api/almacenes - Crear nuevo almacén
almacenesRouter.post('/', zValidator('json', almacenSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const sedeId = body.sedeId || 1; // Default a primera sede si no se especifica
    
    const almacen = await prisma.mi_almacen.create({
      data: {
        ...body,
        IdMiSede: sedeId,
        fechaRegistro: new Date(),
      },
      include: {
        sede: {
          include: {
            empresa: true
          }
        }
      }
    });
    
    return c.json({ success: true, data: almacen, message: 'Almacén creado exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear almacén' }, 500);
  }
});

// PUT /api/almacenes/:id - Actualizar almacén
almacenesRouter.put('/:id', zValidator('json', almacenSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const almacen = await prisma.mi_almacen.update({
      where: { IdMiAlmacen: id },
      data: body,
      include: {
        sede: {
          include: {
            empresa: true
          }
        }
      }
    });
    
    return c.json({ success: true, data: almacen, message: 'Almacén actualizado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar almacén' }, 500);
  }
});

// DELETE /api/almacenes/:id - Eliminar almacén (soft delete)
almacenesRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.mi_almacen.update({
      where: { IdMiAlmacen: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Almacén eliminado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar almacén' }, 500);
  }
});

export default almacenesRouter;
