import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const prisma = new PrismaClient();
const app = new Hono();

// Schema para Caja/Banco
const cajaBancoSchema = z.object({
  idSede: z.string(),
  nombre: z.string(),
  tipo: z.enum(['CAJA', 'BANCO']),
  moneda: z.string().default('PEN'),
  numeroCuenta: z.string().optional(),
  codigoInterbancario: z.string().optional(),
  banco: z.string().optional(),
  saldoInicial: z.number().default(0),
  estado: z.boolean().default(true)
});

// Schema para operación de caja/banco
const operacionSchema = z.object({
  idCajaBanco: z.string(),
  tipoOperacion: z.enum(['INGRESO', 'EGRESO', 'TRANSFERENCIA']),
  monto: z.number().positive(),
  fecha: z.string(),
  idTercero: z.string().optional(),
  tipoTercero: z.enum(['CLIENTE', 'PROVEEDOR', 'TRABAJADOR', 'OTRO']).optional(),
  descripcion: z.string(),
  numeroDocumento: z.string().optional(),
  idCtasCobrar: z.string().optional(),
  idCtasPagar: z.string().optional()
});

// GET: Listar cajas y bancos
app.get('/', async (c) => {
  try {
    const { idSede, tipo, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idSede) where.idSede = idSede;
    if (tipo) where.tipo = tipo;
    if (estado !== undefined) where.estado = estado === 'true';
    
    const cajasBancos = await prisma.cajaBanco.findMany({
      where,
      include: {
        sede: true,
        operaciones: {
          take: 1,
          orderBy: { fecha: 'desc' },
          select: {
            saldo: true,
            fecha: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: cajasBancos });
  } catch (error) {
    console.error('Error al listar cajas/bancos:', error);
    return c.json({ success: false, message: 'Error al obtener cajas/bancos' }, 500);
  }
});

// GET: Obtener caja/banco por ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const cajaBanco = await prisma.cajaBanco.findUnique({
      where: { id, eliminado: false },
      include: {
        sede: true,
        operaciones: {
          orderBy: { fecha: 'desc' },
          take: 50
        }
      }
    });
    
    if (!cajaBanco) {
      return c.json({ success: false, message: 'Caja/Banco no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: cajaBanco });
  } catch (error) {
    console.error('Error al obtener caja/banco:', error);
    return c.json({ success: false, message: 'Error al obtener caja/banco' }, 500);
  }
});

// POST: Crear caja/banco
app.post('/', zValidator('json', cajaBancoSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const cajaBanco = await prisma.cajaBanco.create({
      data: {
        idSede: body.idSede,
        nombre: body.nombre,
        tipo: body.tipo,
        moneda: body.moneda,
        numeroCuenta: body.numeroCuenta,
        codigoInterbancario: body.codigoInterbancario,
        banco: body.banco,
        saldoInicial: body.saldoInicial,
        estado: body.estado
      },
      include: {
        sede: true
      }
    });
    
    // Registrar saldo inicial como operación
    if (body.saldoInicial !== 0) {
      await prisma.cbOperaciones.create({
        data: {
          idCajaBanco: cajaBanco.id,
          tipoOperacion: 'INGRESO',
          monto: Math.abs(body.saldoInicial),
          fecha: new Date(),
          descripcion: 'Saldo inicial',
          saldo: body.saldoInicial
        }
      });
    }
    
    return c.json({ 
      success: true, 
      message: 'Caja/Banco creado exitosamente',
      data: cajaBanco
    }, 201);
  } catch (error) {
    console.error('Error al crear caja/banco:', error);
    return c.json({ success: false, message: 'Error al crear caja/banco' }, 500);
  }
});

// PUT: Actualizar caja/banco
app.put('/:id', zValidator('json', cajaBancoSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    
    const cajaBanco = await prisma.cajaBanco.update({
      where: { id },
      data: body,
      include: {
        sede: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Caja/Banco actualizado exitosamente',
      data: cajaBanco
    });
  } catch (error) {
    console.error('Error al actualizar caja/banco:', error);
    return c.json({ success: false, message: 'Error al actualizar caja/banco' }, 500);
  }
});

// DELETE: Eliminar caja/banco (soft delete)
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const cajaBanco = await prisma.cajaBanco.findUnique({
      where: { id },
      include: { operaciones: true }
    });
    
    if (!cajaBanco) {
      return c.json({ success: false, message: 'Caja/Banco no encontrado' }, 404);
    }
    
    if (cajaBanco.operaciones.length > 0) {
      return c.json({ success: false, message: 'No se puede eliminar una caja/banco con operaciones registradas' }, 400);
    }
    
    await prisma.cajaBanco.update({
      where: { id },
      data: { eliminado: true }
    });
    
    return c.json({ success: true, message: 'Caja/Banco eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar caja/banco:', error);
    return c.json({ success: false, message: 'Error al eliminar caja/banco' }, 500);
  }
});

