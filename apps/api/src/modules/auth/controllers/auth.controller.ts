import { Context } from 'hono';
import prisma from '../../../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'skynet-erp-secret-key';

export const login = async (c: Context) => {
  try {
    const { login, password } = await c.req.json();

    const user = await prisma.usuarioSkynet.findUnique({
      where: { login },
      include: {
        empresa: true,
        sede: true,
        almacen: true,
      },
    });

    if (!user || !user.activo || user.bloqueado) {
      return c.json({ error: 'Credenciales inválidas' }, 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return c.json({ error: 'Credenciales inválidas' }, 401);
    }

    const token = jwt.sign(
      { 
        id_usuario: user.id_usuario,
        login: user.login,
        id_mi_empresa: user.id_mi_empresa,
        id_mi_sede: user.id_mi_sede,
        id_mi_almacen: user.id_mi_almacen,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await prisma.usuarioSesion.create({
      data: {
        id_usuario: user.id_usuario,
        token: `Bearer ${token}`,
        ip_address: c.req.header('x-forwarded-for') || 'unknown',
        user_agent: c.req.header('user-agent') || 'unknown',
      },
    });

    await prisma.usuarioSkynet.update({
      where: { id_usuario: user.id_usuario },
      data: { ultima_sesion: new Date() },
    });

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id_usuario: user.id_usuario,
          login: user.login,
          nombres: user.nombres,
          apellidos: user.apellidos,
          email: user.email,
          empresa: user.empresa.razon_social,
          sede: user.sede?.nombre,
          almacen: user.almacen?.nombre,
        },
      },
      message: 'Login exitoso',
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Error al iniciar sesión' }, 500);
  }
};

export const register = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { login, password, nombres, apellidos, email, id_mi_empresa, id_mi_sede, id_mi_almacen } = body;

    const existingUser = await prisma.usuarioSkynet.findUnique({ where: { login } });
    if (existingUser) {
      return c.json({ error: 'El usuario ya existe' }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.usuarioSkynet.create({
      data: {
        login,
        password: hashedPassword,
        nombres,
        apellidos,
        email,
        id_mi_empresa,
        id_mi_sede: id_mi_sede || null,
        id_mi_almacen: id_mi_almacen || null,
        activo: true,
        bloqueado: false,
      },
    });

    return c.json({
      success: true,
      data: { id_usuario: user.id_usuario, login: user.login },
      message: 'Usuario registrado exitosamente',
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: 'Error al registrar usuario' }, 500);
  }
};

export const logout = async (c: Context) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await prisma.usuarioSesion.deleteMany({ where: { token } });
    }

    return c.json({ success: true, message: 'Logout exitoso' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Error al cerrar sesión' }, 500);
  }
};

export const getCurrentUser = async (c: Context) => {
  try {
    const user = c.get('user') as any;
    if (!user) {
      return c.json({ error: 'No autenticado' }, 401);
    }

    const userData = await prisma.usuarioSkynet.findUnique({
      where: { id_usuario: user.id_usuario },
      include: {
        empresa: true,
        sede: true,
        almacen: true,
        privilegios: true,
      },
    });

    if (!userData) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    return c.json({
      success: true,
      data: {
        id_usuario: userData.id_usuario,
        login: userData.login,
        nombres: userData.nombres,
        apellidos: userData.apellidos,
        email: userData.email,
        empresa: userData.empresa,
        sede: userData.sede,
        almacen: userData.almacen,
        privilegios: userData.privilegios,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return c.json({ error: 'Error al obtener usuario' }, 500);
  }
};

export const refreshToken = async (c: Context) => {
  try {
    const { refresh_token } = await c.req.json();
    
    const decoded = jwt.verify(refresh_token, JWT_SECRET) as any;
    
    const newToken = jwt.sign(
      { 
        id_usuario: decoded.id_usuario,
        login: decoded.login,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return c.json({
      success: true,
      data: { token: newToken },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json({ error: 'Token inválido o expirado' }, 401);
  }
};
