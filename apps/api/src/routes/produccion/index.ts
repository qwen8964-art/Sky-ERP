import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const prisma = new PrismaClient();
const app = new Hono();

// Schema para Fórmula de Producción
const formulaSchema = z.object({
  nombre: z.string(),
  codigo: z.string(),
  idProductoResultado: z.string(),
  cantidadResultado: z.number().positive(),
  unidadMedida: z.string(),
  costoManoObra: z.number().default(0),
  costoIndirecto: z.number().default(0),
  observaciones: z.string().optional(),
  materiales: z.array(z.object({
    idProducto: z.string(),
    cantidad: z.number().positive(),
    unidadMedida: z.string(),
    merma: z.number().default(0)
  }))
});

// Schema para Orden de Producción
const ordenProduccionSchema = z.object({
  idFormula: z.string(),
  cantidadProducir: z.number().positive(),
  fechaProgramada: z.string(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  estado: z.enum(['PROGRAMADA', 'EN_PROCESO', 'FINALIZADA', 'ANULADA']).default('PROGRAMADA'),
  observaciones: z.string().optional()
});

// Schema para Parte de Producción
const parteProduccionSchema = z.object({
  idOrdenProduccion: z.string(),
  fechaRegistro: z.string(),
  idAlmacen: z.string(),
  materiales: z.array(z.object({
    idProducto: z.string(),
    cantidadConsumida: z.number().positive(),
    observacion: z.string().optional()
  })),
  productoTerminado: z.object({
    cantidad: z.number().positive(),
    observacion: z.string().optional()
  }),
  observaciones: z.string().optional()
});

// ==================== FÓRMULAS ====================

// GET: Listar fórmulas
app.get('/formulas', async (c) => {
  try {
    const { buscar, idProducto } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { codigo: { contains: buscar, mode: 'insensitive' } }
      ];
    }
    
    if (idProducto) {
      where.idProductoResultado = idProducto;
    }
    
    const formulas = await prisma.produccionFormula.findMany({
      where,
      include: {
        productoResultado: {
          select: {
            codigo: true,
            nombre: true,
            unidadMedida: true
          }
        },
        materiales: {
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
      },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: formulas });
  } catch (error) {
    console.error('Error al listar fórmulas:', error);
    return c.json({ success: false, message: 'Error al obtener fórmulas' }, 500);
  }
});

// POST: Crear fórmula
app.post('/formulas', zValidator('json', formulaSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear fórmula
      const formula = await tx.produccionFormula.create({
        data: {
          nombre: body.nombre,
          codigo: body.codigo,
          idProductoResultado: body.idProductoResultado,
          cantidadResultado: body.cantidadResultado,
          unidadMedida: body.unidadMedida,
          costoManoObra: body.costoManoObra,
          costoIndirecto: body.costoIndirecto,
          observaciones: body.observaciones
        }
      });
      
      // Crear materiales
      for (const material of body.materiales) {
        await tx.produccionFormulaDetalle.create({
          data: {
            idFormula: formula.id,
            idProducto: material.idProducto,
            cantidad: material.cantidad,
            unidadMedida: material.unidadMedida,
            merma: material.merma
          }
        });
      }
      
      return formula;
    });
    
    return c.json({ 
      success: true, 
      message: 'Fórmula creada exitosamente',
      data: resultado
    }, 201);
  } catch (error) {
    console.error('Error al crear fórmula:', error);
    return c.json({ success: false, message: 'Error al crear fórmula' }, 500);
  }
});

