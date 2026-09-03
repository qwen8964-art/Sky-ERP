import { Hono } from 'hono';
import { prisma } from '../db';

export const guiasRouter = new Hono();

// GET /api/guias - Listar guías (ingreso y salida)
guiasRouter.get('/', async (c) => {
  try {
    const tipo = c.req.query('tipo'); // GI, GS
    const sedeId = c.req.query('sedeId');
    const almacenId = c.req.query('almacenId');
    
    const where: any = {};
    
    if (tipo && ['GI', 'GS'].includes(tipo)) {
      where.tipoGuia = tipo;
    }
    
    if (sedeId) {
      where.IdMiSede = parseInt(sedeId);
    }
    
    if (almacenId) {
      where.IdMiAlmacen = parseInt(almacenId);
    }
    
    const guias = await prisma.alm_guia.findMany({
      where,
      include: {
        sede: true,
        almacen: true,
        comprobanteCompra: true,
        comprobanteVenta: true,
        detalles: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { fechaEmision: 'desc' },
      take: 50
    });
    
    return c.json({ success: true, data: guias });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener guías' }, 500);
  }
});

// GET /api/guias/:id - Obtener guía por ID
guiasRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const guia = await prisma.alm_guia.findUnique({
      where: { IdAlmGuia: id },
      include: {
        sede: true,
        almacen: true,
        comprobanteCompra: true,
        comprobanteVenta: true,
        detalles: {
          include: {
            producto: true
          }
        }
      }
    });
    
    if (!guia) {
      return c.json({ success: false, error: 'Guía no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: guia });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener guía' }, 500);
  }
});

// GET /api/guias/motivos - Listar motivos de guía
guiasRouter.get('/motivos', async (c) => {
  try {
    const motivos = await prisma.motivo_guia.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: motivos });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener motivos' }, 500);
  }
});

export default guiasRouter;
