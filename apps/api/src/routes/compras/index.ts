import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const prisma = new PrismaClient();
const app = new Hono();

// Schema para Comprobante de Compra
const comprobanteCompraSchema = z.object({
  idSede: z.string(),
  idProveedor: z.string(),
  tipoComprobante: z.enum(['FACTURA', 'BOLETA', 'NC', 'ND']),
  serie: z.string(),
  correlativo: z.string().optional(),
  fechaEmision: z.string(),
  fechaVencimiento: z.string().optional(),
  moneda: z.string().default('PEN'),
  tipoCambio: z.number().default(1),
  subTotal: z.number(),
  igv: z.number().default(0.18),
  montoIgv: z.number(),
  total: z.number(),
  percepcion: z.number().default(0),
  retencion: z.number().default(0),
  observaciones: z.string().optional(),
  items: z.array(z.object({
    idProducto: z.string(),
    cantidad: z.number(),
    precioUnitario: z.number(),
    descuento: z.number().default(0),
    impuesto: z.boolean().default(true),
    observacion: z.string().optional()
  }))
});

// GET: Listar comprobantes de compra
app.get('/', async (c) => {
  try {
    const { idSede, idProveedor, fechaDesde, fechaHasta, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (idSede) where.idSede = idSede;
    if (idProveedor) where.idProveedor = idProveedor;
    if (estado) where.estado = estado;
    
    if (fechaDesde || fechaHasta) {
      where.fechaEmision = {};
      if (fechaDesde) where.fechaEmision.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaEmision.lte = new Date(fechaHasta);
    }
    
    const comprobantes = await prisma.comprobanteCompra.findMany({
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
        items: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return c.json({ success: true, data: comprobantes });
  } catch (error) {
    console.error('Error al listar comprobantes de compra:', error);
    return c.json({ success: false, message: 'Error al obtener comprobantes de compra' }, 500);
  }
});

// GET: Obtener comprobante por ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const comprobante = await prisma.comprobanteCompra.findUnique({
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
        items: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true,
                unidadMedida: true
              }
            }
          }
        }
      }
    });
    
    if (!comprobante) {
      return c.json({ success: false, message: 'Comprobante no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: comprobante });
  } catch (error) {
    console.error('Error al obtener comprobante de compra:', error);
    return c.json({ success: false, message: 'Error al obtener comprobante' }, 500);
  }
});

// POST: Crear comprobante de compra
app.post('/', zValidator('json', comprobanteCompraSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Iniciar transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener correlativo si no se proporciona
      let correlativo = body.correlativo;
      if (!correlativo) {
        const ultimoDoc = await tx.comprobanteCompra.findFirst({
          where: {
            idSede: body.idSede,
            tipoComprobante: body.tipoComprobante,
            serie: body.serie,
            eliminado: false
          },
          orderBy: { correlativo: 'desc' }
        });
        
        const ultimoCorrelativo = ultimoDoc ? parseInt(ultimoDoc.correlativo) : 0;
        correlativo = String(ultimoCorrelativo + 1).padStart(8, '0');
      }
      
      // Calcular totales
      const igvPorcentaje = body.igv / 100;
      let subTotalCalculado = 0;
      let montoIgvCalculado = 0;
      
      body.items.forEach(item => {
        const valorVenta = item.precioUnitario / (1 + (item.impuesto ? igvPorcentaje : 0));
        const subtotalLinea = valorVenta * item.cantidad - item.descuento;
        subTotalCalculado += subtotalLinea;
        
        if (item.impuesto) {
          montoIgvCalculado += subtotalLinea * igvPorcentaje;
        }
      });
      
      const totalCalculado = subTotalCalculado + montoIgvCalculado + body.percepcion - body.retencion;
      
      // Crear comprobante de compra
      const comprobante = await tx.comprobanteCompra.create({
        data: {
          idSede: body.idSede,
          idProveedor: body.idProveedor,
          tipoComprobante: body.tipoComprobante,
          serie: body.serie,
          correlativo,
          fechaEmision: new Date(body.fechaEmision),
          fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : null,
          moneda: body.moneda,
          tipoCambio: body.tipoCambio,
          subTotal: body.subTotal,
          igv: body.igv,
          montoIgv: body.montoIgv,
          total: body.total,
          percepcion: body.percepcion,
          retencion: body.retencion,
          observaciones: body.observaciones,
          estado: 'BORRADOR',
          usuarioCreacion: 'system' // TODO: Reemplazar con usuario actual
        }
      });
      
      // Crear items
      for (const item of body.items) {
        await tx.comprobanteCompraDetalle.create({
          data: {
            idComprobanteCompra: comprobante.id,
            idProducto: item.idProducto,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            impuesto: item.impuesto,
            observacion: item.observacion
          }
        });
      }
      
      return comprobante;
    });
    
    return c.json({ 
      success: true, 
      message: 'Comprobante de compra creado exitosamente',
      data: resultado
    }, 201);
  } catch (error) {
    console.error('Error al crear comprobante de compra:', error);
    return c.json({ success: false, message: 'Error al crear comprobante de compra' }, 500);
  }
});

