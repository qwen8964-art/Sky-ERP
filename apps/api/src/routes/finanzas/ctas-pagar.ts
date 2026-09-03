import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const prisma = new PrismaClient();
const app = new Hono();

// Schema para Cuentas por Pagar
const ctasPagarSchema = z.object({
  idSede: z.string(),
  idProveedor: z.string(),
  idComprobanteCompra: z.string().optional(),
  tipoDocumento: z.enum(['FACTURA', 'BOLETA', 'NC', 'ND', 'RECIBO', 'OTRO']),
  serie: z.string(),
  correlativo: z.string(),
  fechaEmision: z.string(),
  fechaVencimiento: z.string(),
  moneda: z.string().default('PEN'),
  tipoCambio: z.number().default(1),
  subtotal: z.number(),
  igv: z.number(),
  total: z.number(),
  saldo: z.number(),
  observaciones: z.string().optional()
});

// Schema para amortización
const amortizacionSchema = z.object({
  monto: z.number().positive(),
  fechaPago: z.string(),
  idCajaBanco: z.string().optional(),
  numeroDocumento: z.string().optional(),
  observaciones: z.string().optional()
});

// GET: Listar cuentas por pagar
app.get('/', async (c) => {
  try {
    const { idSede, idProveedor, estado, fechaDesde, fechaHasta, vencida } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idSede) where.idSede = idSede;
    if (idProveedor) where.idProveedor = idProveedor;
    if (estado) where.estado = estado;
    
    if (fechaDesde || fechaHasta) {
      where.fechaEmision = {};
      if (fechaDesde) where.fechaEmision.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaEmision.lte = new Date(fechaHasta);
    }
    
    // Filtrar por vencidas
    if (vencida === 'true') {
      where.fechaVencimiento = { lt: new Date() };
      where.estado = { not: 'CANCELADO' };
    }
    
    const ctasPagar = await prisma.ctasPagar.findMany({
      where,
      include: {
        proveedor: {
          select: {
            persona: {
              select: {
                nombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                documentoIdentidad: true
              }
            }
          }
        },
        sede: true,
        comprobanteCompra: {
          select: {
            tipoComprobante: true,
            serie: true,
            correlativo: true
          }
        },
        amortizaciones: {
          orderBy: { fechaPago: 'desc' }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    });
    
    return c.json({ success: true, data: ctasPagar });
  } catch (error) {
    console.error('Error al listar cuentas por pagar:', error);
    return c.json({ success: false, message: 'Error al obtener cuentas por pagar' }, 500);
  }
});

// GET: Obtener cuenta por pagar por ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const ctasPagar = await prisma.ctasPagar.findUnique({
      where: { id, eliminado: false },
      include: {
        proveedor: {
          select: {
            persona: {
              select: {
                nombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                documentoIdentidad: true,
                direccion: true,
                telefono: true,
                email: true
              }
            }
          }
        },
        sede: true,
        comprobanteCompra: true,
        amortizaciones: {
          orderBy: { fechaPago: 'desc' }
        }
      }
    });
    
    if (!ctasPagar) {
      return c.json({ success: false, message: 'Cuenta por pagar no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: ctasPagar });
  } catch (error) {
    console.error('Error al obtener cuenta por pagar:', error);
    return c.json({ success: false, message: 'Error al obtener cuenta por pagar' }, 500);
  }
});

// POST: Crear cuenta por pagar manual
app.post('/', zValidator('json', ctasPagarSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const ctasPagar = await prisma.ctasPagar.create({
      data: {
        idSede: body.idSede,
        idProveedor: body.idProveedor,
        idComprobanteCompra: body.idComprobanteCompra,
        tipoDocumento: body.tipoDocumento,
        serie: body.serie,
        correlativo: body.correlativo,
        fechaEmision: new Date(body.fechaEmision),
        fechaVencimiento: new Date(body.fechaVencimiento),
        moneda: body.moneda,
        tipoCambio: body.tipoCambio,
        subtotal: body.subtotal,
        igv: body.igv,
        total: body.total,
        saldo: body.saldo,
        estado: body.saldo === body.total ? 'PENDIENTE' : 'PARCIAL',
        observaciones: body.observaciones
      },
      include: {
        proveedor: true,
        sede: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cuenta por pagar creada exitosamente',
      data: ctasPagar
    }, 201);
  } catch (error) {
    console.error('Error al crear cuenta por pagar:', error);
    return c.json({ success: false, message: 'Error al crear cuenta por pagar' }, 500);
  }
});

