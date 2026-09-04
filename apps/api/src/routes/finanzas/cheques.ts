import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const prisma = new PrismaClient();
const app = new Hono();

// Schema para Cheque Emitido
const chequeEmitidoSchema = z.object({
  idSede: z.string(),
  idCajaBanco: z.string(),
  numeroCheque: z.string(),
  beneficiario: z.string(),
  monto: z.number().positive(),
  moneda: z.string().default('PEN'),
  fechaEmision: z.string(),
  fechaVencimiento: z.string(),
  estado: z.enum(['PENDIENTE', 'COBRADO', 'ANULADO', 'RECHAZADO']).default('PENDIENTE'),
  observaciones: z.string().optional()
});

// Schema para Cheque Recibido
const chequeRecibidoSchema = z.object({
  idSede: z.string(),
  idCliente: z.string(),
  numeroCheque: z.string(),
  banco: z.string(),
  monto: z.number().positive(),
  moneda: z.string().default('PEN'),
  fechaEmision: z.string(),
  fechaVencimiento: z.string(),
  estado: z.enum(['PENDIENTE', 'COBRADO', 'ANULADO', 'RECHAZADO']).default('PENDIENTE'),
  observaciones: z.string().optional()
});

// ==================== CHEQUES EMITIDOS ====================

// GET: Listar cheques emitidos
app.get('/emitidos', async (c) => {
  try {
    const { idSede, idCajaBanco, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idSede) where.idSede = idSede;
    if (idCajaBanco) where.idCajaBanco = idCajaBanco;
    if (estado) where.estado = estado;
    
    const cheques = await prisma.chequesEmitidos.findMany({
      where,
      include: {
        cajaBanco: {
          select: {
            nombre: true,
            tipo: true
          }
        },
        sede: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
    
    return c.json({ success: true, data: cheques });
  } catch (error) {
    console.error('Error al listar cheques emitidos:', error);
    return c.json({ success: false, message: 'Error al obtener cheques emitidos' }, 500);
  }
});

// POST: Crear cheque emitido
app.post('/emitidos', zValidator('json', chequeEmitidoSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const cheque = await prisma.chequesEmitidos.create({
      data: {
        idSede: body.idSede,
        idCajaBanco: body.idCajaBanco,
        numeroCheque: body.numeroCheque,
        beneficiario: body.beneficiario,
        monto: body.monto,
        moneda: body.moneda,
        fechaEmision: new Date(body.fechaEmision),
        fechaVencimiento: new Date(body.fechaVencimiento),
        estado: body.estado,
        observaciones: body.observaciones
      },
      include: {
        cajaBanco: true,
        sede: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cheque emitido creado exitosamente',
      data: cheque
    }, 201);
  } catch (error) {
    console.error('Error al crear cheque emitido:', error);
    return c.json({ success: false, message: 'Error al crear cheque emitido' }, 500);
  }
});

// PUT: Cobrar cheque emitido
app.put('/emitidos/:id/cobrar', async (c) => {
  try {
    const id = c.req.param('id');
    
    const cheque = await prisma.chequesEmitidos.update({
      where: { id },
      data: { 
        estado: 'COBRADO',
        fechaCobro: new Date()
      },
      include: {
        cajaBanco: true
      }
    });
    
    // Registrar egreso en caja/banco
    await prisma.cbOperaciones.create({
      data: {
        idCajaBanco: cheque.idCajaBanco,
        tipoOperacion: 'EGRESO',
        monto: cheque.monto,
        fecha: new Date(),
        descripcion: `Pago de cheque ${cheque.numeroCheque} a ${cheque.beneficiario}`,
        numeroDocumento: cheque.numeroCheque
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cheque cobrado exitosamente',
      data: cheque
    });
  } catch (error) {
    console.error('Error al cobrar cheque emitido:', error);
    return c.json({ success: false, message: 'Error al cobrar cheque' }, 500);
  }
});

// PUT: Anular cheque emitido
app.put('/emitidos/:id/anular', async (c) => {
  try {
    const id = c.req.param('id');
    
    const cheque = await prisma.chequesEmitidos.update({
      where: { id },
      data: { 
        estado: 'ANULADO',
        fechaAnulacion: new Date()
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cheque anulado exitosamente',
      data: cheque
    });
  } catch (error) {
    console.error('Error al anular cheque emitido:', error);
    return c.json({ success: false, message: 'Error al anular cheque' }, 500);
  }
});

// ==================== CHEQUES RECIBIDOS ====================

// GET: Listar cheques recibidos
app.get('/recibidos', async (c) => {
  try {
    const { idSede, idCliente, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idSede) where.idSede = idSede;
    if (idCliente) where.idCliente = idCliente;
    if (estado) where.estado = estado;
    
    const cheques = await prisma.chequesRecibidos.findMany({
      where,
      include: {
        cliente: {
          select: {
            persona: {
              select: {
                nombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true
              }
            }
          }
        },
        sede: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
    
    return c.json({ success: true, data: cheques });
  } catch (error) {
    console.error('Error al listar cheques recibidos:', error);
    return c.json({ success: false, message: 'Error al obtener cheques recibidos' }, 500);
  }
});

// POST: Crear cheque recibido
app.post('/recibidos', zValidator('json', chequeRecibidoSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const cheque = await prisma.chequesRecibidos.create({
      data: {
        idSede: body.idSede,
        idCliente: body.idCliente,
        numeroCheque: body.numeroCheque,
        banco: body.banco,
        monto: body.monto,
        moneda: body.moneda,
        fechaEmision: new Date(body.fechaEmision),
        fechaVencimiento: new Date(body.fechaVencimiento),
        estado: body.estado,
        observaciones: body.observaciones
      },
      include: {
        cliente: true,
        sede: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cheque recibido creado exitosamente',
      data: cheque
    }, 201);
  } catch (error) {
    console.error('Error al crear cheque recibido:', error);
    return c.json({ success: false, message: 'Error al crear cheque recibido' }, 500);
  }
});

// PUT: Cobrar cheque recibido
app.put('/recibidos/:id/cobrar', async (c) => {
  try {
    const id = c.req.param('id');
    const { idCajaBanco } = await c.req.json();
    
    if (!idCajaBanco) {
      return c.json({ success: false, message: 'ID de caja/banco requerido' }, 400);
    }
    
    const resultado = await prisma.$transaction(async (tx) => {
      const cheque = await tx.chequesRecibidos.update({
        where: { id },
        data: { 
          estado: 'COBRADO',
          fechaCobro: new Date()
        }
      });
      
      // Registrar ingreso en caja/banco
      await tx.cbOperaciones.create({
        data: {
          idCajaBanco,
          tipoOperacion: 'INGRESO',
          monto: cheque.monto,
          fecha: new Date(),
          descripcion: `Cobro de cheque ${cheque.numeroCheque} de ${cheque.banco}`,
          numeroDocumento: cheque.numeroCheque,
          idTercero: cheque.idCliente,
          tipoTercero: 'CLIENTE'
        }
      });
      
      return cheque;
    });
    
    return c.json({ 
      success: true, 
      message: 'Cheque cobrado exitosamente',
      data: resultado
    });
  } catch (error) {
    console.error('Error al cobrar cheque recibido:', error);
    return c.json({ success: false, message: 'Error al cobrar cheque' }, 500);
  }
});

// PUT: Rechazar cheque recibido
app.put('/recibidos/:id/rechazar', async (c) => {
  try {
    const id = c.req.param('id');
    const { motivo } = await c.req.json();
    
    const cheque = await prisma.chequesRecibidos.update({
      where: { id },
      data: { 
        estado: 'RECHAZADO',
        observaciones: motivo || 'Cheque rechazado por el banco'
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cheque rechazado registrado',
      data: cheque
    });
  } catch (error) {
    console.error('Error al rechazar cheque recibido:', error);
    return c.json({ success: false, message: 'Error al rechazar cheque' }, 500);
  }
});

// PUT: Anular cheque recibido
app.put('/recibidos/:id/anular', async (c) => {
  try {
    const id = c.req.param('id');
    
    const cheque = await prisma.chequesRecibidos.update({
      where: { id },
      data: { 
        estado: 'ANULADO',
        fechaAnulacion: new Date()
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Cheque anulado exitosamente',
      data: cheque
    });
  } catch (error) {
    console.error('Error al anular cheque recibido:', error);
    return c.json({ success: false, message: 'Error al anular cheque' }, 500);
  }
});

export default app;