// PUT: Aprobar comprobante de compra (genera guía de ingreso y actualiza stock)
app.put('/:id/aprobar', async (c) => {
  try {
    const id = c.req.param('id');
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar que el comprobante exista y esté en borrador
      const comprobante = await tx.comprobanteCompra.findUnique({
        where: { id, eliminado: false },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          sede: true
        }
      });
      
      if (!comprobante) {
        throw new Error('Comprobante no encontrado');
      }
      
      if (comprobante.estado !== 'BORRADOR') {
        throw new Error('El comprobante ya fue aprobado o anulado');
      }
      
      // Actualizar estado del comprobante
      const comprobanteActualizado = await tx.comprobanteCompra.update({
        where: { id },
        data: { 
          estado: 'APROBADO',
          fechaAprobacion: new Date()
        }
      });
      
      // Generar Guía de Ingreso automáticamente
      const ultimaGuia = await tx.almGuia.findFirst({
        where: {
          idSede: comprobante.idSede,
          tipoMovimiento: 'INGRESO',
          motivo: 'COMPRA',
          eliminado: false
        },
        orderBy: { correlativo: 'desc' }
      });
      
      const ultimoCorrelativo = ultimaGuia ? parseInt(ultimaGuia.correlativo) : 0;
      const nuevoCorrelativo = String(ultimoCorrelativo + 1).padStart(8, '0');
      
      const guiaIngreso = await tx.almGuia.create({
        data: {
          idSede: comprobante.idSede,
          idAlmacen: comprobante.sede.almacenPrincipal || '', // TODO: Definir almacén por defecto
          tipoMovimiento: 'INGRESO',
          motivo: 'COMPRA',
          serie: 'GI',
          correlativo: nuevoCorrelativo,
          fecha: comprobante.fechaEmision,
          idTercero: comprobante.idProveedor,
          tipoTercero: 'PROVEEDOR',
          idDocumentoReferencia: comprobante.id,
          tipoDocumentoReferencia: 'COMPRAS',
          observaciones: `Guía generada desde ${comprobante.tipoComprobante} ${comprobante.serie}-${comprobante.correlativo}`,
          estado: 'APROBADO',
          usuarioCreacion: 'system'
        }
      });
      
      // Crear items de la guía y actualizar stock
      for (const item of comprobante.items) {
        // Crear item de guía
        await tx.almGuiaDetalle.create({
          data: {
            idGuia: guiaIngreso.id,
            idProducto: item.idProducto,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            observacion: item.observacion
          }
        });
        
        // Actualizar stock
        const stockActual = await tx.almStock.findUnique({
          where: {
            idProducto_idAlmacen: {
              idProducto: item.idProducto,
              idAlmacen: guiaIngreso.idAlmacen
            }
          }
        });
        
        if (stockActual) {
          await tx.almStock.update({
            where: {
              idProducto_idAlmacen: {
                idProducto: item.idProducto,
                idAlmacen: guiaIngreso.idAlmacen
              }
            },
            data: {
              cantidad: stockActual.cantidad + item.cantidad,
              costoPromedio: ((stockActual.cantidad * stockActual.costoPromedio) + (item.cantidad * item.precioUnitario)) / (stockActual.cantidad + item.cantidad)
            }
          });
        } else {
          await tx.almStock.create({
            data: {
              idProducto: item.idProducto,
              idAlmacen: guiaIngreso.idAlmacen,
              cantidad: item.cantidad,
              costoPromedio: item.precioUnitario
            }
          });
        }
        
        // Registrar en Kardex
        await tx.almKardex.create({
          data: {
            idProducto: item.idProducto,
            idAlmacen: guiaIngreso.idAlmacen,
            fecha: new Date(),
            tipoMovimiento: 'INGRESO',
            origen: 'COMPRA',
            idDocumento: guiaIngreso.id,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            saldoCantidad: (stockActual?.cantidad || 0) + item.cantidad,
            saldoValor: ((stockActual?.cantidad || 0) * (stockActual?.costoPromedio || 0)) + (item.cantidad * item.precioUnitario)
          }
        });
      }
      
      // Generar Cuentas por Pagar automáticamente
      await tx.ctasPagar.create({
        data: {
          idSede: comprobante.idSede,
          idProveedor: comprobante.idProveedor,
          idComprobanteCompra: comprobante.id,
          tipoDocumento: comprobante.tipoComprobante,
          serie: comprobante.serie,
          correlativo: comprobante.correlativo,
          fechaEmision: comprobante.fechaEmision,
          fechaVencimiento: comprobante.fechaVencimiento || comprobante.fechaEmision,
          moneda: comprobante.moneda,
          tipoCambio: comprobante.tipoCambio,
          subtotal: comprobante.subTotal,
          igv: comprobante.montoIgv,
          total: comprobante.total,
          saldo: comprobante.total,
          estado: 'PENDIENTE',
          observaciones: `Generado desde ${comprobante.tipoComprobante} ${comprobante.serie}-${comprobante.correlativo}`
        }
      });
      
      return { comprobante: comprobanteActualizado, guia: guiaIngreso };
    });
    
    return c.json({ 
      success: true, 
      message: 'Comprobante aprobado, guía de ingreso generada y stock actualizado',
      data: resultado
    });
  } catch (error: any) {
    console.error('Error al aprobar comprobante de compra:', error);
    return c.json({ success: false, message: error.message || 'Error al aprobar comprobante' }, 500);
  }
});

