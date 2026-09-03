import { Hono } from 'hono';
import { login, register, logout, getCurrentUser, refreshToken } from '../controllers/auth.controller';
import { validateLogin } from '../validators/auth.validator';

const authRoutes = new Hono();

// Rutas públicas
authRoutes.post('/login', validateLogin, login);
authRoutes.post('/register', register);
authRoutes.post('/refresh-token', refreshToken);

// Rutas protegidas (middleware de auth se aplicará en cada ruta)
authRoutes.get('/me', getCurrentUser);
authRoutes.post('/logout', logout);

export default authRoutes;
