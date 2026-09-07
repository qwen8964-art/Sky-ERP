import { Context } from 'hono';
import prisma from '../../db';

// Obtener todos los almacenes (filtrados por sede si se proporciona)
export const getAlmacenes = async (c: Context) => {
  try {
    const user = c.get('user') as any;
    const sedeId = c.req.query('sedeId') || user?.id_mi_sede;

    const almacenes = await prisma.miAlmacen.findMany({
      where: {
        id_mi_sede: sedeId ? parseInt(sedeId) : undefined,
        activo: true,
      },
      include: {
        mi_sede: {
          include: {
            mi_empresa: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return c.json({
      success: true,
      data: almacenes.map(a => ({
        id_mi_almacen: a.id_mi_almacen,
        id_mi_sede: a.id_mi_sede,
        nombre: a.nombre,
        direccion: a.direccion,
        responsable: a.responsable,
        sede: a.mi_sede.nombre,
        empresa: a.mi_sede.mi_empresa.razon_social,
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
      where: { id_mi_almacen: parseInt(id) },
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
        id_mi_almacen: almacen.id_mi_almacen,
        id_mi_sede: almacen.id_mi_sede,
        nombre: almacen.nombre,
        direccion: almacen.direccion,
        responsable: almacen.responsable,
        sede: almacen.mi_sede.nombre,
        empresa: almacen.mi_sede.mi_empresa.razon_social,
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
    const { id_mi_sede, nombre, direccion, responsable } = body;

    const almacen = await prisma.miAlmacen.create({
      data: {
        id_mi_sede,
        nombre,
        direccion,
        responsable,
        activo: true,
      },
    });

    return c.json({
      success: true,
      data: {
        id_mi_almacen: almacen.id_mi_almacen,
        nombre: almacen.nombre,
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
      where: { id_mi_almacen: parseInt(id) },
      data: {
        nombre: body.nombre,
        direccion: body.direccion,
        responsable: body.responsable,
      },
    });

    return c.json({
      success: true,
      data: {
        id_mi_almacen: almacen.id_mi_almacen,
        nombre: almacen.nombre,
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
      where: { id_mi_almacen: parseInt(id) },
      data: { activo: false },
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
