import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const cotizacionDetalleSchema = z.object({
  IdProducto: z.number().int().positive(),
  cantidad: z.number().positive(),
  precioUnitario: z.number().nonnegative(),
  descuentoPorcentaje: z.number().min(0).max(100).default(0),
  impuesto: z.boolean().default(true), // Si paga IGV
});

const cotizacionSchema = z.object({
  IdCliente: z.number().int().positive(),
  IdVendedor: z.number().int().optional(),
  IdMiSede: z.number().int().positive(),
  IdMiAlmacen: z.number().int().positive(),
  fechaEmision: z.string().optional(), // YYYY-MM-DD
  fechaValidez: z.string().optional(), // YYYY-MM-DD
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().default(1),
  observaciones: z.string().optional(),
  detalles: z.array(cotizacionDetalleSchema).min(1),
});

export const cotizacionesRouter = new Hono();

// GET /api/cotizaciones - Listar cotizaciones (con filtros)
cotizacionesRouter.get('/', async (c) => {
  try {
    const estado = c.req.query('estado');
    const clienteId = c.req.query('clienteId');
    const sedeId = c.req.query('sedeId');
    
    const where: any = {};
    
    if (estado && ['BORRADOR', 'APROBADA', 'ANULADA'].includes(estado)) {
      where.estado = estado;
    }
    
    if (clienteId) {
      where.IdCliente = parseInt(clienteId);
    }
    
    if (sedeId) {
      where.IdMiSede = parseInt(sedeId);
    }
    
    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      include: {
        cliente: {
          include: {
            persona: true
          }
        },
        vendedor: {
          include: {
            persona: true
          }
        },
        sede: true,
        almacen: true,
        detalles: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { fechaEmision: 'desc' },
      take: 50
    });
    
    return c.json({ success: true, data: cotizaciones });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener cotizaciones' }, 500);
  }
});

// GET /api/cotizaciones/:id - Obtener cotización por ID
cotizacionesRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { IdCotizacion: id },
      include: {
        cliente: {
          include: {
            persona: true
          }
        },
        vendedor: {
          include: {
            persona: true
          }
        },
        sede: true,
        almacen: true,
        detalles: {
          include: {
            producto: true
          }
        },
        comprobanteVenta: true // Si ya se generó comprobante desde esta cotización
      }
    });
    
    if (!cotizacion) {
      return c.json({ success: false, error: 'Cotización no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: cotizacion });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener cotización' }, 500);
  }
});

// POST /api/cotizaciones - Crear nueva cotización
cotizacionesRouter.post('/', zValidator('json', cotizacionSchema), async (c) => {
  const t = await prisma.$transaction(async (tx) => {
    try {
      const body = c.req.valid('json');
      
      // Verificar que el cliente exista
      const cliente = await tx.cliente.findUnique({
        where: { IdCliente: body.IdCliente }
      });
      
      if (!cliente) {
        return { success: false, error: 'Cliente no encontrado', status: 404 };
      }
      
      // Verificar que el almacén exista
      const almacen = await tx.mi_almacen.findUnique({
        where: { IdMiAlmacen: body.IdMiAlmacen }
      });
      
      if (!almacen) {
        return { success: false, error: 'Almacén no encontrado', status: 404 };
      }
      
      // Calcular totales
      let subTotal = 0;
      let igv = 0;
      let total = 0;
      
      for (const detalle of body.detalles) {
        const subtotalLinea = detalle.cantidad * detalle.precioUnitario;
        const descuento = subtotalLinea * (detalle.descuentoPorcentaje / 100);
        const baseImponible = subtotalLinea - descuento;
        
        subTotal += baseImponible;
        
        if (detalle.impuesto) {
          igv += baseImponible * 0.18; // IGV configurable desde empresa
        }
      }
      
      total = subTotal + igv;
      
      // Crear cotización
      const cotizacion = await tx.cotizacion.create({
        data: {
          IdCliente: body.IdCliente,
          IdVendedor: body.IdVendedor,
          IdMiSede: body.IdMiSede,
          IdMiAlmacen: body.IdMiAlmacen,
          fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : new Date(),
          fechaValidez: body.fechaValidez ? new Date(body.fechaValidez) : null,
          moneda: body.moneda,
          tipoCambio: body.tipoCambio,
          observaciones: body.observaciones,
          subTotal,
          igv,
          total,
          estado: 'BORRADOR',
          detalles: {
            create: body.detalles.map(detalle => ({
              IdProducto: detalle.IdProducto,
              cantidad: detalle.cantidad,
              precioUnitario: detalle.precioUnitario,
              descuentoPorcentaje: detalle.descuentoPorcentaje,
              impuesto: detalle.impuesto,
              subtotal: detalle.cantidad * detalle.precioUnitario,
              igv: detalle.impuesto ? (detalle.cantidad * detalle.precioUnitario) * 0.18 : 0,
              total: (detalle.cantidad * detalle.precioUnitario) + (detalle.impuesto ? (detalle.cantidad * detalle.precioUnitario) * 0.18 : 0)
            }))
          }
        },
        include: {
          cliente: {
            include: { persona: true }
          },
          detalles: {
            include: { producto: true }
          }
        }
      });
      
      return { success: true, data: cotizacion, message: 'Cotización creada exitosamente', status: 201 };
    } catch (error) {
      return { success: false, error: 'Error al crear cotización', status: 500 };
    }
  });
  
  return c.json(t, t.status || 200);
});

