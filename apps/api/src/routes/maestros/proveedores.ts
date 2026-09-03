import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const proveedorSchema = z.object({
  IdPersona: z.number().int().positive(),
  tipoProveedor: z.enum(['NATURAL', 'JURIDICA']).default('NATURAL'),
  categoria: z.enum(['A', 'B', 'C']).default('B'),
  limiteCredito: z.number().default(0),
  diasCredito: z.number().int().default(0),
  porcentajeRetencion: z.number().min(0).max(100).default(0), // Retención 1% o 2%
  porcentajePercepcion: z.number().min(0).max(100).default(0), // Percepción 1% o 2%
  cuentaBancaria: z.string().optional(),
  banco: z.string().optional(),
  activo: z.boolean().default(true),
});

export const proveedoresRouter = new Hono();

// GET /api/proveedores - Listar todos los proveedores
proveedoresRouter.get('/', async (c) => {
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
    
    const proveedores = await prisma.proveedor.findMany({
      where,
      include: {
        persona: true,
        documentosCompra: {
          take: 10,
          orderBy: { fechaEmision: 'desc' }
        }
      },
      orderBy: { persona: { nombre: 'asc' } }
    });
    
    return c.json({ success: true, data: proveedores });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener proveedores' }, 500);
  }
});

// GET /api/proveedores/:id - Obtener proveedor por ID
proveedoresRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const proveedor = await prisma.proveedor.findUnique({
      where: { IdProveedor: id },
      include: {
        persona: true,
        documentosCompra: {
          take: 10,
          orderBy: { fechaEmision: 'desc' }
        }
      }
    });
    
    if (!proveedor) {
      return c.json({ success: false, error: 'Proveedor no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: proveedor });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener proveedor' }, 500);
  }
});

// POST /api/proveedores - Crear nuevo proveedor
proveedoresRouter.post('/', zValidator('json', proveedorSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Verificar que la persona exista
    const persona = await prisma.persona.findUnique({
      where: { IdPersona: body.IdPersona }
    });
    
    if (!persona) {
      return c.json({ success: false, error: 'Persona no encontrada' }, 404);
    }
    
    const proveedor = await prisma.proveedor.create({
      data: body,
      include: {
        persona: true
      }
    });
    
    return c.json({ success: true, data: proveedor, message: 'Proveedor creado exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear proveedor' }, 500);
  }
});

// PUT /api/proveedores/:id - Actualizar proveedor
proveedoresRouter.put('/:id', zValidator('json', proveedorSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const proveedor = await prisma.proveedor.update({
      where: { IdProveedor: id },
      data: body,
      include: {
        persona: true
      }
    });
    
    return c.json({ success: true, data: proveedor, message: 'Proveedor actualizado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar proveedor' }, 500);
  }
});

// DELETE /api/proveedores/:id - Eliminar proveedor (soft delete)
proveedoresRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.proveedor.update({
      where: { IdProveedor: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar proveedor' }, 500);
  }
});

export default proveedoresRouter;
