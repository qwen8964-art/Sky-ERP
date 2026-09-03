import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const personaSchema = z.object({
  tipoDocumento: z.enum(['DNI', 'RUC', 'CE', 'PASAPORTE']).default('DNI'),
  numeroDocumento: z.string().min(1),
  nombre: z.string().min(1),
  apellidoPaterno: z.string().optional(),
  apellidoMaterno: z.string().optional(),
  razonSocial: z.string().optional(), // Para empresas
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  celular: z.string().optional(),
  direccion: z.string().optional(),
  distrito: z.string().optional(),
  provincia: z.string().optional(),
  departamento: z.string().optional(),
  pais: z.string().default('PERU'),
  fechaNacimiento: z.string().optional(),
  genero: z.enum(['M', 'F', 'O']).optional(),
  estadoCivil: z.enum(['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO']).optional(),
  login: z.string().optional(), // Solo si es usuario del sistema
  password: z.string().optional(), // Solo si es usuario del sistema
  activo: z.boolean().default(true),
});

export const personasRouter = new Hono();

// GET /api/personas - Listar personas (con filtros opcionales)
personasRouter.get('/', async (c) => {
  try {
    const tipo = c.req.query('tipo'); // DNI, RUC, etc.
    const busqueda = c.req.query('q'); // Búsqueda por nombre o documento
    
    const where: any = { activo: true };
    
    if (tipo) {
      where.tipoDocumento = tipo;
    }
    
    if (busqueda) {
      where.OR = [
        { numeroDocumento: { contains: busqueda } },
        { nombre: { contains: busqueda } },
        { razonSocial: { contains: busqueda } },
        { apellidoPaterno: { contains: busqueda } }
      ];
    }
    
    const personas = await prisma.persona.findMany({
      where,
      take: 50, // Paginación simple
      orderBy: { nombre: 'asc' }
    });
    
    return c.json({ success: true, data: personas });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener personas' }, 500);
  }
});

// GET /api/personas/:id - Obtener persona por ID
personasRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const persona = await prisma.persona.findUnique({
      where: { IdPersona: id },
      include: {
        cliente: true,
        proveedor: true,
        trabajador: true,
        vendedor: true
      }
    });
    
    if (!persona) {
      return c.json({ success: false, error: 'Persona no encontrada' }, 404);
    }
    
    return c.json({ success: true, data: persona });
  } catch (error) {
    return c.json({ success: false, error: 'Error al obtener persona' }, 500);
  }
});

// POST /api/personas - Crear nueva persona
personasRouter.post('/', zValidator('json', personaSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    
    // Validar que no exista número de documento duplicado
    const existente = await prisma.persona.findFirst({
      where: {
        numeroDocumento: body.numeroDocumento,
        tipoDocumento: body.tipoDocumento
      }
    });
    
    if (existente) {
      return c.json({ 
        success: false, 
        error: `Ya existe una persona con ${body.tipoDocumento} ${body.numeroDocumento}` 
      }, 400);
    }
    
    const persona = await prisma.persona.create({
      data: body
    });
    
    return c.json({ success: true, data: persona, message: 'Persona creada exitosamente' }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Error al crear persona' }, 500);
  }
});

// PUT /api/personas/:id - Actualizar persona
personasRouter.put('/:id', zValidator('json', personaSchema.partial()), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    
    // Si se actualiza el número de documento, validar que no esté duplicado
    if (body.numeroDocumento || body.tipoDocumento) {
      const existente = await prisma.persona.findFirst({
        where: {
          numeroDocumento: body.numeroDocumento,
          tipoDocumento: body.tipoDocumento,
          NOT: { IdPersona: id }
        }
      });
      
      if (existente) {
        return c.json({ 
          success: false, 
          error: 'Ya existe otra persona con ese documento' 
        }, 400);
      }
    }
    
    const persona = await prisma.persona.update({
      where: { IdPersona: id },
      data: body
    });
    
    return c.json({ success: true, data: persona, message: 'Persona actualizada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al actualizar persona' }, 500);
  }
});

// DELETE /api/personas/:id - Eliminar persona (soft delete)
personasRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    await prisma.persona.update({
      where: { IdPersona: id },
      data: { activo: false }
    });
    
    return c.json({ success: true, message: 'Persona eliminada exitosamente' });
  } catch (error) {
    return c.json({ success: false, error: 'Error al eliminar persona' }, 500);
  }
});

export default personasRouter;
