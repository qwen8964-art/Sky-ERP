import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '../src/db';
import { 
  getEmpresas, 
  getEmpresaById, 
  createEmpresa, 
  updateEmpresa, 
  deleteEmpresa 
} from '../src/controllers/empresa.controller';
import { Context } from 'hono';

// Mock de Prisma
vi.mock('../src/db', () => ({
  default: {
    miEmpresa: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Empresa Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEmpresas', () => {
    it('debe retornar lista de empresas activas', async () => {
      const mockEmpresas = [
        { 
          id_mi_empresa: 1, 
          ruc: '20123456789', 
          razon_social: 'Empresa 1 SAC', 
          nombre_fantasia: 'Empresa 1',
          direccion: 'Calle 123',
          telefono: '012345678',
          email: 'contacto@empresa1.com',
          activo: true,
        },
        { 
          id_mi_empresa: 2, 
          ruc: '20987654321', 
          razon_social: 'Empresa 2 SRL', 
          nombre_fantasia: 'Empresa 2',
          direccion: 'Av. Principal 456',
          telefono: '019876543',
          email: 'info@empresa2.com',
          activo: true,
        },
      ];

      vi.mocked(prisma.miEmpresa.findMany).mockResolvedValue(mockEmpresas as any);

      const mockContext = {
        json: vi.fn((data) => data),
      } as unknown as Context;

      const result = await getEmpresas(mockContext);

      expect(prisma.miEmpresa.findMany).toHaveBeenCalledWith({
        where: { activo: true },
        orderBy: { razon_social: 'asc' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].ruc).toBe('20123456789');
    });

    it('debe retornar lista vacía si no hay empresas', async () => {
      vi.mocked(prisma.miEmpresa.findMany).mockResolvedValue([]);

      const mockContext = {
        json: vi.fn((data) => data),
      } as unknown as Context;

      const result = await getEmpresas(mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getEmpresaById', () => {
    it('debe retornar empresa con sus sedes', async () => {
      const mockEmpresa = {
        id_mi_empresa: 1,
        ruc: '20123456789',
        razon_social: 'Empresa Test SAC',
        nombre_fantasia: 'Empresa Test',
        direccion: 'Calle 123',
        telefono: '012345678',
        email: 'contacto@empresa.com',
        igv: 18.0,
        activo: true,
        sedes: [
          { id_mi_sede: 1, nombre: 'Sede Central', direccion: 'Calle 123', telefono: '012345678', activo: true },
          { id_mi_sede: 2, nombre: 'Sede Norte', direccion: 'Av. Norte 456', telefono: '019876543', activo: true },
        ],
      };

      vi.mocked(prisma.miEmpresa.findUnique).mockResolvedValue(mockEmpresa as any);

      const mockContext = {
        req: { param: vi.fn().mockReturnValue({ id: '1' }) },
        json: vi.fn((data) => data),
      } as unknown as Context;

      const result = await getEmpresaById(mockContext);

      expect(prisma.miEmpresa.findUnique).toHaveBeenCalledWith({
        where: { id_mi_empresa: 1 },
        include: {
          sedes: {
            where: { activo: true },
          },
        },
      });
      expect(result.success).toBe(true);
      expect(result.data.IdMiEmpresa).toBe(1);
      expect(result.data.sedes).toHaveLength(2);
    });

    it('debe retornar 404 si la empresa no existe', async () => {
      vi.mocked(prisma.miEmpresa.findUnique).mockResolvedValue(null);

      const mockContext = {
        req: { param: vi.fn().mockReturnValue({ id: '999' }) },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await getEmpresaById(mockContext);

      expect(result.status).toBe(404);
      expect(result.data.error).toBe('Empresa no encontrada');
    });
  });

  describe('createEmpresa', () => {
    it('debe retornar error si el RUC ya existe', async () => {
      const existingEmpresa = { id_mi_empresa: 1, ruc: '20123456789' };
      vi.mocked(prisma.miEmpresa.findFirst).mockResolvedValue(existingEmpresa as any);

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            ruc: '20123456789',
            razonSocial: 'Empresa Nueva SAC',
            nombreComercial: 'Empresa Nueva',
            direccion: 'Calle Nueva 123',
            telefono: '011111111',
            email: 'nueva@empresa.com',
            igv: 18,
          }),
        },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await createEmpresa(mockContext);

      expect(result.status).toBe(409);
      expect(result.data.error).toBe('Ya existe una empresa con ese RUC');
    });

    it('debe crear una empresa exitosamente', async () => {
      vi.mocked(prisma.miEmpresa.findFirst).mockResolvedValue(null);
      
      const newEmpresa = {
        id_mi_empresa: 3,
        ruc: '20123456789',
        razon_social: 'Empresa Nueva SAC',
        nombre_fantasia: 'Empresa Nueva',
      };
      
      vi.mocked(prisma.miEmpresa.create).mockResolvedValue(newEmpresa as any);

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            ruc: '20123456789',
            razonSocial: 'Empresa Nueva SAC',
            nombreComercial: 'Empresa Nueva',
            direccion: 'Calle Nueva 123',
            telefono: '011111111',
            email: 'nueva@empresa.com',
            igv: 18,
          }),
        },
        json: vi.fn((data, status) => ({ data, status })),
      } as unknown as Context;

      const result = await createEmpresa(mockContext);

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(prisma.miEmpresa.create).toHaveBeenCalled();
    });
  });

  describe('updateEmpresa', () => {
    it('debe actualizar una empresa exitosamente', async () => {
      const updatedEmpresa = {
        id_mi_empresa: 1,
        ruc: '20999999999',
        razon_social: 'Empresa Actualizada SAC',
        nombre_fantasia: 'Empresa Actualizada',
      };

      vi.mocked(prisma.miEmpresa.update).mockResolvedValue(updatedEmpresa as any);

      const mockContext = {
        req: {
          param: vi.fn().mockReturnValue({ id: '1' }),
          json: vi.fn().mockResolvedValue({
            ruc: '20999999999',
            razonSocial: 'Empresa Actualizada SAC',
            nombreComercial: 'Empresa Actualizada',
            direccion: 'Nueva Dirección 456',
            telefono: '012222222',
            email: 'actualizada@empresa.com',
            igv: 18,
          }),
        },
        json: vi.fn((data) => ({ data })),
      } as unknown as Context;

      const result = await updateEmpresa(mockContext);

      expect(result.data.success).toBe(true);
      expect(result.data.message).toContain('actualizada');
      expect(prisma.miEmpresa.update).toHaveBeenCalled();
    });
  });

  describe('deleteEmpresa', () => {
    it('debe eliminar (soft delete) una empresa exitosamente', async () => {
      vi.mocked(prisma.miEmpresa.update).mockResolvedValue({} as any);

      const mockContext = {
        req: { param: vi.fn().mockReturnValue({ id: '1' }) },
        json: vi.fn((data) => ({ data })),
      } as unknown as Context;

      const result = await deleteEmpresa(mockContext);

      expect(result.data.success).toBe(true);
      expect(result.data.message).toContain('eliminada');
      expect(prisma.miEmpresa.update).toHaveBeenCalledWith({
        where: { id_mi_empresa: 1 },
        data: { activo: false },
      });
    });
  });
});
