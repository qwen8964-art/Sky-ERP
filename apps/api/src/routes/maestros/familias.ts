import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const familiaGrupoSchema = z.object({
  nombre: z.string().min(1),
  codigo: z.string().optional(),
  tipo: z.enum(['FAMILIA', 'GRUPO']).default('GRUPO'),
  padreId: z.number().int().optional(), // Para árbol jerárquico
  descripcion: z.string().optional(),
  activo: z.boolean().default(true),
});

export const familiasRouter = new Hono();

// GET /api/familias - Listar árbol completo de familias/grupos
familiasRouter.get('/', async (c) => {
  try {
    const familias = await prisma.familia_grupo.findMany({
      where: { activo: true },
      include: {
        padre: true,
        hijos: {
          where: { activo: true }
        },
        productos: {
          take: 5,
          select: {
            IdProducto: true,
            codigo: true,
            nombre: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: familias });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener familias' }, 500);
  }
});

// GET /api/familias/arbol - Obtener estructura de árbol para UI
familiasRouter.get('/arbol', async (c) => {
  try {
    // Obtener todos los nodos activos
    const todos = await prisma.familia_grupo.findMany({
      where: { activo: true },
      select: {
        IdFamiliaGrupo: true,
        nombre: true,
        codigo: true,
        tipo: true,
        padreId: true
      }
    });
    
    // Construir árbol recursivamente
    const construirArbol = (padreId: number | null = null) => {
      return todos
        .filter(item => item.padreId === padreId)
        .map(item => ({
          ...item,
          children: construirArbol(item.IdFamiliaGrupo)
        }));
    };
    
    const arbol = construirArbol(null);
    
    return c.json({ success: true, data: arbol });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener árbol de familias' }, 500);
  }
});

// GET /api/familias/:id - Obtener familia/grupo por ID
familiasRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const familia = await prisma.familia_grupo.findUnique({
      where: { IdFamiliaGrupo: id },
      include: {
        padre: true,
        hijos: {
          where: { activo: true }
        },
        productos: {
          take: 20,
          select: {
            IdProducto: true,
            codigo: true,
            nombre: true,
            precioCompra: true,
            activo: true
          }
        }
      }
    });
    
    if (!familia) {
      return c.json({ success: false, error: 'Familia/Grupo no encontrado' }, 404);
    }
    
    return c.json({ success: true, data: familia });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener familia' }, 500);
  }
});

// POST /api/familias - Crear nueva familia/grupo
familiasRouter.post('/', zValidator('json', familiaGrupoSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Si tiene padre, verificar que exista
    if (body.padreId) {
      const padre = await prisma.familia_grupo.findUnique({
        where: { IdFamiliaGrupo: body.padreId }
      });
      
      if (!padre) {
        return c.json({ success: false, error: 'El nodo padre no existe' }, 404);
      }
    }
    
    const familia = await prisma.familia_grupo.create({
      data: body,
      include: {
        padre: true
      }
    });
    
    return c.json({ success: true, data: familia, message: 'Familia/Grupo creado exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear familia' }, 500);
  }
});

// PUT /api/familias/:id - Actualizar familia/grupo
familiasRouter.put('/:id', zValidator('json', familiaGrupoSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    const familia = await prisma.familia_grupo.update({
      where: { IdFamiliaGrupo: id },
      data: body,
      include: {
        padre: true
      }
    });
    
    return c.json({ success: true, data: familia, message: 'Familia/Grupo actualizado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar familia' }, 500);
  }
});

// DELETE /api/familias/:id - Eliminar familia/grupo (soft delete)
familiasRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    // Verificar que no tenga hijos activos
    const hijosActivos = await prisma.familia_grupo.count({
      where: {
        padreId: id,
        activo: true
      }
    });
    
    if (hijosActivos > 0) {
      return c.json({ 
        success: false, 
        error: 'No se puede eliminar porque tiene sub-elementos activos' 
      }, 400);
    }
    
    await prisma.familia_grupo.update({
      where: { IdFamiliaGrupo: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Familia/Grupo eliminado exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar familia' }, 500);
  }
});

export default familiasRouter;
