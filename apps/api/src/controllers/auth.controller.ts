import { Context } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'skynet-erp-secret-key-change-in-production';
const JWT_EXPIRES_IN = '8h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

interface LoginBody {
  empresa: string;
  username: string;
  password: string;
}

interface RegisterBody {
  nombre: string;
  apellidos: string;
  email: string;
  username: string;
  password: string;
  idMiEmpresa: string;
}

// Generar token JWT
function generateToken(payload: any, expiresIn: string = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

// Verificar token JWT
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Login de usuario
export const login = async (c: Context) => {
  try {
    const body = await c.req.json() as LoginBody;
    const { empresa, username, password } = body;

    // Buscar usuario por username y empresa
    const user = await prisma.usuariosSkynet.findFirst({
      where: {
        LOGIN: username,
        IdMiEmpresa: empresa,
      },
      include: {
        persona: true,
        mi_sede: {
          include: {
            mi_empresa: true,
          },
        },
      },
    });

    if (!user) {
      return c.json({ error: 'Usuario o empresa inválidos' }, 401);
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.PASSWORD);
    if (!validPassword) {
      return c.json({ error: 'Contraseña inválida' }, 401);
    }

    // Verificar si ya tiene sesión activa (bloqueo de doble sesión)
    const existingSession = await prisma.usuarioSesiones.findFirst({
      where: {
        IdUsuario: user.IdUsuario,
        ESTADO: 'A', // Activo
      },
    });

    if (existingSession) {
      return c.json({ 
        error: 'El usuario ya tiene una sesión activa. Contacte al administrador.',
        sessionId: existingSession.IdSesion 
      }, 403);
    }

    // Crear sesión
    const session = await prisma.usuarioSesiones.create({
      data: {
        IdUsuario: user.IdUsuario,
        FECHA_INGRESO: new Date(),
        IP_ADDRESS: c.req.header('x-forwarded-for') || c.req.header('host') || 'unknown',
        ESTADO: 'A',
      },
    });

    // Generar tokens
    const accessToken = generateToken({
      IdUsuario: user.IdUsuario,
        username: user.LOGIN,
      IdMiEmpresa: user.IdMiEmpresa,
      IdSede: user.IdSede,
      IdAlmacen: user.IdAlmacen,
      sessionId: session.IdSesion,
    }, JWT_EXPIRES_IN);

    const refreshToken = generateToken({
      IdUsuario: user.IdUsuario,
      sessionId: session.IdSesion,
    }, REFRESH_TOKEN_EXPIRES_IN);

    // Obtener permisos del usuario (árbol de navegación)
    const permisos = await prisma.usuarioPrivilegios.findMany({
      where: { IdUsuario: user.IdUsuario },
      include: { arbol_det: true },
    });

    return c.json({
      success: true,
      data: {
        user: {
          IdUsuario: user.IdUsuario,
          username: user.LOGIN,
          nombre: user.persona?.NOMBRE,
          apellidos: user.persona?.APELLIDOS,
          email: user.persona?.EMAIL,
          IdMiEmpresa: user.IdMiEmpresa,
          IdSede: user.IdSede,
          IdAlmacen: user.IdAlmacen,
          empresa: user.mi_sede?.mi_empresa?.RAZON_SOCIAL,
          sede: user.mi_sede?.NOMBRE,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: JWT_EXPIRES_IN,
        },
        permisos: permisos.map((p: any) => ({
          IdArbol: p.IdArbol,
          modulo: p.arbol_det?.MODULO,
          descripcion: p.arbol_det?.DESCRIPCION,
          nivel: p.arbol_det?.NIVEL,
        })),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

// Registro de usuario
export const register = async (c: Context) => {
  try {
    const body = await c.req.json() as RegisterBody;
    const { nombre, apellidos, email, username, password, idMiEmpresa } = body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuariosSkynet.findFirst({
      where: { LOGIN: username },
    });

    if (existingUser) {
      return c.json({ error: 'El usuario ya existe' }, 409);
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear persona primero
    const persona = await prisma.persona.create({
      data: {
        NOMBRE: nombre,
        APELLIDOS: apellidos,
        EMAIL: email,
        LOGIN: username,
        PASSWORD: hashedPassword,
      },
    });

    // Crear usuario
    const user = await prisma.usuariosSkynet.create({
      data: {
        IdPersona: persona.IdPersona,
        LOGIN: username,
        PASSWORD: hashedPassword,
        IdMiEmpresa: idMiEmpresa,
        ESTADO: 'A',
      },
    });

    return c.json({
      success: true,
      data: {
        IdUsuario: user.IdUsuario,
        username: user.LOGIN,
        message: 'Usuario registrado exitosamente',
      },
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

// Logout
export const logout = async (c: Context) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Token no proporcionado' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.sessionId) {
      return c.json({ error: 'Token inválido' }, 401);
    }

    // Invalidar sesión
    await prisma.usuarioSesiones.update({
      where: { IdSesion: decoded.sessionId },
      data: {
        FECHA_SALIDA: new Date(),
        ESTADO: 'I', // Inactivo
      },
    });

    return c.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

// Obtener usuario actual
export const getCurrentUser = async (c: Context) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Token no proporcionado' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.IdUsuario) {
      return c.json({ error: 'Token inválido o expirado' }, 401);
    }

    const user = await prisma.usuariosSkynet.findUnique({
      where: { IdUsuario: decoded.IdUsuario },
      include: {
        persona: true,
        mi_sede: {
          include: {
            mi_empresa: true,
          },
        },
      },
    });

    if (!user) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    return c.json({
      success: true,
      data: {
        IdUsuario: user.IdUsuario,
        username: user.LOGIN,
        nombre: user.persona?.NOMBRE,
        apellidos: user.persona?.APELLIDOS,
        email: user.persona?.EMAIL,
        IdMiEmpresa: user.IdMiEmpresa,
        IdSede: user.IdSede,
        IdAlmacen: user.IdAlmacen,
        empresa: user.mi_sede?.mi_empresa?.RAZON_SOCIAL,
        sede: user.mi_sede?.NOMBRE,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

// Refresh token
export const refreshToken = async (c: Context) => {
  try {
    const { refreshToken: refreshTok } = await c.req.json();

    if (!refreshTok) {
      return c.json({ error: 'Refresh token no proporcionado' }, 401);
    }

    const decoded = verifyToken(refreshTok);
    if (!decoded || !decoded.IdUsuario || !decoded.sessionId) {
      return c.json({ error: 'Refresh token inválido o expirado' }, 401);
    }

    // Verificar que la sesión siga activa
    const session = await prisma.usuarioSesiones.findUnique({
      where: { IdSesion: decoded.sessionId },
    });

    if (!session || session.ESTADO !== 'A') {
      return c.json({ error: 'Sesión inválida o cerrada' }, 401);
    }

    // Generar nuevo access token
    const accessToken = generateToken({
      IdUsuario: decoded.IdUsuario,
      sessionId: decoded.sessionId,
    }, JWT_EXPIRES_IN);

    return c.json({
      success: true,
      data: {
        accessToken,
        expiresIn: JWT_EXPIRES_IN,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};
