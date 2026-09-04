import { Context } from 'hono';
import prisma from '../../config/database';

// Obtener todos los almacenes (filtrados por sede si se proporciona)
export const getAlmacenes = async (c: Context) => {
  try {
    const user = c.get('user') as any;
    const sedeId = c.req.query('sedeId') || user?.IdSede;

    const almacenes = await prisma.miAlmacen.findMany({
      where: {
        IdSede: sedeId,
        ESTADO: 'A',
      },
      include: {
        mi_sede: {
          include: {
            mi_empresa: true,
          },
        },
      },
      orderBy: { NOMBRE: 'asc' },
    });

    return c.json({
      success: true,
      data: almacenes.map(a => ({
        IdAlmacen: a.IdAlmacen,
        IdSede: a.IdSede,
        nombre: a.NOMBRE,
        direccion: a.DIRECCION,
        telefono: a.TELEFONO,
        sede: a.mi_sede.NOMBRE,
        empresa: a.mi_sede.mi_empresa.RAZON_SOCIAL,
      })),
    });
  } catch (error) {
    console.error('Get almacenes error:', error);
    return c.json({ error: 'Error al obtener almacenes' }, 500);
  }
};

// Obtener almacén por ID
export const getAlmacenById = async (c: Context) => {
  try {
    const { id } = c.req.param();
    
    const almacen = await prisma.miAlmacen.findUnique({
      where: { IdAlmacen: id },
      include: {
        mi_sede: {
          include: {
            mi_empresa: true,
          },
        },
      },
    });

    if (!almacen) {
      return c.json({ error: 'Almacén no encontrado' }, 404);
    }

    return c.json({
      success: true,
      data: {
        IdAlmacen: almacen.IdAlmacen,
        IdSede: almacen.IdSede,
        nombre: almacen.NOMBRE,
        direccion: almacen.DIRECCION,
        telefono: almacen.TELEFONO,
        email: almacen.EMAIL,
        sede: almacen.mi_sede.NOMBRE,
        empresa: almacen.mi_sede.mi_empresa.RAZON_SOCIAL,
      },
    });
  } catch (error) {
    console.error('Get almacen by id error:', error);
    return c.json({ error: 'Error al obtener almacén' }, 500);
  }
};

// Crear almacén
export const createAlmacen = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { IdSede, nombre, direccion, telefono, email } = body;

    const almacen = await prisma.miAlmacen.create({
      data: {
        IdSede,
        NOMBRE: nombre,
        DIRECCION: direccion,
        TELEFONO: telefono,
        EMAIL: email,
        ESTADO: 'A',
      },
    });

    return c.json({
      success: true,
      data: {
        IdAlmacen: almacen.IdAlmacen,
        nombre: almacen.NOMBRE,
      },
      message: 'Almacén creado exitosamente',
    }, 201);
  } catch (error) {
    console.error('Create almacen error:', error);
    return c.json({ error: 'Error al crear almacén' }, 500);
  }
};

// Actualizar almacén
export const updateAlmacen = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const almacen = await prisma.miAlmacen.update({
      where: { IdAlmacen: id },
      data: {
        NOMBRE: body.nombre,
        DIRECCION: body.direccion,
        TELEFONO: body.telefono,
        EMAIL: body.email,
      },
    });

    return c.json({
      success: true,
      data: {
        IdAlmacen: almacen.IdAlmacen,
        nombre: almacen.NOMBRE,
      },
      message: 'Almacén actualizado exitosamente',
    });
  } catch (error) {
    console.error('Update almacen error:', error);
    return c.json({ error: 'Error al actualizar almacén' }, 500);
  }
};

// Eliminar almacén (soft delete)
export const deleteAlmacen = async (c: Context) => {
  try {
    const { id } = c.req.param();

    await prisma.miAlmacen.update({
      where: { IdAlmacen: id },
      data: { ESTADO: 'I' },
    });

    return c.json({
      success: true,
      message: 'Almacén eliminado exitosamente',
    });
  } catch (error) {
    console.error('Delete almacen error:', error);
    return c.json({ error: 'Error al eliminar almacén' }, 500);
  }
};
