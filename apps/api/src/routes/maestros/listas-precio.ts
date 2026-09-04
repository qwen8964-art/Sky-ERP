import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const listaPrecioSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  IdMiSede: z.number().int().positive(),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  porcentajeListaBase: z.number().default(0), // Porcentaje sobre lista base
  esPredeterminada: z.boolean().default(false),
  activo: z.boolean().default(true),
});

export const listasPrecioRouter = new Hono();

// GET /api/listas-precio - Listar todas las listas de precios
listasPrecioRouter.get('/', async (c) => {
  try {
    const sedeId = c.req.query('sedeId');
    const where: any = { activo: true };
    
    if (sedeId) {
      where.IdMiSede = parseInt(sedeId);
    }
    
    const listas = await prisma.tipo_lista_precio.findMany({
      where,
      include: {
        sede: {
          include: {
            empresa: true
          }
        },
        preciosProductos: {
          include: {
            producto: true
          },
          take: 5
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: listas });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener listas de precio' }, 500);
  }
});

// GET /api/listas-precio/:id - Obtener lista de precios por ID
listasPrecioRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const lista = await prisma.tipo_lista_precio.findUnique({
      where: { IdTipoListaPrecio: id },
      include: {
        sede: {
          include: {
            empresa: true
          }
        },
        preciosProductos: {
          include: {
            producto: true
          }
        }
      }
    });
    
    if (!lista) {
      return c.json({ success: false, error: 'Lista de precios no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: lista });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener lista de precios' }, 500);
  }
});

// POST /api/listas-precio - Crear nueva lista de precios
listasPrecioRouter.post('/', zValidator('json', listaPrecioSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Verificar que la sede exista
    const sede = await prisma.mi_sede.findUnique({
      where: { IdMiSede: body.IdMiSede }
    });
    
    if (!sede) {
      return c.json({ success: false, error: 'Sede no encontrada' }, 404);
    }
    
    const lista = await prisma.tipo_lista_precio.create({
      data: body,
      include: {
        sede: true
      }
    });
    
    return c.json({ success: true, data: lista, message: 'Lista de precios creada exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear lista de precios' }, 500);
  }
});

// PUT /api/listas-precio/:id - Actualizar lista de precios
listasPrecioRouter.put('/:id', zValidator('json', listaPrecioSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const lista = await prisma.tipo_lista_precio.update({
      where: { IdTipoListaPrecio: id },
      data: body,
      include: {
        sede: true
      }
    });
    
    return c.json({ success: true, data: lista, message: 'Lista de precios actualizada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar lista de precios' }, 500);
  }
});

// DELETE /api/listas-precio/:id - Eliminar lista de precios (soft delete)
listasPrecioRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.tipo_lista_precio.update({
      where: { IdTipoListaPrecio: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Lista de precios eliminada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar lista de precios' }, 500);
  }
});

// GET /api/listas-precio/:id/productos - Obtener productos con precios de una lista
listasPrecioRouter.get('/:id/productos', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    const precios = await prisma.precio_venta_productos.findMany({
      where: { IdTipoListaPrecio: id },
      include: {
        producto: {
          include: {
            familiaGrupo: true
          }
        },
        listaPrecio: true
      },
      orderBy: { producto: { nombre: 'asc' } }
    });
    
    return c.json({ success: true, data: precios });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener productos de la lista' }, 500);
  }
});

// POST /api/listas-precio/:id/productos - Asignar precio a producto en lista
listasPrecioRouter.post('/:id/productos', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { IdProducto, precioVenta } = body;
    
    if (!IdProducto || !precioVenta) {
      return c.json({ 
        success: false, 
        error: 'Se requiere IdProducto y precioVenta' 
      }, 400);
    }
    
    // Verificar que el producto exista
    const producto = await prisma.producto.findUnique({
      where: { IdProducto: IdProducto }
    });
    
    if (!producto) {
      return c.json({ success: false, error: 'Producto no encontrado' }, 404);
    }
    
    // Crear o actualizar precio
    const precio = await prisma.precio_venta_productos.upsert({
      where: {
        IdProducto_IdTipoListaPrecio: {
          IdProducto,
          IdTipoListaPrecio: id
        }
      },
      update: { precioVenta },
      create: {
        IdProducto,
        IdTipoListaPrecio: id,
        precioVenta
      },
      include: {
        producto: true,
        listaPrecio: true
      }
    });
    
    return c.json({ success: true, data: precio, message: 'Precio asignado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al asignar precio' }, 500);
  }
});

export default listasPrecioRouter;
