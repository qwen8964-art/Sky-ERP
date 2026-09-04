import { Context, Next } from 'hono';
import { verifyToken } from '../controllers/auth.controller';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token de autenticación no proporcionado' }, 401);
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return c.json({ error: 'Token inválido o expirado' }, 401);
  }

  // Adjuntar información del usuario al contexto
  c.set('user', decoded);

  await next();
};

// Middleware para verificar permisos por módulo
export const checkPermission = (modulo: string) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as any;
    
    if (!user) {
      return c.json({ error: 'Usuario no autenticado' }, 401);
    }

    // TODO: Implementar lógica de verificación de permisos por árbol
    // Por ahora permite el acceso si está autenticado
    await next();
  };
};

// Middleware para validar empresa/sede/almacén
export const checkContext = async (c: Context, next: Next) => {
  const user = c.get('user') as any;
  
  if (!user) {
    return c.json({ error: 'Usuario no autenticado' }, 401);
  }

  // Validar que la empresa en la URL coincida con la del usuario (si se proporciona)
  const empresaId = c.req.param('empresaId');
  if (empresaId && empresaId !== user.IdMiEmpresa) {
    return c.json({ error: 'Acceso denegado a esta empresa' }, 403);
  }

  await next();
};
