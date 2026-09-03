import { Context } from 'hono';
import prisma from '../db';

// Obtener todas las sedes (filtradas por empresa si se proporciona)
export const getSedes = async (c: Context) => {
  try {
    const user = c.get('user') as any;
    const empresaId = c.req.query('empresaId') || user?.IdMiEmpresa;

    const sedes = await prisma.miSede.findMany({
      where: {
        id_mi_empresa: parseInt(empresaId),
        activo: true,
      },
      include: {
        empresa: true,
        almacenes: {
          where: { activo: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return c.json({
      success: true,
      data: sedes.map((s: any) => ({
        IdSede: s.id_mi_sede,
        IdMiEmpresa: s.id_mi_empresa,
        nombre: s.nombre,
        direccion: s.direccion,
        telefono: s.telefono,
        email: s.email,
        empresa: s.empresa.razon_social,
        almacenes: s.almacenes.map((a: any) => ({
          IdAlmacen: a.id_mi_almacen,
          nombre: a.nombre,
          direccion: a.direccion,
        })),
      })),
    });
  } catch (error) {
    console.error('Get sedes error:', error);
    return c.json({ error: 'Error al obtener sedes' }, 500);
  }
};

// Obtener sede por ID
export const getSedeById = async (c: Context) => {
  try {
    const { id } = c.req.param();
    
    const sede = await prisma.miSede.findUnique({
      where: { id_mi_sede: parseInt(id) },
      include: {
        empresa: true,
        almacenes: {
          where: { activo: true },
        },
      },
    });

    if (!sede) {
      return c.json({ error: 'Sede no encontrada' }, 404);
    }

    return c.json({
      success: true,
      data: {
        IdSede: sede.id_mi_sede,
        IdMiEmpresa: sede.id_mi_empresa,
        nombre: sede.nombre,
        direccion: sede.direccion,
        telefono: sede.telefono,
        email: sede.email,
        empresa: sede.empresa.razon_social,
        almacenes: sede.almacenes.map((a: any) => ({
          IdAlmacen: a.id_mi_almacen,
          nombre: a.nombre,
          direccion: a.direccion,
          telefono: a.telefono,
        })),
      },
    });
  } catch (error) {
    console.error('Get sede by id error:', error);
    return c.json({ error: 'Error al obtener sede' }, 500);
  }
};

// Crear sede
export const createSede = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { IdMiEmpresa, nombre, direccion, telefono, email } = body;

    const sede = await prisma.miSede.create({
      data: {
        id_mi_empresa: parseInt(IdMiEmpresa),
        nombre: nombre,
        direccion: direccion,
        telefono: telefono,
        email: email,
        activo: true,
      },
    });

    return c.json({
      success: true,
      data: {
        IdSede: sede.id_mi_sede,
        nombre: sede.nombre,
      },
      message: 'Sede creada exitosamente',
    }, 201);
  } catch (error) {
    console.error('Create sede error:', error);
    return c.json({ error: 'Error al crear sede' }, 500);
  }
};

// Actualizar sede
export const updateSede = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const sede = await prisma.miSede.update({
      where: { id_mi_sede: parseInt(id) },
      data: {
        nombre: body.nombre,
        direccion: body.direccion,
        telefono: body.telefono,
        email: body.email,
      },
    });

    return c.json({
      success: true,
      data: {
        IdSede: sede.id_mi_sede,
        nombre: sede.nombre,
      },
      message: 'Sede actualizada exitosamente',
    });
  } catch (error) {
    console.error('Update sede error:', error);
    return c.json({ error: 'Error al actualizar sede' }, 500);
  }
};

// Eliminar sede (soft delete)
export const deleteSede = async (c: Context) => {
  try {
    const { id } = c.req.param();

    await prisma.miSede.update({
      where: { id_mi_sede: parseInt(id) },
      data: { activo: false },
    });

    return c.json({
      success: true,
      message: 'Sede eliminada exitosamente',
    });
  } catch (error) {
    console.error('Delete sede error:', error);
    return c.json({ error: 'Error al eliminar sede' }, 500);
  }
};
