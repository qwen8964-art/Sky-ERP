import { Hono } from 'hono';
import { prisma } from '../db';

export const stockRouter = new Hono();

// GET /api/stock - Listar stock por almacén (con filtros)
stockRouter.get('/', async (c) => {
  try {
    const almacenId = c.req.query('almacenId');
    const productoId = c.req.query('productoId');
    const familiaId = c.req.query('familiaId');
    const soloStockMinimo = c.req.query('minimo') === 'true';
    
    const where: any = {};
    
    if (almacenId) {
      where.IdMiAlmacen = parseInt(almacenId);
    }
    
    if (productoId) {
      where.IdProducto = parseInt(productoId);
    }
    
    if (soloStockMinimo) {
      // Stock menor o igual al mínimo definido en producto
      where.cantidad = { lte: 0 }; // Se ajustará después con include
    }
    
    const stocks = await prisma.alm_stock.findMany({
      where,
      include: {
        producto: {
          include: {
            familiaGrupo: true
          }
        },
        almacen: {
          include: {
            sede: true
          }
        }
      },
      take: 100,
      orderBy: { producto: { nombre: 'asc' } }
    });
    
    // Filtrar por stock mínimo si es necesario
    let resultado = stocks;
    if (soloStockMinimo) {
      resultado = stocks.filter(s => {
        const stockMin = s.producto.stockMinimo || 0;
        return s.cantidad <= stockMin;
      });
    }
    
    // Filtrar por familia si se especificó
    if (familiaId) {
      resultado = resultado.filter(s => s.producto.IdFamiliaGrupo === parseInt(familiaId));
    }
    
    return c.json({ success: true, data: resultado });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener stock' }, 500);
  }
});

// GET /api/stock/resumen - Resumen de stock por producto (todos los almacenes)
stockRouter.get('/resumen', async (c) => {
  try {
    const productoId = c.req.query('productoId');
    
    const where: any = {};
    if (productoId) {
      where.IdProducto = parseInt(productoId);
    }
    
    // Agrupar stock por producto
    const stocks = await prisma.alm_stock.groupBy({
      by: ['IdProducto'],
      where,
      _sum: { cantidad: true }
    });
    
    const resultado = await Promise.all(
      stocks.map(async (s) => {
        const producto = await prisma.producto.findUnique({
          where: { IdProducto: s.IdProducto! },
          include: {
            familiaGrupo: true,
            stocks: {
              include: {
                almacen: true
              }
            }
          }
        });
        
        return {
          producto,
          stockTotal: s._sum.cantidad || 0,
          almacenes: s
        };
      })
    );
    
    return c.json({ success: true, data: resultado });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener resumen de stock' }, 500);
  }
});

// GET /api/stock/kardex/:productoId - Kardex de un producto
stockRouter.get('/kardex/:productoId', async (c) => {
  try {
    const productoId = parseInt(c.req.param('productoId'));
    const almacenId = c.req.query('almacenId');
    const fechaDesde = c.req.query('desde');
    const fechaHasta = c.req.query('hasta');
    
    const where: any = { IdProducto: productoId };
    
    if (almacenId) {
      where.IdMiAlmacen = parseInt(almacenId);
    }
    
    if (fechaDesde || fechaHasta) {
      where.fechaRegistro = {};
      if (fechaDesde) where.fechaRegistro.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaRegistro.lte = new Date(fechaHasta);
    }
    
    const kardex = await prisma.kardex.findMany({
      where,
      include: {
        producto: true,
        almacen: true
      },
      orderBy: { fechaRegistro: 'desc' },
      take: 100
    });
    
    return c.json({ success: true, data: kardex });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener kardex' }, 500);
  }
});

export default stockRouter;
