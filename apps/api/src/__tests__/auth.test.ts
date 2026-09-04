import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../src/db';
import { login, register, logout, getCurrentUser, refreshToken, verifyToken } from '../src/controllers/auth.controller';
import { Context } from 'hono';

// Mock de Prisma
vi.mock('../src/db', () => ({
  default: {
    usuariosSkynet: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    persona: {
      create: vi.fn(),
    },
    usuarioSesiones: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    usuarioPrivilegios: {
      findMany: vi.fn(),
    },
    arbol_det: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

const JWT_SECRET = 'test-secret-key';

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('debe verificar un token válido', () => {
      const payload = { IdUsuario: '1', username: 'test' };
      const token = jwt.sign(payload, JWT_SECRET);
      
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.IdUsuario).toBe('1');
    });

    it('debe retornar null para token inválido', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('debe retornar error si el usuario no existe', async () => {
      vi.mocked(prisma.usuariosSkynet.findFirst).mockResolvedValue(null);

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            empresa: '1',
            username: 'testuser',
            password: 'password123',
          }),
          header: vi.fn().mockReturnValue('127.0.0.1'),
        },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await login(mockContext);

      expect(result.status).toBe(401);
      expect(result.data.error).toBe('Usuario o empresa inválidos');
    });

    it('debe retornar error si la contraseña es incorrecta', async () => {
      const mockUser = {
        IdUsuario: '1',
        LOGIN: 'testuser',
        PASSWORD: 'hashedPassword',
        IdMiEmpresa: '1',
        IdSede: '1',
        IdAlmacen: '1',
        persona: { NOMBRE: 'Test', APELLIDOS: 'User', EMAIL: 'test@example.com' },
        mi_sede: { NOMBRE: 'Sede 1', mi_empresa: { RAZON_SOCIAL: 'Empresa Test' } },
      };

      vi.mocked(prisma.usuariosSkynet.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            empresa: '1',
            username: 'testuser',
            password: 'wrongpassword',
          }),
          header: vi.fn().mockReturnValue('127.0.0.1'),
        },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await login(mockContext);

      expect(result.status).toBe(401);
      expect(result.data.error).toBe('Contraseña inválida');
    });

    it('debe retornar error si hay sesión activa (doble sesión)', async () => {
      const mockUser = {
        IdUsuario: '1',
        LOGIN: 'testuser',
        PASSWORD: 'hashedPassword',
        IdMiEmpresa: '1',
        IdSede: '1',
        IdAlmacen: '1',
        persona: { NOMBRE: 'Test', APELLIDOS: 'User', EMAIL: 'test@example.com' },
        mi_sede: { NOMBRE: 'Sede 1', mi_empresa: { RAZON_SOCIAL: 'Empresa Test' } },
      };

      const mockSession = { IdSesion: 'session-123' };

      vi.mocked(prisma.usuariosSkynet.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(prisma.usuarioSesiones.findFirst).mockResolvedValue(mockSession as any);

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            empresa: '1',
            username: 'testuser',
            password: 'password123',
          }),
          header: vi.fn().mockReturnValue('127.0.0.1'),
        },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await login(mockContext);

      expect(result.status).toBe(403);
      expect(result.data.error).toContain('sesión activa');
    });
  });

  describe('register', () => {
    it('debe retornar error si el usuario ya existe', async () => {
      const existingUser = { IdUsuario: '1', LOGIN: 'testuser' };
      vi.mocked(prisma.usuariosSkynet.findFirst).mockResolvedValue(existingUser as any);

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            nombre: 'Test',
            apellidos: 'User',
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            idMiEmpresa: '1',
          }),
        },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await register(mockContext);

      expect(result.status).toBe(409);
      expect(result.data.error).toBe('El usuario ya existe');
    });

    it('debe registrar un usuario exitosamente', async () => {
      vi.mocked(prisma.usuariosSkynet.findFirst).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword');
      
      const mockPersona = { IdPersona: '1' };
      const mockUser = { IdUsuario: '1', LOGIN: 'testuser' };
      
      vi.mocked(prisma.persona.create).mockResolvedValue(mockPersona as any);
      vi.mocked(prisma.usuariosSkynet.create).mockResolvedValue(mockUser as any);

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            nombre: 'Test',
            apellidos: 'User',
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            idMiEmpresa: '1',
          }),
        },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await register(mockContext);

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(prisma.persona.create).toHaveBeenCalled();
      expect(prisma.usuariosSkynet.create).toHaveBeenCalled();
    });
  });
});
