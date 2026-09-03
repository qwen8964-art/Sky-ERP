import { Hono } from 'hono';
import { prisma } from '../db';

export const ctasCobrarRouter = new Hono();

// GET /api/ctas-cobrar - Listar cuentas por cobrar
ctasCobrarRouter.get('/', async (c) => {
  try {
    const estado = c.req.query('estado');
    const clienteId = c.req.query('clienteId');
    const sedeId = c.req.query('sedeId');
    
    const where: any = {};
    
    if (estado && ['PENDIENTE', 'PARCIAL', 'CANCELADO', 'ANULADO'].includes(estado)) {
      where.estado = estado;
    }
    
    if (clienteId) {
      where.IdCliente = parseInt(clienteId);
    }
    
    if (sedeId) {
      where.IdMiSede = parseInt(sedeId);
    }
    
    const ctasCobrar = await prisma.ctas_cobrar.findMany({
      where,
      include: {
        cliente: {
          include: { persona: true }
        },
        comprobanteVenta: {
          include: {
            detalles: true
          }
        },
        amortizaciones: true,
        letrasRecibidas: true
      },
      orderBy: { fechaVencimiento: 'asc' },
      take: 100
    });
    
    return c.json({ success: true, data: ctasCobrar });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener cuentas por cobrar' }, 500);
  }
});

// GET /api/ctas-cobrar/:id - Obtener cuenta por cobrar por ID
ctasCobrarRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const ctaCobrar = await prisma.ctas_cobrar.findUnique({
      where: { IdCtaCobrar: id },
      include: {
        cliente: {
          include: { persona: true }
        },
        comprobanteVenta: {
          include: {
            detalles: true
          }
        },
        amortizaciones: {
          orderBy: { fechaPago: 'desc' }
        },
        letrasRecibidas: true
      }
    });
    
    if (!ctaCobrar) {
      return c.json({ success: false, error: 'Cuenta por cobrar no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: ctaCobrar });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener cuenta por cobrar' }, 500);
  }
});

// POST /api/ctas-cobrar/:id/amortizar - Registrar amortización/pago
ctasCobrarRouter.post('/:id/amortizar', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { monto, formaPago, observaciones, fechaPago } = body;
    
    if (!monto || monto <= 0) {
      return c.json({ 
        success: false, 
        error: 'El monto debe ser mayor a cero' 
      }, 400);
    }
    
    const ctaCobrar = await prisma.ctas_cobrar.findUnique({
      where: { IdCtaCobrar: id },
      include: { amortizaciones: true }
    });
    
    if (!ctaCobrar) {
      return c.json({ success: false, error: 'Cuenta por cobrar no encontrada' }, 404);
    }
    
    if (ctaCobrar.estado === 'CANCELADO' || ctaCobrar.estado === 'ANULADO') {
      return c.json({ 
        success: false, 
        error: 'La cuenta por cobrar ya está cancelada o anulada' 
      }, 400);
    }
    
    // Calcular saldo pendiente
    const totalAmortizado = ctaCobrar.amortizaciones.reduce((sum, a) => sum + a.monto, 0);
    const saldoPendiente = ctaCobrar.total - totalAmortizado;
    
    if (monto > saldoPendiente) {
      return c.json({ 
        success: false, 
        error: `El monto excede el saldo pendiente. Saldo: ${saldoPendiente}` 
      }, 400);
    }
    
    // Registrar amortización
    const amortizacion = await prisma.amortizacion_cta_cobrar.create({
      data: {
        IdCtaCobrar: id,
        monto,
        formaPago: formaPago || 'CONTADO',
        observaciones,
        fechaPago: fechaPago ? new Date(fechaPago) : new Date()
      }
    });
    
    // Actualizar estado de la cuenta por cobrar
    const nuevoSaldo = saldoPendiente - monto;
    let nuevoEstado = ctaCobrar.estado;
    
    if (nuevoSaldo <= 0) {
      nuevoEstado = 'CANCELADO';
    } else if (totalAmortizado + monto > 0) {
      nuevoEstado = 'PARCIAL';
    }
    
    const ctaCobrarActualizada = await prisma.ctas_cobrar.update({
      where: { IdCtaCobrar: id },
      data: { estado: nuevoEstado },
      include: {
        cliente: { include: { persona: true } },
        amortizaciones: {
          orderBy: { fechaPago: 'desc' }
        }
      }
    });
    
    return c.json({ 
      success: true, 
      data: { amortizacion, ctaCobrar: ctaCobrarActualizada }, 
      message: 'Amortización registrada exitosamente' 
    });
  } catch (error) {
    return c.json({ success: false, error: 'Error al registrar amortización' }, 500);
  }
});

// POST /api/ctas-cobrar/:id/anular - Anular cuenta por cobrar
ctasCobrarRouter.post('/:id/anular', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    const ctaCobrar = await prisma.ctas_cobrar.findUnique({
      where: { IdCtaCobrar: id }
    });
    
    if (!ctaCobrar) {
      return c.json({ success: false, error: 'Cuenta por cobrar no encontrada' }, 404);
    }
    
    if (ctaCobrar.estado === 'ANULADO') {
      return c.json({ 
        success: false, 
        error: 'La cuenta por cobrar ya está anulada' 
      }, 400);
    }
    
    const ctaCobrarAnulada = await prisma.ctas_cobrar.update({
      where: { IdCtaCobrar: id },
      data: { 
        estado: 'ANULADO',
        fechaAnulacion: new Date()
      },
      include: {
        cliente: { include: { persona: true } },
        amortizaciones: true
      }
    });
    
    return c.json({ 
      success: true, 
      data: ctaCobrarAnulada, 
      message: 'Cuenta por cobrar anulada exitosamente' 
    });
  } catch (error) {
    return c.json({ success: false, error: 'Error al anular cuenta por cobrar' }, 500);
  }
});

export default ctasCobrarRouter;
