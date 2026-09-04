import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const tipoCambioSchema = z.object({
  fecha: z.string(), // YYYY-MM-DD
  compra: z.number().positive(),
  venta: z.number().positive(),
  fuente: z.enum(['MANUAL', 'SUNAT']).default('MANUAL'),
});

export const tipoCambioRouter = new Hono();

// GET /api/tipo-cambio - Listar tipo de cambio (filtrable por fecha)
tipoCambioRouter.get('/', async (c) => {
  try {
    const fecha = c.req.query('fecha');
    const where: any = {};
    
    if (fecha) {
      where.fecha = new Date(fecha);
    }
    
    const tipoCambios = await prisma.tipo_cambio.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: 30 // Últimos 30 días por defecto
    });
    
    return c.json({ success: true, data: tipoCambios });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener tipo de cambio' }, 500);
  }
});

// GET /api/tipo-cambio/hoy - Obtener tipo de cambio del día
tipoCambioRouter.get('/hoy', async (c) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let tipoCambio = await prisma.tipo_cambio.findFirst({
      where: {
        fecha: hoy
      }
    });
    
    // Si no hay tipo de cambio para hoy, buscar el más reciente
    if (!tipoCambio) {
      tipoCambio = await prisma.tipo_cambio.findFirst({
        orderBy: { fecha: 'desc' }
      });
    }
    
    if (!tipoCambio) {
      return c.json({ 
        success: false, 
        error: 'No hay tipo de cambio registrado. El sistema está bloqueado hasta configurarlo.' 
      }, 400);
    }
    
    return c.json({ success: true, data: tipoCambio });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener tipo de cambio' }, 500);
  }
});

// POST /api/tipo-cambio - Registrar tipo de cambio
tipoCambioRouter.post('/', zValidator('json', tipoCambioSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const fecha = new Date(body.fecha);
    fecha.setHours(0, 0, 0, 0);
    
    // Verificar si ya existe tipo de cambio para esa fecha
    const existente = await prisma.tipo_cambio.findUnique({
      where: { fecha }
    });
    
    let tipoCambio;
    
    if (existente) {
      // Actualizar existente
      tipoCambio = await prisma.tipo_cambio.update({
        where: { fecha },
        data: {
          compra: body.compra,
          venta: body.venta,
          fuente: body.fuente
        }
      });
    } else {
      // Crear nuevo
      tipoCambio = await prisma.tipo_cambio.create({
        data: {
          fecha,
          compra: body.compra,
          venta: body.venta,
          fuente: body.fuente
        }
      });
    }
    
    return c.json({ success: true, data: tipoCambio, message: 'Tipo de cambio registrado exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al registrar tipo de cambio' }, 500);
  }
});

// PUT /api/tipo-cambio/:fecha - Actualizar tipo de cambio de una fecha específica
tipoCambioRouter.put('/:fecha', zValidator('json', tipoCambioSchema.partial()), async (c) => {
  try {
    const fechaParam = c.req.param('fecha');
    const fecha = new Date(fechaParam);
    fecha.setHours(0, 0, 0, 0);
    const body = c.req.valid('json');
    
    const tipoCambio = await prisma.tipo_cambio.update({
      where: { fecha },
      data: body
    });
    
    return c.json({ success: true, data: tipoCambio, message: 'Tipo de cambio actualizado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar tipo de cambio' }, 500);
  }
});

export default tipoCambioRouter;
