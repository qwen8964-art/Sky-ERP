import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const clienteSchema = z.object({
  IdPersona: z.number().int().positive(),
  tipoCliente: z.enum(['NATURAL', 'JURIDICA']).default('NATURAL'),
  categoria: z.enum(['A', 'B', 'C']).default('B'), // Categoría de cliente
  limiteCredito: z.number().default(0),
  diasCredito: z.number().int().default(0),
  descuentoPorcentaje: z.number().min(0).max(100).default(0),
  vendedorId: z.number().int().optional(),
  ruta: z.string().optional(),
  zona: z.string().optional(),
  listaPrecioId: z.number().int().optional(),
  activo: z.boolean().default(true),
});

export const clientesRouter = new Hono();

// GET /api/clientes - Listar todos los clientes
clientesRouter.get('/', async (c) => {
  try {
    const busqueda = c.req.query('q');
    const where: any = { activo: true };
    
    if (busqueda) {
      where.persona = {
        OR: [
          { numeroDocumento: { contains: busqueda } },
          { nombre: { contains: busqueda } },
          { razonSocial: { contains: busqueda } }
        ]
      };
    }
    
    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        persona: true,
        vendedor: true,
        listaPrecio: true
      },
      orderBy: { persona: { nombre: 'asc' } }
    });
    
    return c.json({ success: true, data: clientes });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener clientes' }, 500);
  }
});

// GET /api/clientes/:id - Obtener cliente por ID
clientesRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const cliente = await prisma.cliente.findUnique({
      where: { IdCliente: id },
      include: {
        persona: true,
        vendedor: true,
        listaPrecio: true,
        documentosVenta: {
          take: 10,
          orderBy: { fechaEmision: 'desc' }
        }
      }
    });
    
    if (!cliente) {
      return c.json({ success: false, error: 'Cliente no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: cliente });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener cliente' }, 500);
  }
});

// POST /api/clientes - Crear nuevo cliente
clientesRouter.post('/', zValidator('json', clienteSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Verificar que la persona exista
    const persona = await prisma.persona.findUnique({
      where: { IdPersona: body.IdPersona }
    });
    
    if (!persona) {
      return c.json({ success: false, error: 'Persona no encontrada' }, 404);
    }
    
    const cliente = await prisma.cliente.create({
      data: body,
      include: {
        persona: true
      }
    });
    
    return c.json({ success: true, data: cliente, message: 'Cliente creado exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear cliente' }, 500);
  }
});

// PUT /api/clientes/:id - Actualizar cliente
clientesRouter.put('/:id', zValidator('json', clienteSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const cliente = await prisma.cliente.update({
      where: { IdCliente: id },
      data: body,
      include: {
        persona: true
      }
    });
    
    return c.json({ success: true, data: cliente, message: 'Cliente actualizado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar cliente' }, 500);
  }
});

// DELETE /api/clientes/:id - Eliminar cliente (soft delete)
clientesRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.cliente.update({
      where: { IdCliente: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar cliente' }, 500);
  }
});

export default clientesRouter;
