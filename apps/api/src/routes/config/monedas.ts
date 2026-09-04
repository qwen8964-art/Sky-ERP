import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const monedaSchema = z.object({
  codigo: z.string().length(3), // PEN, USD, EUR, etc.
  nombre: z.string().min(1),
  simbolo: z.string().optional(),
  tipo: z.enum(['NACIONAL', 'EXTRANJERA']).default('EXTRANJERA'),
  activo: z.boolean().default(true),
});

export const monedasRouter = new Hono();

// GET /api/monedas - Listar todas las monedas
monedasRouter.get('/', async (c) => {
  try {
    const monedas = await prisma.tipo_moneda.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' }
    });
    
    return c.json({ success: true, data: monedas });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener monedas' }, 500);
  }
});

// GET /api/monedas/:codigo - Obtener moneda por código
monedasRouter.get('/:codigo', async (c) => {
  try {
    const codigo = c.req.param('codigo');
    const moneda = await prisma.tipo_moneda.findUnique({
      where: { codigo }
    });
    
    if (!moneda) {
      return c.json({ success: false, error: 'Moneda no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: moneda });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener moneda' }, 500);
  }
});

// POST /api/monedas - Crear nueva moneda
monedasRouter.post('/', zValidator('json', monedaSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const moneda = await prisma.tipo_moneda.create({
      data: body
    });
    
    return c.json({ success: true, data: moneda, message: 'Moneda creada exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear moneda' }, 500);
  }
});

// PUT /api/monedas/:codigo - Actualizar moneda
monedasRouter.put('/:codigo', zValidator('json', monedaSchema.partial()), async (c) => {
  try {
    const codigo = c.req.param('codigo');
    const body = c.req.valid('json');
    
    const moneda = await prisma.tipo_moneda.update({
      where: { codigo },
      data: body
    });
    
    return c.json({ success: true, data: moneda, message: 'Moneda actualizada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar moneda' }, 500);
  }
});

// DELETE /api/monedas/:codigo - Eliminar moneda (soft delete)
monedasRouter.delete('/:codigo', async (c) => {
  try {
    const codigo = c.req.param('codigo');
    
    await prisma.tipo_moneda.update({
      where: { codigo },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Moneda eliminada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar moneda' }, 500);
  }
});

export default monedasRouter;
