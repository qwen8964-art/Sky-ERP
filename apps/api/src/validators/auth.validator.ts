import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const validateLogin = zValidator('json', z.object({
  empresa: z.string().min(1, 'La empresa es requerida'),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
}));

export const validateRegister = zValidator('json', z.object({
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellidos: z.string().min(2, 'Los apellidos son requeridos'),
  email: z.string().email('Email inválido'),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  idMiEmpresa: z.string().uuid('ID de empresa inválido'),
}));
