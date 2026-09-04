import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

// ==================== ALERTAS ====================

// GET: Listar alertas configuradas
app.get('/alertas', async (c) => {
  try {
    const { estado, modulo } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (estado !== undefined) where.estado = estado === 'true';
    if (modulo) where.modulo = modulo;
    
    const alertas = await prisma.alertas.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: alertas });
  } catch (error) {
    console.error('Error al listar alertas:', error);
    return c.json({ success: false, message: 'Error al obtener alertas' }, 500);
  }
});

// POST: Crear alerta
app.post('/alertas', async (c) => {
  try {
    const body = await c.req.json();
    
    const alerta = await prisma.alertas.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        modulo: body.modulo,
        sqlConsulta: body.sqlConsulta,
        frecuencia: body.frecuencia || 'DIARIA',
        umbral: body.umbral,
        tipoUmbral: body.tipoUmbral || 'MAYOR_IGUAL',
        destinatarios: body.destinatarios,
        estado: body.estado ?? true
      }
    });
    
    return c.json({ 
      success: true, 
      message: 'Alerta creada exitosamente',
      data: alerta
    }, 201);
  } catch (error) {
    console.error('Error al crear alerta:', error);
    return c.json({ success: false, message: 'Error al crear alerta' }, 500);
  }
});

// PUT: Actualizar alerta
app.put('/alertas/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const alerta = await prisma.alertas.update({
      where: { id },
      data: body
    });
    
    return c.json({ 
      success: true, 
      message: 'Alerta actualizada exitosamente',
      data: alerta
    });
  } catch (error) {
    console.error('Error al actualizar alerta:', error);
    return c.json({ success: false, message: 'Error al actualizar alerta' }, 500);
  }
});

// DELETE: Eliminar alerta (soft delete)
app.delete('/alertas/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    await prisma.alertas.update({
      where: { id },
      data: { eliminado: true }
    });
    
    return c.json({ success: true, message: 'Alerta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar alerta:', error);
    return c.json({ success: false, message: 'Error al eliminar alerta' }, 500);
  }
});

// POST: Ejecutar alerta manualmente
app.post('/alertas/:id/ejecutar', async (c) => {
  try {
    const id = c.req.param('id');
    
    const alerta = await prisma.alertas.findUnique({
      where: { id, eliminado: false }
    });
    
    if (!alerta) {
      return c.json({ success: false, message: 'Alerta no encontrada' }, 404);
    }
    
    // TODO: Implementar ejecución de SQL y envío de notificaciones
    // Esto requeriría un worker o servicio separado para seguridad
    
    return c.json({ 
      success: true, 
      message: 'Alerta ejecutada (simulación)',
      data: { resultados: [] }
    });
  } catch (error) {
    console.error('Error al ejecutar alerta:', error);
    return c.json({ success: false, message: 'Error al ejecutar alerta' }, 500);
  }
});

// ==================== USUARIOS Y PERMISOS ====================

// GET: Listar usuarios
app.get('/usuarios', async (c) => {
  try {
    const { buscar, estado } = c.req.query();
    
    const where: any = { eliminado: false };
    
    if (estado !== undefined) where.estado = estado === 'true';
    if (buscar) {
      where.persona = {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { apellidoPaterno: { contains: buscar, mode: 'insensitive' } }
        ]
      };
    }
    
    const usuarios = await prisma.usuariosSkynet.findMany({
      where,
      include: {
        persona: {
          select: {
            nombre: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            email: true
          }
        },
        sede: {
          select: {
            nombre: true
          }
        },
        empresa: {
          select: {
            razonSocial: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return c.json({ success: true, data: usuarios });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    return c.json({ success: false, message: 'Error al obtener usuarios' }, 500);
  }
});

// GET: Obtener árbol de navegación/permisos
app.get('/arbol-navegacion', async (c) => {
  try {
    const { idUsuario } = c.req.query();
    
    let where: any = { eliminado: false };
    
    if (idUsuario) {
      // Obtener permisos del usuario
      const permisos = await prisma.usuarioPrivilegios.findMany({
        where: { idUsuario, eliminado: false },
        select: { idArbolDet: true }
      });
      
      const idsPermitidos = permisos.map(p => p.idArbolDet);
      where = { ...where, id: { in: idsPermitidos } };
    }
    
    const arbol = await prisma.arbolDet.findMany({
      where,
      include: {
        hijos: {
          where: { eliminado: false },
          select: {
            id: true,
            nombre: true,
            ruta: true,
            icono: true,
            orden: true
          }
        }
      },
      orderBy: { orden: 'asc' }
    });
    
    return c.json({ success: true, data: arbol });
  } catch (error) {
    console.error('Error al obtener árbol de navegación:', error);
    return c.json({ success: false, message: 'Error al obtener árbol' }, 500);
  }
});

// POST: Asignar permisos a usuario
app.post('/usuarios/:id/permisos', async (c) => {
  try {
    const id = c.req.param('id');
    const { idsArbol } = await c.req.json();
    
    if (!Array.isArray(idsArbol)) {
      return c.json({ success: false, message: 'idsArbol debe ser un array' }, 400);
    }
    
    const resultado = await prisma.$transaction(async (tx) => {
      // Eliminar permisos anteriores
      await tx.usuarioPrivilegios.deleteMany({
        where: { idUsuario: id }
      });
      
      // Crear nuevos permisos
      const permisos = await Promise.all(
        idsArbol.map((idArbol: string) =>
          tx.usuarioPrivilegios.create({
            data: {
              idUsuario: id,
              idArbolDet: idArbol
            }
          })
        )
      );
      
      return permisos;
    });
    
    return c.json({ 
      success: true, 
      message: 'Permisos asignados exitosamente',
      data: resultado
    });
  } catch (error) {
    console.error('Error al asignar permisos:', error);
    return c.json({ success: false, message: 'Error al asignar permisos' }, 500);
  }
});

export default app;
