import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

// ==================== PLAN DE CUENTAS ====================

// GET: Listar plan de cuentas
app.get('/plan-cuentas', async (c) => {
  try {
    const { nivel, buscar, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (nivel) where.nivel = parseInt(nivel);
    if (estado !== undefined) where.estado = estado === 'true';
    if (buscar) {
      where.OR = [
        { codigo: { contains: buscar, mode: 'insensitive' } },
        { nombre: { contains: buscar, mode: 'insensitive' } }
      ];
    }
    
    const cuentas = await prisma.ctPlanCuenta.findMany({
      where,
      include: {
        cuentaPadre: {
          select: {
            codigo: true,
            nombre: true
          }
        },
        cuentasHijas: {
          where: { eliminado: false },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            nivel: true
          }
        }
      },
      orderBy: { codigo: 'asc' }
    });
    
    return c.json({ success: true, data: cuentas });
  } catch (error) {
    console.error('Error al listar plan de cuentas:', error);
    return c.json({ success: false, message: 'Error al obtener plan de cuentas' }, 500);
  }
});

// POST: Crear cuenta contable
app.post('/plan-cuentas', async (c) => {
  try {
    const body = await c.req.json();
    
    const cuenta = await prisma.ctPlanCuenta.create({
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        nivel: body.nivel,
        idCuentaPadre: body.idCuentaPadre,
        tipo: body.tipo || 'MOVIMIENTO',
        estado: body.estado ?? true,
        observaciones: body.observaciones
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cuenta creada exitosamente',
      data: cuenta
    }, 201);
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    return c.json({ success: false, message: 'Error al crear cuenta' }, 500);
  }
});

// ==================== LIBRO DIARIO ====================

// GET: Listar asientos del libro diario
app.get('/libro-diario', async (c) => {
  try {
    const { fechaDesde, fechaHasta, idSede } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idSede) where.idSede = idSede;
    
    if (fechaDesde || fechaHasta) {
      where.fechaAsiento = {};
      if (fechaDesde) where.fechaAsiento.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaAsiento.lte = new Date(fechaHasta);
    }
    
    const asientos = await prisma.ctLibroDiario.findMany({
      where,
      include: {
        sede: true,
        detalles: {
          include: {
            cuenta: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { fechaAsiento: 'desc' }
    });
    
    return c.json({ success: true, data: asientos });
  } catch (error) {
    console.error('Error al listar libro diario:', error);
    return c.json({ success: false, message: 'Error al obtener libro diario' }, 500);
  }
});

// POST: Crear asiento contable
app.post('/libro-diario', async (c) => {
  try {
    const body = await c.req.json();
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Validar que la suma de debitos sea igual a créditos
      const totalDebe = body.detalles
        .filter((d: any) => d.tipo === 'DEBE')
        .reduce((sum: number, d: any) => sum + d.monto, 0);
      
      const totalHaber = body.detalles
        .filter((d: any) => d.tipo === 'HABER')
        .reduce((sum: number, d: any) => sum + d.monto, 0);
      
      if (Math.abs(totalDebe - totalHaber) > 0.01) {
        throw new Error('El asiento no está cuadrado. Debe = ' + totalDebe + ', Haber = ' + totalHaber);
      }
      
      // Crear asiento
      const asiento = await tx.ctLibroDiario.create({
        data: {
          idSede: body.idSede,
          fechaAsiento: new Date(body.fechaAsiento),
          glosa: body.glosa,
          tipoAsiento: body.tipoAsiento || 'MANUAL',
          numeroComprobante: body.numeroComprobante,
          usuarioCreacion: body.usuarioCreacion || 'system'
        }
      });
      
      // Crear detalles
      for (const detalle of body.detalles) {
        await tx.ctLibroDiarioDetalle.create({
          data: {
            idLibroDiario: asiento.id,
            idCuenta: detalle.idCuenta,
            tipo: detalle.tipo,
            monto: detalle.monto,
            glosa: detalle.glosa
          }
        });
      }
      
      return asiento;
    });
    
    return c.json({ 
      success: true, 
      message: 'Asiento creado exitosamente',
      data: resultado
    }, 201);
  } catch (error: any) {
    console.error('Error al crear asiento:', error);
    return c.json({ success: false, message: error.message || 'Error al crear asiento' }, 500);
  }
});

// ==================== LIBRO MAYOR ====================

// GET: Consultar libro mayor por cuenta
app.get('/libro-mayor', async (c) => {
  try {
    const { idCuenta, fechaDesde, fechaHasta, idSede } = c.req.query();
    
    if (!idCuenta) {
      return c.json({ success: false, message: 'ID de cuenta requerido' }, 400);
    }
    
    const where: any = { 
      eliminado: false,
      detalles: {
        some: {
          idCuenta
        }
      }
    };
    
    if (idSede) where.idSede = idSede;
    
    if (fechaDesde || fechaHasta) {
      where.fechaAsiento = {};
      if (fechaDesde) where.fechaAsiento.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaAsiento.lte = new Date(fechaHasta);
    }
    
    const asientos = await prisma.ctLibroDiario.findMany({
      where,
      include: {
        detalles: {
          where: { idCuenta },
          include: {
            cuenta: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { fechaAsiento: 'asc' }
    });
    
    // Calcular saldos
    let saldoDeudor = 0;
    let saldoAcreedor = 0;
    
    const movimientos = asientos.map(asiento => {
      const detalle = asiento.detalles.find(d => d.idCuenta === idCuenta);
      if (detalle?.tipo === 'DEBE') {
        saldoDeudor += detalle.monto;
      } else if (detalle?.tipo === 'HABER') {
        saldoAcreedor += detalle.monto;
      }
      
      return {
        fecha: asiento.fechaAsiento,
        glosa: asiento.glosa,
        debe: detalle?.tipo === 'DEBE' ? detalle.monto : 0,
        haber: detalle?.tipo === 'HABER' ? detalle.monto : 0,
        saldo: saldoDeudor - saldoAcreedor
      };
    });
    
    return c.json({
      success: true,
      data: {
        movimientos,
        saldoFinal: saldoDeudor - saldoAcreedor,
        totalDebe: saldoDeudor,
        totalHaber: saldoAcreedor
      }
    });
  } catch (error) {
    console.error('Error al consultar libro mayor:', error);
    return c.json({ success: false, message: 'Error al obtener libro mayor' }, 500);
  }
});

export default app;
