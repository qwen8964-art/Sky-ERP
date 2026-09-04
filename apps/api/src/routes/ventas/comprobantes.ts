import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const comprobanteDetalleSchema = z.object({
  IdProducto: z.number().int().positive(),
  cantidad: z.number().positive(),
  precioUnitario: z.number().nonnegative(),
  descuentoPorcentaje: z.number().min(0).max(100).default(0),
  impuesto: z.boolean().default(true), // Si paga IGV
});

const comprobanteVentaSchema = z.object({
  IdCliente: z.number().int().positive(),
  IdVendedor: z.number().int().optional(),
  IdMiSede: z.number().int().positive(),
  IdMiAlmacen: z.number().int().positive(),
  tipoComprobante: z.enum(['FACTURA', 'BOLETA', 'NC', 'ND']),
  serie: z.string().length(4),
  correlativo: z.string().optional(), // Auto si no se proporciona
  IdCotizacion: z.number().int().optional(), // Cotización de origen
  fechaEmision: z.string().optional(),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  tipoCambio: z.number().positive().default(1),
  observaciones: z.string().optional(),
  detalles: z.array(comprobanteDetalleSchema).min(1),
});

export const comprobantesVentaRouter = new Hono();

// GET /api/comprobantes-venta - Listar comprobantes de venta
comprobantesVentaRouter.get('/', async (c) => {
  try {
    const tipo = c.req.query('tipo');
    const estado = c.req.query('estado');
    const clienteId = c.req.query('clienteId');
    const sedeId = c.req.query('sedeId');
    
    const where: any = {};
    
    if (tipo && ['FACTURA', 'BOLETA', 'NC', 'ND'].includes(tipo)) {
      where.tipoComprobante = tipo;
    }
    
    if (estado && ['BORRADOR', 'APROBADO', 'ANULADO'].includes(estado)) {
      where.estado = estado;
    }
    
    if (clienteId) {
      where.IdCliente = parseInt(clienteId);
    }
    
    if (sedeId) {
      where.IdMiSede = parseInt(sedeId);
    }
    
    const comprobantes = await prisma.comprobante_venta.findMany({
      where,
      include: {
        cliente: {
          include: { persona: true }
        },
        vendedor: {
          include: { persona: true }
        },
        sede: true,
        almacen: true,
        cotizacion: true,
        detalles: {
          include: { producto: true }
        },
        guiaSalida: true
      },
      orderBy: { fechaEmision: 'desc' },
      take: 50
    });
    
    return c.json({ success: true, data: comprobantes });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener comprobantes' }, 500);
  }
});

// GET /api/comprobantes-venta/:id - Obtener comprobante por ID
comprobantesVentaRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const comprobante = await prisma.comprobante_venta.findUnique({
      where: { IdComprobanteVenta: id },
      include: {
        cliente: {
          include: { persona: true }
        },
        vendedor: {
          include: { persona: true }
        },
        sede: true,
        almacen: true,
        cotizacion: true,
        detalles: {
          include: { producto: true }
        },
        guiaSalida: true,
        notasCredito: true,
        notasDebito: true,
        ctasCobrar: true
      }
    });
    
    if (!comprobante) {
      return c.json({ success: false, error: 'Comprobante no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: comprobante });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener comprobante' }, 500);
  }
});