// PUT: Anular comprobante de compra
app.put('/:id/anular', async (c) => {
  try {
    const id = c.req.param('id');
    
    const resultado = await prisma.$transaction(async (tx) => {
      const comprobante = await tx.comprobanteCompra.findUnique({
        where: { id, eliminado: false },
        include: { items: true }
      });
      
      if (!comprobante) {
        throw new Error('Comprobante no encontrado');
      }
      
      if (comprobante.estado === 'ANULADO') {
        throw new Error('El comprobante ya está anulado');
      }
      
      // Actualizar estado
      const comprobanteAnulado = await tx.comprobanteCompra.update({
        where: { id },
        data: { 
          estado: 'ANULADO',
          fechaAnulacion: new Date()
        }
      });
      
      // Si estaba aprobado, revertir stock y kardex
      if (comprobante.estado === 'APROBADO') {
        // Buscar guía de ingreso asociada
        const guia = await tx.almGuia.findFirst({
          where: {
            idDocumentoReferencia: id,
            tipoDocumentoReferencia: 'COMPRAS',
            eliminado: false
          },
          include: { detalles: true }
        });
        
        if (guia) {
          // Revertir stock y registrar salida en kardex
          for (const item of comprobante.items) {
            const stockActual = await tx.almStock.findUnique({
              where: {
                idProducto_idAlmacen: {
                  idProducto: item.idProducto,
                  idAlmacen: guia.idAlmacen
                }
              }
            });
            
            if (stockActual) {
              await tx.almStock.update({
                where: {
                  idProducto_idAlmacen: {
                    idProducto: item.idProducto,
                    idAlmacen: guia.idAlmacen
                  }
                },
                data: {
                  cantidad: Math.max(0, stockActual.cantidad - item.cantidad)
                }
              });
              
              // Registrar salida en kardex
              await tx.almKardex.create({
                data: {
                  idProducto: item.idProducto,
                  idAlmacen: guia.idAlmacen,
                  fecha: new Date(),
                  tipoMovimiento: 'SALIDA',
                  origen: 'ANULACION_COMPRA',
                  idDocumento: guia.id,
                  cantidad: -item.cantidad,
                  precioUnitario: item.precioUnitario,
                  saldoCantidad: stockActual.cantidad - item.cantidad,
                  saldoValor: (stockActual.cantidad * stockActual.costoPromedio) - (item.cantidad * item.precioUnitario)
                }
              });
            }
          }
          
          // Anular guía
          await tx.almGuia.update({
            where: { id: guia.id },
            data: { estado: 'ANULADO' }
          });
        }
        
        // Anular cuenta por pagar si existe
        await tx.ctasPagar.updateMany({
          where: { idComprobanteCompra: id },
          data: { estado: 'ANULADO' }
        });
      }
      
      return comprobanteAnulado;
    });
    
    return c.json({ 
      success: true, 
      message: 'Comprobante de compra anulado exitosamente',
      data: resultado
    });
  } catch (error: any) {
    console.error('Error al anular comprobante de compra:', error);
    return c.json({ success: false, message: error.message || 'Error al anular comprobante' }, 500);
  }
});

// DELETE: Eliminar comprobante (soft delete)
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const comprobante = await prisma.comprobanteCompra.findUnique({
      where: { id }
    });
    
    if (!comprobante) {
      return c.json({ success: false, message: 'Comprobante no encontrado' }, 404);
    }
    
    if (comprobante.estado === 'APROBADO') {
      return c.json({ success: false, message: 'No se puede eliminar un comprobante aprobado. Debe anularlo primero.' }, 400);
    }
    
    await prisma.comprobanteCompra.update({
      where: { id },
      data: { eliminado: true }
    });
    
    return c.json({ success: true, message: 'Comprobante eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar comprobante de compra:', error);
    return c.json({ success: false, message: 'Error al eliminar comprobante' }, 500);
  }
});

export default app;