// POST: Registrar operación
app.post('/operaciones', zValidator('json', operacionSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener caja/banco
      const cajaBanco = await tx.cajaBanco.findUnique({
        where: { id: body.idCajaBanco, eliminado: false }
      });
      
      if (!cajaBanco) {
        throw new Error('Caja/Banco no encontrado');
      }
      
      if (!cajaBanco.estado) {
        throw new Error('La caja/banco está inactiva');
      }
      
      // Calcular nuevo saldo
      const ultimaOperacion = await tx.cbOperaciones.findFirst({
        where: { idCajaBanco: body.idCajaBanco },
        orderBy: { fecha: 'desc' }
      });
      
      const saldoAnterior = ultimaOperacion?.saldo || 0;
      let nuevoSaldo = saldoAnterior;
      
      if (body.tipoOperacion === 'INGRESO') {
        nuevoSaldo += body.monto;
      } else if (body.tipoOperacion === 'EGRESO') {
        if (body.monto > saldoAnterior && cajaBanco.tipo === 'CAJA') {
          throw new Error('Saldo insuficiente en caja');
        }
        nuevoSaldo -= body.monto;
      }
      
      // Registrar operación
      const operacion = await tx.cbOperaciones.create({
        data: {
          idCajaBanco: body.idCajaBanco,
          tipoOperacion: body.tipoOperacion,
          monto: body.monto,
          fecha: new Date(body.fecha),
          idTercero: body.idTercero,
          tipoTercero: body.tipoTercero,
          descripcion: body.descripcion,
          numeroDocumento: body.numeroDocumento,
          idCtasCobrar: body.idCtasCobrar,
          idCtasPagar: body.idCtasPagar,
          saldo: nuevoSaldo
        }
      });
      
      // Si es pago de cuenta por cobrar/pagar, actualizar estado
      if (body.idCtasCobrar && body.tipoOperacion === 'INGRESO') {
        await tx.ctasCobrarAmortizacion.create({
          data: {
            idCtasCobrar: body.idCtasCobrar,
            monto: body.monto,
            fechaPago: new Date(body.fecha),
            idCajaBanco: body.idCajaBanco,
            observaciones: `Pago registrado en ${cajaBanco.nombre}`
          }
        });
        
        const ctasCobrar = await tx.ctasCobrar.findUnique({
          where: { id: body.idCtasCobrar }
        });
        
        if (ctasCobrar) {
          const nuevoSaldoCobrar = ctasCobrar.saldo - body.monto;
          await tx.ctasCobrar.update({
            where: { id: body.idCtasCobrar },
            data: {
              saldo: nuevoSaldoCobrar,
              estado: nuevoSaldoCobrar === 0 ? 'CANCELADO' : 'PARCIAL'
            }
          });
        }
      }
      
      if (body.idCtasPagar && body.tipoOperacion === 'EGRESO') {
        await tx.ctasPagarAmortizacion.create({
          data: {
            idCtasPagar: body.idCtasPagar,
            monto: body.monto,
            fechaPago: new Date(body.fecha),
            idCajaBanco: body.idCajaBanco,
            observaciones: `Pago registrado en ${cajaBanco.nombre}`
          }
        });
        
        const ctasPagar = await tx.ctasPagar.findUnique({
          where: { id: body.idCtasPagar }
        });
        
        if (ctasPagar) {
          const nuevoSaldoPagar = ctasPagar.saldo - body.monto;
          await tx.ctasPagar.update({
            where: { id: body.idCtasPagar },
            data: {
              saldo: nuevoSaldoPagar,
              estado: nuevoSaldoPagar === 0 ? 'CANCELADO' : 'PARCIAL'
            }
          });
        }
      }
      
      return operacion;
    });
    
    return c.json({ 
      success: true, 
      message: 'Operación registrada exitosamente',
      data: resultado
    }, 201);
  } catch (error: any) {
    console.error('Error al registrar operación:', error);
    return c.json({ success: false, message: error.message || 'Error al registrar operación' }, 500);
  }
});

// GET: Listar operaciones de una caja/banco
app.get('/:id/operaciones', async (c) => {
  try {
    const id = c.req.param('id');
    const { fechaDesde, fechaHasta, tipoOperacion } = c.req.query();
    
    const where: any = { idCajaBanco: id };
    
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
    }
    
    if (tipoOperacion) {
      where.tipoOperacion = tipoOperacion;
    }
    
    const operaciones = await prisma.cbOperaciones.findMany({
      where,
      include: {
        cajaBanco: {
          select: {
            nombre: true,
            tipo: true,
            moneda: true
          }
        },
        ctasCobrar: {
          select: {
            serie: true,
            correlativo: true,
            total: true
          }
        },
        ctasPagar: {
          select: {
            serie: true,
            correlativo: true,
            total: true
          }
        }
      },
      orderBy: { fecha: 'desc' }
    });
    
    return c.json({ success: true, data: operaciones });
  } catch (error) {
    console.error('Error al listar operaciones:', error);
    return c.json({ success: false, message: 'Error al obtener operaciones' }, 500);
  }
});

// GET: Resumen de caja/banco
app.get('/:id/resumen', async (c) => {
  try {
    const id = c.req.param('id');
    
    const cajaBanco = await prisma.cajaBanco.findUnique({
      where: { id, eliminado: false },
      include: {
        operaciones: {
          select: {
            tipoOperacion: true,
            monto: true
          }
        }
      }
    });
    
    if (!cajaBanco) {
      return c.json({ success: false, message: 'Caja/Banco no encontrado' }, 404);
    }
    
    const ingresos = cajaBanco.operaciones
      .filter(op => op.tipoOperacion === 'INGRESO')
      .reduce((sum, op) => sum + op.monto, 0);
    
    const egresos = cajaBanco.operaciones
      .filter(op => op.tipoOperacion === 'EGRESO')
      .reduce((sum, op) => sum + op.monto, 0);
    
    const saldoActual = cajaBanco.saldoInicial + ingresos - egresos;
    
    return c.json({
      success: true,
      data: {
        id: cajaBanco.id,
        nombre: cajaBanco.nombre,
        tipo: cajaBanco.tipo,
        moneda: cajaBanco.moneda,
        saldoInicial: cajaBanco.saldoInicial,
        ingresos,
        egresos,
        saldoActual
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    return c.json({ success: false, message: 'Error al obtener resumen' }, 500);
  }
});

export default app;
