import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Productos API', () => {
  let authToken: string;
  let productoId: string;
  let empresaId: string;
  let almacenId: string;

  beforeAll(async () => {
    // Crear empresa de prueba
    const empresa = await prisma.miEmpresa.create({
      data: {
        nombre: 'Empresa Test Productos',
        ruc: '20123456789',
        direccion: 'Calle Test 123',
        telefono: '012345678',
        email: 'test@empresa.com',
        igv: 18,
      },
    });
    empresaId = empresa.idMiEmpresa;

    // Crear almacén
    const almacen = await prisma.miAlmacen.create({
      data: {
        idMiSede: empresaId, // Simplificado para test
        nombre: 'Almacén Test',
        direccion: 'Av. Almacén 456',
        telefono: '019876543',
      },
    });
    almacenId = almacen.idAlmacen;

    // Login para obtener token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123',
        idMiEmpresa: empresaId,
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.productos.deleteMany({
      where: { idMiEmpresa: empresaId },
    });
    await prisma.miAlmacen.deleteMany({
      where: { idMiSede: empresaId },
    });
    await prisma.miEmpresa.deleteMany({
      where: { idMiEmpresa: empresaId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/productos', () => {
    it('debe crear un producto correctamente', async () => {
      const nuevoProducto = {
        codigo: 'PROD-TEST-001',
        nombre: 'Producto de Prueba',
        descripcion: 'Producto creado para testing',
        unidad: 'NIU',
        precioCompra: 100.00,
        precioVenta: 150.00,
        stockMinimo: 10,
        stockMaximo: 100,
        afectaIgv: true,
        idMiEmpresa: empresaId,
      };

      const response = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nuevoProducto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('idProducto');
      expect(response.body.codigo).toBe('PROD-TEST-001');
      
      productoId = response.body.idProducto;
    });

    it('debe rechazar producto con código duplicado', async () => {
      const productoDuplicado = {
        codigo: 'PROD-TEST-001',
        nombre: 'Producto Duplicado',
        descripcion: 'Este debería fallar',
        unidad: 'NIU',
        precioCompra: 50.00,
        precioVenta: 75.00,
        afectaIgv: true,
        idMiEmpresa: empresaId,
      };

      const response = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productoDuplicado);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/productos', () => {
    it('debe listar productos de la empresa', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ idMiEmpresa: empresaId });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('idProducto');
    });

    it('debe filtrar productos por búsqueda', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          idMiEmpresa: empresaId,
          search: 'Prueba'
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((producto: any) => {
        expect(producto.nombre || producto.descripcion).toMatch(/Prueba/i);
      });
    });
  });

  describe('GET /api/productos/:id', () => {
    it('debe obtener un producto por ID', async () => {
      const response = await request(app)
        .get(`/api/productos/${productoId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('idProducto', productoId);
      expect(response.body).toHaveProperty('codigo');
      expect(response.body).toHaveProperty('nombre');
    });

    it('debe retornar 404 para producto inexistente', async () => {
      const response = await request(app)
        .get('/api/productos/999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/productos/:id', () => {
    it('debe actualizar un producto existente', async () => {
      const actualizacion = {
        nombre: 'Producto Actualizado',
        precioVenta: 175.00,
        stockMinimo: 15,
      };

      const response = await request(app)
        .put(`/api/productos/${productoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(actualizacion);

      expect(response.status).toBe(200);
      expect(response.body.nombre).toBe('Producto Actualizado');
      expect(response.body.precioVenta).toBe(175.00);
    });

    it('no debe permitir actualizar código a uno existente', async () => {
      // Crear otro producto primero
      const otroProducto = await prisma.productos.create({
        data: {
          idMiEmpresa: empresaId,
          codigo: 'PROD-TEST-002',
          nombre: 'Otro Producto',
          unidad: 'NIU',
          precioCompra: 80.00,
          precioVenta: 120.00,
          afectaIgv: true,
        },
      });

      const response = await request(app)
        .put(`/api/productos/${productoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ codigo: 'PROD-TEST-002' });

      expect(response.status).toBe(409);
      
      // Limpiar
      await prisma.productos.delete({
        where: { idProducto: otroProducto.idProducto },
      });
    });
  });

  describe('DELETE /api/productos/:id', () => {
    it('debe eliminar un producto', async () => {
      // Crear producto para eliminar
      const productoEliminar = await prisma.productos.create({
        data: {
          idMiEmpresa: empresaId,
          codigo: 'PROD-DELETE-001',
          nombre: 'Producto a Eliminar',
          unidad: 'NIU',
          precioCompra: 50.00,
          precioVenta: 75.00,
          afectaIgv: true,
        },
      });

      const response = await request(app)
        .delete(`/api/productos/${productoEliminar.idProducto}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();

      // Verificar que fue eliminado
      const verifyResponse = await request(app)
        .get(`/api/productos/${productoEliminar.idProducto}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('GET /api/productos/:id/stock', () => {
    it('debe obtener el stock de un producto por almacén', async () => {
      const response = await request(app)
        .get(`/api/productos/${productoId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ idAlmacen: almacenId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('idProducto');
      expect(response.body).toHaveProperty('stock');
    });
  });
});
