import { Context } from 'hono';
import prisma from '../db';

// Obtener todas las empresas
export const getEmpresas = async (c: Context) => {
  try {
    const empresas = await prisma.miEmpresa.findMany({
      where: { activo: true },
      orderBy: { razon_social: 'asc' },
    });

    return c.json({
      success: true,
      data: empresas.map((e: any) => ({
        IdMiEmpresa: e.id_mi_empresa,
        ruc: e.ruc,
        razonSocial: e.razon_social,
        nombreComercial: e.nombre_fantasia,
        direccion: e.direccion,
        telefono: e.telefono,
        email: e.email,
        estado: e.activo,
      })),
    });
  } catch (error) {
    console.error('Get empresas error:', error);
    return c.json({ error: 'Error al obtener empresas' }, 500);
  }
};

// Obtener empresa por ID
export const getEmpresaById = async (c: Context) => {
  try {
    const { id } = c.req.param();
    
    const empresa = await prisma.miEmpresa.findUnique({
      where: { id_mi_empresa: parseInt(id) },
      include: {
        sedes: {
          where: { activo: true },
        },
      },
    });

    if (!empresa) {
      return c.json({ error: 'Empresa no encontrada' }, 404);
    }

    return c.json({
      success: true,
      data: {
        IdMiEmpresa: empresa.id_mi_empresa,
        ruc: empresa.ruc,
        razonSocial: empresa.razon_social,
        nombreComercial: empresa.nombre_fantasia,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        email: empresa.email,
        igv: Number(empresa.igv),
        estado: empresa.activo,
        sedes: empresa.sedes.map((s: any) => ({
          IdSede: s.id_mi_sede,
          nombre: s.nombre,
          direccion: s.direccion,
          telefono: s.telefono,
        })),
      },
    });
  } catch (error) {
    console.error('Get empresa by id error:', error);
    return c.json({ error: 'Error al obtener empresa' }, 500);
  }
};

// Crear empresa
export const createEmpresa = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { ruc, razonSocial, nombreComercial, direccion, telefono, email, igv } = body;

    // Validar que el RUC no exista
    const existing = await prisma.miEmpresa.findFirst({
      where: { ruc: ruc },
    });

    if (existing) {
      return c.json({ error: 'Ya existe una empresa con ese RUC' }, 409);
    }

    const empresa = await prisma.miEmpresa.create({
      data: {
        ruc: ruc,
        razon_social: razonSocial,
        nombre_fantasia: nombreComercial || razonSocial,
        direccion: direccion,
        telefono: telefono,
        email: email,
        igv: igv || 18.0,
        activo: true,
      },
    });

    return c.json({
      success: true,
      data: {
        IdMiEmpresa: empresa.id_mi_empresa,
        ruc: empresa.ruc,
        razonSocial: empresa.razon_social,
      },
      message: 'Empresa creada exitosamente',
    }, 201);
  } catch (error) {
    console.error('Create empresa error:', error);
    return c.json({ error: 'Error al crear empresa' }, 500);
  }
};

// Actualizar empresa
export const updateEmpresa = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const empresa = await prisma.miEmpresa.update({
      where: { id_mi_empresa: parseInt(id) },
      data: {
        ruc: body.ruc,
        razon_social: body.razonSocial,
        nombre_fantasia: body.nombreComercial,
        direccion: body.direccion,
        telefono: body.telefono,
        email: body.email,
        igv: body.igv,
      },
    });

    return c.json({
      success: true,
      data: {
        IdMiEmpresa: empresa.id_mi_empresa,
        ruc: empresa.ruc,
        razonSocial: empresa.razon_social,
      },
      message: 'Empresa actualizada exitosamente',
    });
  } catch (error) {
    console.error('Update empresa error:', error);
    return c.json({ error: 'Error al actualizar empresa' }, 500);
  }
};

// Eliminar empresa (soft delete)
export const deleteEmpresa = async (c: Context) => {
  try {
    const { id } = c.req.param();

    await prisma.miEmpresa.update({
      where: { id_mi_empresa: parseInt(id) },
      data: { activo: false },
    });

    return c.json({
      success: true,
      message: 'Empresa eliminada exitosamente',
    });
  } catch (error) {
    console.error('Delete empresa error:', error);
    return c.json({ error: 'Error al eliminar empresa' }, 500);
  }
};
