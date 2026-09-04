import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const empresaSchema = z.object({
  razonSocial: z.string().min(1),
  nombreComercial: z.string().optional(),
  ruc: z.string().length(11),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  igv: z.number().default(18),
  monedaBase: z.enum(['PEN', 'USD']).default('PEN'),
  logo: z.string().optional(),
  activo: z.boolean().default(true),
});

export const empresasRouter = new Hono();

// GET /api/empresas - Listar todas las empresas
empresasRouter.get('/', async (c) => {
  try {
    const empresas = await prisma.mi_empresa.findMany({
      where: { activo: true },
      include: {
        sedes: {
          where: { activo: true },
          include: {
            almacenes: {
              where: { activo: true }
            }
          }
        }
      },
      orderBy: { razonSocial: 'asc' }
    });
    return c.json({ success: true, data: empresas });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener empresas' }, 500);
  }
});

// GET /api/empresas/:id - Obtener empresa por ID
empresasRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const empresa = await prisma.mi_empresa.findUnique({
      where: { IdMiEmpresa: id },
      include: {
        sedes: {
          include: {
            almacenes: true
          }
        }
      }
    });
    
    if (!empresa) {
      return c.json({ success: false, error: 'Empresa no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: empresa });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener empresa' }, 500);
  }
});

// POST /api/empresas - Crear nueva empresa
empresasRouter.post('/', zValidator('json', empresaSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const empresa = await prisma.mi_empresa.create({
      data: {
        ...body,
        fechaRegistro: new Date(),
      },
      include: {
        sedes: true
      }
    });
    
    return c.json({ success: true, data: empresa, message: 'Empresa creada exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear empresa' }, 500);
  }
});

// PUT /api/empresas/:id - Actualizar empresa
empresasRouter.put('/:id', zValidator('json', empresaSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const empresa = await prisma.mi_empresa.update({
      where: { IdMiEmpresa: id },
      data: body,
      include: {
        sedes: true
      }
    });
    
    return c.json({ success: true, data: empresa, message: 'Empresa actualizada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar empresa' }, 500);
  }
});

// DELETE /api/empresas/:id - Eliminar empresa (soft delete)
empresasRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.mi_empresa.update({
      where: { IdMiEmpresa: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Empresa eliminada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar empresa' }, 500);
  }
});

export default empresasRouter;
