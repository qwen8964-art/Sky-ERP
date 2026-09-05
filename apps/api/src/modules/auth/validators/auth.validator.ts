import { z } from 'zod';

const loginSchema = z.object({
  login: z.string().min(3).max(50),
  password: z.string().min(6),
});

export const validateLogin = async (c: any, next: any) => {
  try {
    const body = await c.req.json();
    loginSchema.parse(body);
    await next();
  } catch (error: any) {
    return c.json({ error: 'Datos inválidos', details: error.errors }, 400);
  }
};
