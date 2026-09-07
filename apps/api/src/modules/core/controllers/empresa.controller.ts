import { Context } from 'hono';
import prisma from '../../db';

export const getEmpresas = async (c: Context) => {
  try {
    const empresas = await prisma.miEmpresa.findMany({
      where: { activo: true },
      orderBy: { razon_social: 'asc' },
    });

    return c.json({
      success: true,
      data: empresas.map(e => ({
        id_mi_empresa: e.id_mi_empresa,
        ruc: e.ruc,
        razon_social: e.razon_social,
        nombre_fantasia: e.nombre_fantasia,
        direccion: e.direccion,
        telefono: e.telefono,
        email: e.email,
        igv: e.igv,
        moneda: e.moneda,
      })),
    });
  } catch (error) {
    console.error('Get empresas error:', error);
    return c.json({ error: 'Error al obtener empresas' }, 500);
  }
};

export const getEmpresaById = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const empresa = await prisma.miEmpresa.findUnique({
      where: { id_mi_empresa: parseInt(id) },
      include: { sedes: true },
    });

    if (!empresa) {
      return c.json({ error: 'Empresa no encontrada' }, 404);
    }

    return c.json({ success: true, data: empresa });
  } catch (error) {
    console.error('Get empresa by id error:', error);
    return c.json({ error: 'Error al obtener empresa' }, 500);
  }
};

export const createEmpresa = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { ruc, razon_social, nombre_fantasia, direccion, telefono, email, igv, moneda } = body;

    const empresa = await prisma.miEmpresa.create({
      data: {
        ruc,
        razon_social,
        nombre_fantasia,
        direccion,
        telefono,
        email,
        igv: igv || 18.0,
        moneda: moneda || 'PEN',
        activo: true,
      },
    });

    return c.json({
      success: true,
      data: { id_mi_empresa: empresa.id_mi_empresa, razon_social: empresa.razon_social },
      message: 'Empresa creada exitosamente',
    }, 201);
  } catch (error) {
    console.error('Create empresa error:', error);
    return c.json({ error: 'Error al crear empresa' }, 500);
  }
};

export const updateEmpresa = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const empresa = await prisma.miEmpresa.update({
      where: { id_mi_empresa: parseInt(id) },
      data: body,
    });

    return c.json({
      success: true,
      data: empresa,
      message: 'Empresa actualizada exitosamente',
    });
  } catch (error) {
    console.error('Update empresa error:', error);
    return c.json({ error: 'Error al actualizar empresa' }, 500);
  }
};

export const deleteEmpresa = async (c: Context) => {
  try {
    const { id } = c.req.param();

    await prisma.miEmpresa.update({
      where: { id_mi_empresa: parseInt(id) },
      data: { activo: false },
    });

    return c.json({ success: true, message: 'Empresa eliminada exitosamente' });
  } catch (error) {
    console.error('Delete empresa error:', error);
    return c.json({ error: 'Error al eliminar empresa' }, 500);
  }
};