// POST: Registrar amortización/pago
app.post('/:id/amortizar', zValidator('json', amortizacionSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que la cuenta por pagar exista
      const ctasPagar = await tx.ctasPagar.findUnique({
        where: { id, eliminado: false }
      });
      
      if (!ctasPagar) {
        throw new Error('Cuenta por pagar no encontrada');
      }
      
      if (ctasPagar.estado === 'CANCELADO') {
        throw new Error('La cuenta por pagar ya está cancelada');
      }
      
      if (body.monto > ctasPagar.saldo) {
        throw new Error('El monto de pago excede el saldo pendiente');
      }
      
      // Registrar amortización
      const amortizacion = await tx.ctasPagarAmortizacion.create({
        data: {
          idCtasPagar: id,
          monto: body.monto,
          fechaPago: new Date(body.fechaPago),
          idCajaBanco: body.idCajaBanco,
          numeroDocumento: body.numeroDocumento,
          observaciones: body.observaciones
        }
      });
      
      // Actualizar saldo
      const nuevoSaldo = ctasPagar.saldo - body.monto;
      let nuevoEstado = ctasPagar.estado;
      
      if (nuevoSaldo === 0) {
        nuevoEstado = 'CANCELADO';
      } else if (nuevoSaldo < ctasPagar.total) {
        nuevoEstado = 'PARCIAL';
      }
      
      const ctasPagarActualizada = await tx.ctasPagar.update({
        where: { id },
        data: {
          saldo: nuevoSaldo,
          estado: nuevoEstado
        }
      });
      
      return { amortizacion, ctasPagar: ctasPagarActualizada };
    });
    
    return c.json({ 
      success: true, 
      message: 'Pago registrado exitosamente',
      data: resultado
    });
  } catch (error: any) {
    console.error('Error al registrar pago:', error);
    return c.json({ success: false, message: error.message || 'Error al registrar pago' }, 500);
  }
});

// PUT: Canjear con nota de crédito
app.put('/:id/canjear', async (c) => {
  try {
    const id = c.req.param('id');
    const { idNotaCredito } = await c.req.json();
    
    if (!idNotaCredito) {
      return c.json({ success: false, message: 'ID de nota de crédito requerido' }, 400);
    }
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener cuenta por pagar
      const ctasPagar = await tx.ctasPagar.findUnique({
        where: { id, eliminado: false }
      });
      
      if (!ctasPagar) {
        throw new Error('Cuenta por pagar no encontrada');
      }
      
      // Obtener nota de crédito
      const notaCredito = await tx.comprobanteCompra.findUnique({
        where: { id: idNotaCredito, eliminado: false }
      });
      
      if (!notaCredito || notaCredito.tipoComprobante !== 'NC') {
        throw new Error('Nota de crédito no válida');
      }
      
      if (notaCredito.total > ctasPagar.saldo) {
        throw new Error('El monto de la NC excede el saldo pendiente');
      }
      
      // Registrar amortización con NC
      await tx.ctasPagarAmortizacion.create({
        data: {
          idCtasPagar: id,
          monto: notaCredito.total,
          fechaPago: new Date(),
          numeroDocumento: `${notaCredito.serie}-${notaCredito.correlativo}`,
          observaciones: `Canje con NC ${notaCredito.serie}-${notaCredito.correlativo}`
        }
      });
      
      // Actualizar saldo
      const nuevoSaldo = ctasPagar.saldo - notaCredito.total;
      
      await tx.ctasPagar.update({
        where: { id },
        data: {
          saldo: nuevoSaldo,
          estado: nuevoSaldo === 0 ? 'CANCELADO' : 'PARCIAL'
        }
      });
      
      // Marcar NC como canjeada
      await tx.comprobanteCompra.update({
        where: { id: idNotaCredito },
        data: {
          estado: 'CANJEADO'
        }
      });
      
      return { ctasPagar: await tx.ctasPagar.findUnique({ where: { id } }) };
    });
    
    return c.json({ 
      success: true, 
      message: 'Nota de crédito canjeada exitosamente',
      data: resultado
    });
  } catch (error: any) {
    console.error('Error al canjar nota de crédito:', error);
    return c.json({ success: false, message: error.message || 'Error al canjar NC' }, 500);
  }
});

