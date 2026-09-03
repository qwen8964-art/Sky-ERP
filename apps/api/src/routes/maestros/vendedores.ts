import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const vendedorSchema = z.object({
  IdPersona: z.number().int().positive(),
  codigo: z.string().optional(),
  comisionPorcentaje: z.number().min(0).max(100).default(0),
  tipoComision: z.enum(['VENTA', 'COBRO']).default('VENTA'),
  zona: z.string().optional(),
  ruta: z.string().optional(),
  supervisorId: z.number().int().optional(),
  activo: z.boolean().default(true),
});

export const vendedoresRouter = new Hono();

// GET /api/vendedores - Listar todos los vendedores
vendedoresRouter.get('/', async (c) => {
  try {
    const busqueda = c.req.query('q');
    const where: any = { activo: true };
    
    if (busqueda) {
      where.persona = {
        OR: [
          { numeroDocumento: { contains: busqueda } },
          { nombre: { contains: busqueda } },
          { apellidoPaterno: { contains: busqueda } }
        ]
      };
    }
    
    const vendedores = await prisma.vendedor.findMany({
      where,
      include: {
        persona: true,
        supervisor: true,
        clientes: {
          take: 5
        }
      },
      orderBy: { persona: { nombre: 'asc' } }
    });
    
    return c.json({ success: true, data: vendedores });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener vendedores' }, 500);
  }
});

// GET /api/vendedores/:id - Obtener vendedor por ID
vendedoresRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const vendedor = await prisma.vendedor.findUnique({
      where: { IdVendedor: id },
      include: {
        persona: true,
        supervisor: true,
        clientes: true,
        documentosVenta: {
          take: 10,
          orderBy: { fechaEmision: 'desc' }
        }
      }
    });
    
    if (!vendedor) {
      return c.json({ success: false, error: 'Vendedor no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: vendedor });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener vendedor' }, 500);
  }
});

// POST /api/vendedores - Crear nuevo vendedor
vendedoresRouter.post('/', zValidator('json', vendedorSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Verificar que la persona exista
    const persona = await prisma.persona.findUnique({
      where: { IdPersona: body.IdPersona }
    });
    
    if (!persona) {
      return c.json({ success: false, error: 'Persona no encontrada' }, 404);
    }
    
    const vendedor = await prisma.vendedor.create({
      data: body,
      include: {
        persona: true
      }
    });
    
    return c.json({ success: true, data: vendedor, message: 'Vendedor creado exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear vendedor' }, 500);
  }
});

// PUT /api/vendedores/:id - Actualizar vendedor
vendedoresRouter.put('/:id', zValidator('json', vendedorSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const vendedor = await prisma.vendedor.update({
      where: { IdVendedor: id },
      data: body,
      include: {
        persona: true
      }
    });
    
    return c.json({ success: true, data: vendedor, message: 'Vendedor actualizado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar vendedor' }, 500);
  }
});

// DELETE /api/vendedores/:id - Eliminar vendedor (soft delete)
vendedoresRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.vendedor.update({
      where: { IdVendedor: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Vendedor eliminado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar vendedor' }, 500);
  }
});

export default vendedoresRouter;