// PUT: Actualizar fórmula
app.put('/formulas/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar fórmula
      const formula = await tx.produccionFormula.update({
        where: { id },
        data: {
          nombre: body.nombre,
          codigo: body.codigo,
          idProductoResultado: body.idProductoResultado,
          cantidadResultado: body.cantidadResultado,
          unidadMedida: body.unidadMedida,
          costoManoObra: body.costoManoObra,
          costoIndirecto: body.costoIndirecto,
          observaciones: body.observaciones
        }
      });
      
      // Eliminar materiales anteriores
      await tx.produccionFormulaDetalle.deleteMany({
        where: { idFormula: id }
      });
      
      // Crear nuevos materiales
      if (body.materiales && Array.isArray(body.materiales)) {
        for (const material of body.materiales) {
          await tx.produccionFormulaDetalle.create({
            data: {
              idFormula: id,
              idProducto: material.idProducto,
              cantidad: material.cantidad,
              unidadMedida: material.unidadMedida,
              merma: material.merma
            }
          });
        }
      }
      
      return formula;
    });
    
    return c.json({ 
      success: true, 
      message: 'Fórmula actualizada exitosamente',
      data: resultado
    });
  } catch (error) {
    console.error('Error al actualizar fórmula:', error);
    return c.json({ success: false, message: 'Error al actualizar fórmula' }, 500);
  }
});

// ==================== ÓRDENES DE PRODUCCIÓN ====================