// POST /api/comprobantes-venta - Crear nuevo comprobante de venta
comprobantesVentaRouter.post('/', zValidator('json', comprobanteVentaSchema), async (c) => {
  const t = await prisma.$transaction(async (tx) => {
    try {
      const body = c.req.valid('json');
      
      // Verificar cliente
      const cliente = await tx.cliente.findUnique({
        where: { IdCliente: body.IdCliente }
      });
      
      if (!cliente) {
        return { success: false, error: 'Cliente no encontrado', status: 404 };
      }
      
      // Verificar almacén
      const almacen = await tx.mi_almacen.findUnique({
        where: { IdMiAlmacen: body.IdMiAlmacen }
      });
      
      if (!almacen) {
        return { success: false, error: 'Almacén no encontrado', status: 404 };
      }
      
      // Obtener correlativo automático si no se proporciona
      let correlativo = body.correlativo;
      if (!correlativo) {
        const correlativoDoc = await tx.correlativos_doc.findFirst({
          where: {
            IdMiSede: body.IdMiSede,
            tipoDocumento: body.tipoComprobante,
            serie: body.serie
          }
        });
        
        if (!correlativoDoc) {
          return { 
            success: false, 
            error: `No hay correlativo configurado para ${body.tipoComprobante} serie ${body.serie}`, 
            status: 400 
          };
        }
        
        correlativo = String(correlativoDoc.correlativoActual + 1).padStart(8, '0');
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
          igv += baseImponible * 0.18;
        }
      }
      
      total = subTotal + igv;
      
      // Crear comprobante
      const comprobante = await tx.comprobante_venta.create({
        data: {
          IdCliente: body.IdCliente,
          IdVendedor: body.IdVendedor,
          IdMiSede: body.IdMiSede,
          IdMiAlmacen: body.IdMiAlmacen,
          tipoComprobante: body.tipoComprobante,
          serie: body.serie,
          correlativo: correlativo!,
          IdCotizacion: body.IdCotizacion,
          fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : new Date(),
          moneda: body.moneda,
          tipoCambio: body.tipoCambio,
          observaciones: body.observaciones,
          subTotal,
          igv,
          total,
          estado: 'APROBADO', // Se aprueba directamente
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
          cliente: { include: { persona: true } },
          detalles: { include: { producto: true } }
        }
      });
      
      // Actualizar correlativo
      if (!body.correlativo) {
        await tx.correlativos_doc.updateMany({
          where: {
            IdMiSede: body.IdMiSede,
            tipoDocumento: body.tipoComprobante,
            serie: body.serie
          },
          data: {
            correlativoActual: parseInt(correlativo!)
          }
        });
      }
      
      // Generar guía de salida automática
      const guia = await tx.alm_guia.create({
        data: {
          IdMiSede: body.IdMiSede,
          IdMiAlmacen: body.IdMiAlmacen,
          tipoGuia: 'GS', // Guía de Salida
          motivo: 'VENTA',
          numero: '00000001', // Debe generarse con correlativo
          fechaEmision: new Date(),
          IdComprobanteVenta: comprobante.IdComprobanteVenta,
          detalles: {
            create: body.detalles.map(detalle => ({
              IdProducto: detalle.IdProducto,
              cantidad: detalle.cantidad,
              precioUnitario: detalle.precioUnitario
            }))
          }
        }
      });
      
      // Actualizar stock
      for (const detalle of body.detalles) {
        await tx.alm_stock.upsert({
          where: {
            IdMiAlmacen_IdProducto: {
              IdMiAlmacen: body.IdMiAlmacen,
              IdProducto: detalle.IdProducto
            }
          },
          update: {
            cantidad: { decrement: detalle.cantidad }
          },
          create: {
            IdMiAlmacen: body.IdMiAlmacen,
            IdProducto: detalle.IdProducto,
            cantidad: -detalle.cantidad
          }
        });
        
        // Registrar en kardex
        await tx.kardex.create({
          data: {
            IdProducto: detalle.IdProducto,
            IdMiAlmacen: body.IdMiAlmacen,
            tipoMovimiento: 'SALIDA',
            documentoOrigen: `F${comprobante.correlativo}`,
            cantidad: detalle.cantidad,
            costoUnitario: detalle.precioUnitario,
            saldoCantidad: { decrement: detalle.cantidad }
          }
        });
      }
      
      // Generar cuenta por cobrar si es crédito (implementación futura)
      // Por ahora, todas son al contado
      
      return { success: true, data: { ...comprobante, guiaSalida: guia }, message: 'Comprobante creado exitosamente', status: 201 };
    } catch (error) {
      console.error(error);
      return { success: false, error: 'Error al crear comprobante', status: 500 };
    }
  });
  
  return c.json(t, t.status || 200);
});

// POST /api/comprobantes-venta/:id/anular - Anular comprobante
comprobantesVentaRouter.post('/:id/anular', async (c) => {
  const t = await prisma.$transaction(async (tx) => {
    try {
      const id = parseInt(c.req.param('id'));
      
      const comprobante = await tx.comprobante_venta.findUnique({
        where: { IdComprobanteVenta: id },
        include: { detalles: true }
      });
      
      if (!comprobante) {
        return { success: false, error: 'Comprobante no encontrado', status: 404 };
      }
      
      if (comprobante.estado === 'ANULADO') {
        return { success: false, error: 'El comprobante ya está anulado', status: 400 };
      }
      
      // Revertir stock
      for (const detalle of comprobante.detalles) {
        await tx.alm_stock.upsert({
          where: {
            IdMiAlmacen_IdProducto: {
              IdMiAlmacen: comprobante.IdMiAlmacen,
              IdProducto: detalle.IdProducto
            }
          },
          update: {
            cantidad: { increment: detalle.cantidad }
          },
          create: {
            IdMiAlmacen: comprobante.IdMiAlmacen,
            IdProducto: detalle.IdProducto,
            cantidad: detalle.cantidad
          }
        });
      }
      
      // Anular comprobante
      const comprobanteAnulado = await tx.comprobante_venta.update({
        where: { IdComprobanteVenta: id },
        data: {
          estado: 'ANULADO',
          fechaAnulacion: new Date()
        },
        include: {
          cliente: { include: { persona: true } },
          detalles: { include: { producto: true } }
        }
      });
      
      return { success: true, data: comprobanteAnulado, message: 'Comprobante anulado exitosamente' };
    } catch (error) {
      return { success: false, error: 'Error al anular comprobante', status: 500 };
    }
  });
  
  return c.json(t, t.status || 200);
});

export default comprobantesVentaRouter;
