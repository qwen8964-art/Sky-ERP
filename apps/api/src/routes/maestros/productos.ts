import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const productoSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  IdFamiliaGrupo: z.number().int().positive(),
  unidadMedida: z.string().default('UNIDAD'),
  tipoCambio: z.enum(['GRAVADO', 'EXONERADO', 'INAFECTO']).default('GRAVADO'),
  precioCompra: z.number().nonnegative().default(0),
  precioVenta: z.number().nonnegative().default(0),
  stockMinimo: z.number().int().default(0),
  stockMaximo: z.number().int().optional(),
  controlaSerie: z.boolean().default(false),
  esInsumo: z.boolean().default(false), // Para producción
  activo: z.boolean().default(true),
});

export const productosRouter = new Hono();

// GET /api/productos - Listar productos (con filtros)
productosRouter.get('/', async (c) => {
  try {
    const busqueda = c.req.query('q');
    const familiaId = c.req.query('familiaId');
    const soloActivos = c.req.query('activos') === 'true';
    
    const where: any = {};
    
    if (soloActivos) {
      where.activo = true;
    }
    
    if (familiaId) {
      where.IdFamiliaGrupo = parseInt(familiaId);
    }
    
    if (busqueda) {
      where.OR = [
        { codigo: { contains: busqueda.toUpperCase() } },
        { nombre: { contains: busqueda.toUpperCase() } },
        { descripcion: { contains: busqueda.toUpperCase() } }
      ];
    }
    
    const productos = await prisma.producto.findMany({
      where,
      include: {
        familiaGrupo: true,
        stocks: {
          include: {
            almacen: true
          }
        }
      },
      take: 50,
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: productos });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener productos' }, 500);
  }
});

// GET /api/productos/:id - Obtener producto por ID
productosRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const producto = await prisma.producto.findUnique({
      where: { IdProducto: id },
      include: {
        familiaGrupo: true,
        stocks: {
          include: {
            almacen: {
              include: {
                sede: true
              }
            }
          }
        },
        series: {
          take: 10,
          orderBy: { fechaRegistro: 'desc' }
        },
        atributos: true,
        preciosPorLista: {
          include: {
            listaPrecio: true
          }
        }
      }
    });
    
    if (!producto) {
      return c.json({ success: false, error: 'Producto no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: producto });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener producto' }, 500);
  }
});

// POST /api/productos - Crear nuevo producto
productosRouter.post('/', zValidator('json', productoSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Verificar que la familia exista
    const familia = await prisma.familia_grupo.findUnique({
      where: { IdFamiliaGrupo: body.IdFamiliaGrupo }
    });
    
    if (!familia) {
      return c.json({ success: false, error: 'Familia/Grupo no encontrado' }, 404);
    }
    
    // Verificar que el código no exista
    const existente = await prisma.producto.findUnique({
      where: { codigo: body.codigo }
    });
    
    if (existente) {
      return c.json({ 
        success: false, 
        error: 'Ya existe un producto con ese código' 
      }, 400);
    }
    
    const producto = await prisma.producto.create({
      data: {
        ...body,
        fechaRegistro: new Date()
      },
      include: {
        familiaGrupo: true
      }
    });
    
    return c.json({ success: true, data: producto, message: 'Producto creado exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear producto' }, 500);
  }
});

// PUT /api/productos/:id - Actualizar producto
productosRouter.put('/:id', zValidator('json', productoSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    // Si se actualiza el código, verificar que no esté duplicado
    if (body.codigo) {
      const existente = await prisma.producto.findFirst({
        where: {
          codigo: body.codigo,
          NOT: { IdProducto: id }
        }
      });
      
      if (existente) {
        return c.json({ 
          success: false, 
          error: 'Ya existe otro producto con ese código' 
        }, 400);
      }
    }
    
    const producto = await prisma.producto.update({
      where: { IdProducto: id },
      data: body,
      include: {
        familiaGrupo: true
      }
    });
    
    return c.json({ success: true, data: producto, message: 'Producto actualizado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar producto' }, 500);
  }
});

// DELETE /api/productos/:id - Eliminar producto (soft delete)
productosRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.producto.update({
      where: { IdProducto: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar producto' }, 500);
  }
});

// GET /api/productos/:id/stock - Obtener stock de un producto por almacén
productosRouter.get('/:id/stock', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const almacenId = c.req.query('almacenId');
    
    const where: any = { IdProducto: id };
    
    if (almacenId) {
      where.IdMiAlmacen = parseInt(almacenId);
    }
    
    const stocks = await prisma.alm_stock.findMany({
      where,
      include: {
        almacen: {
          include: {
            sede: true
          }
        },
        producto: true
      }
    });
    
    return c.json({ success: true, data: stocks });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener stock' }, 500);
  }
});

export default productosRouter;