// GET: Listar órdenes de producción
app.get('/ordenes', async (c) => {
  try {
    const { estado, fechaDesde, fechaHasta } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (estado) where.estado = estado;
    
    if (fechaDesde || fechaHasta) {
      where.fechaProgramada = {};
      if (fechaDesde) where.fechaProgramada.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaProgramada.lte = new Date(fechaHasta);
    }
    
    const ordenes = await prisma.produccionOrden.findMany({
      where,
      include: {
        formula: {
          include: {
            productoResultado: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        },
        partes: {
          orderBy: { fechaRegistro: 'desc' }
        }
      },
      orderBy: { fechaProgramada: 'desc' }
    });
    
    return c.json({ success: true, data: ordenes });
  } catch (error) {
    console.error('Error al listar órdenes de producción:', error);
    return c.json({ success: false, message: 'Error al obtener órdenes' }, 500);
  }
});

// POST: Crear orden de producción
app.post('/ordenes', zValidator('json', ordenProduccionSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const orden = await prisma.produccionOrden.create({
      data: {
        idFormula: body.idFormula,
        cantidadProducir: body.cantidadProducir,
        fechaProgramada: new Date(body.fechaProgramada),
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
        estado: body.estado,
        observaciones: body.observaciones
      },
      include: {
        formula: true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Orden de producción creada exitosamente',
      data: orden
    }, 201);
  } catch (error) {
    console.error('Error al crear orden de producción:', error);
    return c.json({ success: false, message: 'Error al crear orden' }, 500);
  }
});

// PUT: Iniciar orden de producción
app.put('/ordenes/:id/iniciar', async (c) => {
  try {
    const id = c.req.param('id');
    
    const orden = await prisma.produccionOrden.update({
      where: { id },
      data: { 
        estado: 'EN_PROCESO',
        fechaInicio: new Date()
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Orden iniciada exitosamente',
      data: orden
    });
  } catch (error) {
    console.error('Error al iniciar orden:', error);
    return c.json({ success: false, message: 'Error al iniciar orden' }, 500);
  }
});

// PUT: Finalizar orden de producción
app.put('/ordenes/:id/finalizar', async (c) => {
  try {
    const id = c.req.param('id');
    
    const orden = await prisma.produccionOrden.update({
      where: { id },
      data: { 
        estado: 'FINALIZADA',
        fechaFin: new Date()
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Orden finalizada exitosamente',
      data: orden
    });
  } catch (error) {
    console.error('Error al finalizar orden:', error);
    return c.json({ success: false, message: 'Error al finalizar orden' }, 500);
  }
});

// ==================== PARTES DE PRODUCCIÓN ====================

// POST: Registrar parte de producción
app.post('/partes', zValidator('json', parteProduccionSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar orden
      const orden = await tx.produccionOrden.findUnique({
        where: { id: body.idOrdenProduccion },
        include: { formula: true }
      });
      
      if (!orden) {
        throw new Error('Orden de producción no encontrada');
      }
      
      if (orden.estado !== 'EN_PROCESO') {
        throw new Error('La orden debe estar en proceso para registrar partes');
      }
      
      // Crear parte de producción
      const parte = await tx.produccionParte.create({
        data: {
          idOrdenProduccion: body.idOrdenProduccion,
          fechaRegistro: new Date(body.fechaRegistro),
          idAlmacen: body.idAlmacen,
          observaciones: body.observaciones
        }
      });
      
      // Registrar materiales consumidos
      for (const material of body.materiales) {
        await tx.produccionParteDetalle.create({
          data: {
            idParte: parte.id,
            idProducto: material.idProducto,
            tipo: 'MATERIAL',
            cantidad: material.cantidadConsumida,
            observacion: material.observacion
          }
        });
        
        // Descontar del almacén
        const stock = await tx.almStock.findUnique({
          where: {
            idProducto_idAlmacen: {
              idProducto: material.idProducto,
              idAlmacen: body.idAlmacen
            }
          }
        });
        
        if (stock) {
          await tx.almStock.update({
            where: {
              idProducto_idAlmacen: {
                idProducto: material.idProducto,
                idAlmacen: body.idAlmacen
              }
            },
            data: {
              cantidad: Math.max(0, stock.cantidad - material.cantidadConsumida)
            }
          });
          
          // Registrar en kardex
          await tx.almKardex.create({
            data: {
              idProducto: material.idProducto,
              idAlmacen: body.idAlmacen,
              fecha: new Date(body.fechaRegistro),
              tipoMovimiento: 'SALIDA',
              origen: 'PRODUCCION',
              idDocumento: parte.id,
              cantidad: -material.cantidadConsumida,
              precioUnitario: stock.costoPromedio,
              saldoCantidad: stock.cantidad - material.cantidadConsumida,
              saldoValor: (stock.cantidad * stock.costoPromedio) - (material.cantidadConsumida * stock.costoPromedio)
            }
          });
        }
      }
      
      // Registrar producto terminado
      const productoTerminado = await tx.produccionParteDetalle.create({
        data: {
          idParte: parte.id,
          idProducto: orden.formula.idProductoResultado,
          tipo: 'PRODUCTO_TERMINADO',
          cantidad: body.productoTerminado.cantidad,
          observacion: body.productoTerminado.observacion
        }
      });
      
      // Agregar stock del producto terminado
      const stockPT = await tx.almStock.findUnique({
        where: {
          idProducto_idAlmacen: {
            idProducto: orden.formula.idProductoResultado,
            idAlmacen: body.idAlmacen
          }
        }
      });
      
      if (stockPT) {
        await tx.almStock.update({
          where: {
            idProducto_idAlmacen: {
              idProducto: orden.formula.idProductoResultado,
              idAlmacen: body.idAlmacen
            }
          },
          data: {
            cantidad: stockPT.cantidad + body.productoTerminado.cantidad
          }
        });
      } else {
        await tx.almStock.create({
          data: {
            idProducto: orden.formula.idProductoResultado,
            idAlmacen: body.idAlmacen,
            cantidad: body.productoTerminado.cantidad,
            costoPromedio: 0 // TODO: Calcular costo de producción
          }
        });
      }
      
      // Registrar ingreso en kardex
      await tx.almKardex.create({
        data: {
          idProducto: orden.formula.idProductoResultado,
          idAlmacen: body.idAlmacen,
          fecha: new Date(body.fechaRegistro),
          tipoMovimiento: 'INGRESO',
          origen: 'PRODUCCION',
          idDocumento: parte.id,
          cantidad: body.productoTerminado.cantidad,
          precioUnitario: 0, // TODO: Calcular costo
          saldoCantidad: (stockPT?.cantidad || 0) + body.productoTerminado.cantidad,
          saldoValor: ((stockPT?.cantidad || 0) * (stockPT?.costoPromedio || 0)) + (body.productoTerminado.cantidad * 0)
        }
      });
      
      return parte;
    });
    
    return c.json({ 
      success: true, 
      message: 'Parte de producción registrado exitosamente',
      data: resultado
    }, 201);
  } catch (error: any) {
    console.error('Error al registrar parte de producción:', error);
    return c.json({ success: false, message: error.message || 'Error al registrar parte' }, 500);
  }
});

export default app;