// PUT /api/cotizaciones/:id - Actualizar cotización (solo si está en borrador)
cotizacionesRouter.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    
    // Verificar estado
    const existente = await prisma.cotizacion.findUnique({
      where: { IdCotizacion: id }
    });
    
    if (!existente) {
      return c.json({ success: false, error: 'Cotización no encontrada' }, 404);
    }
    
    if (existente.estado !== 'BORRADOR') {
      return c.json({ 
        success: false, 
        error: 'Solo se pueden modificar cotizaciones en estado BORRADOR' 
      }, 400);
    }
    
    // Actualizar cotización (implementación simplificada)
    const cotizacion = await prisma.cotizacion.update({
      where: { IdCotizacion: id },
      data: body,
      include: {
        cliente: { include: { persona: true } },
        detalles: { include: { producto: true } }
      }
    });
    
    return c.json({ success: true, data: cotizacion, message: 'Cotización actualizada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar cotización' }, 500);
  }
});

// POST /api/cotizaciones/:id/aprobar - Aprobar cotización
cotizacionesRouter.post('/:id/aprobar', async (c) => {
  const t = await prisma.$transaction(async (tx) => {
    try {
      const id = parseInt(c.req.param('id'));
      
      const cotizacion = await tx.cotizacion.findUnique({
        where: { IdCotizacion: id },
        include: { detalles: true }
      });
      
      if (!cotizacion) {
        return { success: false, error: 'Cotización no encontrada', status: 404 };
      }
      
      if (cotizacion.estado !== 'BORRADOR') {
        return { 
          success: false, 
          error: 'Solo se pueden aprobar cotizaciones en estado BORRADOR', 
          status: 400 
        };
      }
      
      // Verificar stock disponible
      for (const detalle of cotizacion.detalles) {
        const stock = await tx.alm_stock.findFirst({
          where: {
            IdProducto: detalle.IdProducto,
            IdMiAlmacen: cotizacion.IdMiAlmacen
          }
        });
        
        const stockDisponible = stock?.cantidad || 0;
        
        if (stockDisponible < detalle.cantidad) {
          return { 
            success: false, 
            error: `Stock insuficiente para producto ${detalle.IdProducto}. Disponible: ${stockDisponible}, Requerido: ${detalle.cantidad}`, 
            status: 400 
          };
        }
      }
      
      // Aprobar cotización
      const cotizacionAprobada = await tx.cotizacion.update({
        where: { IdCotizacion: id },
        data: { 
          estado: 'APROBADA',
          fechaAprobacion: new Date()
        },
        include: {
          cliente: { include: { persona: true } },
          detalles: { include: { producto: true } }
        }
      });
      
      return { success: true, data: cotizacionAprobada, message: 'Cotización aprobada exitosamente' };
    } catch (error) {
      return { success: false, error: 'Error al aprobar cotización', status: 500 };
    }
  });
  
  return c.json(t, t.status || 200);
});

// POST /api/cotizaciones/:id/anular - Anular cotización
cotizacionesRouter.post('/:id/anular', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { IdCotizacion: id }
    });
    
    if (!cotizacion) {
      return c.json({ success: false, error: 'Cotización no encontrada' }, 404);
    }
    
    if (cotizacion.estado === 'ANULADA') {
      return c.json({ 
        success: false, 
        error: 'La cotización ya está anulada' 
      }, 400);
    }
    
    const cotizacionAnulada = await prisma.cotizacion.update({
      where: { IdCotizacion: id },
      data: { 
        estado: 'ANULADA',
        fechaAnulacion: new Date()
      },
      include: {
        cliente: { include: { persona: true } },
        detalles: { include: { producto: true } }
      }
    });
    
    return c.json({ success: true, data: cotizacionAnulada, message: 'Cotización anulada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al anular cotización' }, 500);
  }
});

export default cotizacionesRouter;
