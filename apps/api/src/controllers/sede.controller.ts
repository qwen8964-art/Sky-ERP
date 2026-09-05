import { Context } from 'hono';
import prisma from '../../db.js';

export const getSedes = async (c: Context) => {
  try {
    const sedes = await prisma.miSede.findMany({
      where: { activo: true },
      include: { mi_empresa: true, almacenes: true },
      orderBy: { nombre: 'asc' },
    });

    return c.json({
      success: true,
      data: sedes.map(s => ({
        id_mi_sede: s.id_mi_sede,
        id_mi_empresa: s.id_mi_empresa,
        nombre: s.nombre,
        direccion: s.direccion,
        telefono: s.telefono,
        empresa: s.mi_empresa.razon_social,
        almacenes: s.almacenes.map(a => a.nombre),
      })),
    });
  } catch (error) {
    console.error('Get sedes error:', error);
    return c.json({ error: 'Error al obtener sedes' }, 500);
  }
};

export const getSedeById = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const sede = await prisma.miSede.findUnique({
      where: { id_mi_sede: parseInt(id) },
      include: { mi_empresa: true, almacenes: true },
    });

    if (!sede) {
      return c.json({ error: 'Sede no encontrada' }, 404);
    }

    return c.json({ success: true, data: sede });
  } catch (error) {
    console.error('Get sede by id error:', error);
    return c.json({ error: 'Error al obtener sede' }, 500);
  }
};

export const createSede = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { id_mi_empresa, nombre, direccion, telefono } = body;

    const sede = await prisma.miSede.create({
      data: {
        id_mi_empresa,
        nombre,
        direccion,
        telefono,
        activo: true,
      },
    });

    return c.json({
      success: true,
      data: { id_mi_sede: sede.id_mi_sede, nombre: sede.nombre },
      message: 'Sede creada exitosamente',
    }, 201);
  } catch (error) {
    console.error('Create sede error:', error);
    return c.json({ error: 'Error al crear sede' }, 500);
  }
};

export const updateSede = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const sede = await prisma.miSede.update({
      where: { id_mi_sede: parseInt(id) },
      data: body,
    });

    return c.json({
      success: true,
      data: sede,
      message: 'Sede actualizada exitosamente',
    });
  } catch (error) {
    console.error('Update sede error:', error);
    return c.json({ error: 'Error al actualizar sede' }, 500);
  }
};

export const deleteSede = async (c: Context) => {
  try {
    const { id } = c.req.param();

    await prisma.miSede.update({
      where: { id_mi_sede: parseInt(id) },
      data: { activo: false },
    });

    return c.json({ success: true, message: 'Sede eliminada exitosamente' });
  } catch (error) {
    console.error('Delete sede error:', error);
    return c.json({ error: 'Error al eliminar sede' }, 500);
  }
};