// PUT: Anular cuenta por pagar
app.put('/:id/anular', async (c) => {
  try {
    const id = c.req.param('id');
    
    const resultado = await prisma.$transaction(async (tx) => {
      const ctasPagar = await tx.ctasPagar.findUnique({
        where: { id, eliminado: false },
        include: { amortizaciones: true }
      });
      
      if (!ctasPagar) {
        throw new Error('Cuenta por pagar no encontrada');
      }
      
      if (ctasPagar.estado === 'ANULADO') {
        throw new Error('La cuenta por pagar ya está anulada');
      }
      
      if (ctasPagar.amortizaciones.length > 0) {
        throw new Error('No se puede anular una cuenta por pagar con pagos registrados');
      }
      
      const ctasPagarAnulada = await tx.ctasPagar.update({
        where: { id },
        data: { 
          estado: 'ANULADO',
          fechaAnulacion: new Date()
        }
      });
      
      // Si está vinculada a un comprobante, anularlo también
      if (ctasPagar.idComprobanteCompra) {
        await tx.comprobanteCompra.updateMany({
          where: { id: ctasPagar.idComprobanteCompra },
          data: { estado: 'ANULADO' }
        });
      }
      
      return ctasPagarAnulada;
    });
    
    return c.json({ 
      success: true, 
      message: 'Cuenta por pagar anulada exitosamente',
      data: resultado
    });
  } catch (error: any) {
    console.error('Error al anular cuenta por pagar:', error);
    return c.json({ success: false, message: error.message || 'Error al anular cuenta por pagar' }, 500);
  }
});

// DELETE: Eliminar cuenta por pagar (soft delete)
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const ctasPagar = await prisma.ctasPagar.findUnique({
      where: { id },
      include: { amortizaciones: true }
    });
    
    if (!ctasPagar) {
      return c.json({ success: false, message: 'Cuenta por pagar no encontrada' }, 404);
    }
    
    if (ctasPagar.amortizaciones.length > 0) {
      return c.json({ success: false, message: 'No se puede eliminar una cuenta por pagar con pagos registrados' }, 400);
    }
    
    await prisma.ctasPagar.update({
      where: { id },
      data: { eliminado: true }
    });
    
    return c.json({ success: true, message: 'Cuenta por pagar eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cuenta por pagar:', error);
    return c.json({ success: false, message: 'Error al eliminar cuenta por pagar' }, 500);
  }
});

// GET: Resumen de cuentas por pagar
app.get('/resumen/estadisticas', async (c) => {
  try {
    const { idSede } = c.req.query();
    
    const where: any = { eliminado: false, estado: { notIn: ['ANULADO', 'CANCELADO'] } };
    if (idSede) where.idSede = idSede;
    
    const [totalPendiente, totalVencido, porVencer] = await Promise.all([
      prisma.ctasPagar.aggregate({
        where: { ...where, estado: 'PENDIENTE' },
        _sum: { saldo: true }
      }),
      prisma.ctasPagar.aggregate({
        where: { 
          ...where, 
          fechaVencimiento: { lt: new Date() },
          estado: { notIn: ['CANCELADO', 'ANULADO'] }
        },
        _sum: { saldo: true }
      }),
      prisma.ctasPagar.aggregate({
        where: { 
          ...where,
          fechaVencimiento: { gte: new Date() },
          estado: { notIn: ['CANCELADO', 'ANULADO'] }
        },
        _sum: { saldo: true }
      })
    ]);
    
    return c.json({
      success: true,
      data: {
        totalPendiente: totalPendiente._sum.saldo || 0,
        totalVencido: totalVencido._sum.saldo || 0,
        porVencer: porVencer._sum.saldo || 0
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    return c.json({ success: false, message: 'Error al obtener resumen' }, 500);
  }
});

export default app;
