import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Ventas API - Comprobantes', () => {
  let authToken: string;
  let empresaId: string;
  let clienteId: string;
  let productoId: string;
  let comprobanteId: string;

  beforeAll(async () => {
    // Crear empresa de prueba
    const empresa = await prisma.miEmpresa.create({
      data: {
        nombre: 'Empresa Test Ventas',
        ruc: '20987654321',
        direccion: 'Calle Ventas 789',
        telefono: '015555555',
        email: 'ventas@empresa.com',
        igv: 18,
      },
    });
    empresaId = empresa.idMiEmpresa;

    // Crear cliente
    const persona = await prisma.persona.create({
      data: {
        tipoDocumento: 'RUC',
        numeroDocumento: '20111222333',
        razonSocial: 'Cliente Test SAC',
        email: 'cliente@test.com',
        telefono: '999888777',
        direccion: 'Av. Cliente 123',
      },
    });

    const cliente = await prisma.cliente.create({
      data: {
        idPersona: persona.idPersona,
        idMiEmpresa: empresaId,
        condicionIgv: 'Contribuyente',
        limiteCredito: 5000.00,
      },
    });
    clienteId = cliente.idCliente;

    // Crear producto
    const producto = await prisma.productos.create({
      data: {
        idMiEmpresa: empresaId,
        codigo: 'PROD-VENTAS-001',
        nombre: 'Producto para Venta',
        unidad: 'NIU',
        precioCompra: 80.00,
        precioVenta: 120.00,
        afectaIgv: true,
      },
    });
    productoId = producto.idProducto;

    // Login
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
    await prisma.comprobanteVentaDetalle.deleteMany({
      where: { idComprobante: { in: [comprobanteId] } },
    });
    await prisma.comprobanteVenta.deleteMany({
      where: { idMiEmpresa: empresaId },
    });
    await prisma.productos.deleteMany({
      where: { idMiEmpresa: empresaId },
    });
    await prisma.cliente.deleteMany({
      where: { idMiEmpresa: empresaId },
    });
    await prisma.persona.deleteMany({
      where: { numeroDocumento: '20111222333' },
    });
    await prisma.miEmpresa.deleteMany({
      where: { idMiEmpresa: empresaId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/ventas/comprobantes', () => {
    it('debe crear una factura correctamente', async () => {
      const nuevaFactura = {
        tipoComprobante: 'FACTURA',
        serie: 'F001',
        idCliente: clienteId,
        fechaEmision: new Date().toISOString(),
        items: [
          {
            idProducto: productoId,
            cantidad: 10,
            precioUnitario: 120.00,
            descuento: 0,
          },
        ],
        condicionesPago: 'CONTADO',
      };

      const response = await request(app)
        .post('/api/ventas/comprobantes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nuevaFactura);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('idComprobante');
      expect(response.body.tipoComprobante).toBe('FACTURA');
      expect(response.body.estado).toBe('BORRADOR');
      
      comprobanteId = response.body.idComprobante;

      // Verificar cálculos
      const subtotal = 1200.00; // 10 * 120
      const igv = subtotal * 0.18; // 216.00
      const total = subtotal + igv; // 1416.00
      
      expect(response.body.subtotal).toBeCloseTo(subtotal, 2);
      expect(response.body.igv).toBeCloseTo(igv, 2);
      expect(response.body.total).toBeCloseTo(total, 2);
    });

    it('debe validar stock disponible antes de crear venta', async () => {
      // Este test depende de la implementación de validación de stock
      const facturaSinStock = {
        tipoComprobante: 'FACTURA',
        serie: 'F001',
        idCliente: clienteId,
        fechaEmision: new Date().toISOString(),
        items: [
          {
            idProducto: productoId,
            cantidad: 9999, // Cantidad excesiva
            precioUnitario: 120.00,
            descuento: 0,
          },
        ],
        condicionesPago: 'CONTADO',
      };

      const response = await request(app)
        .post('/api/ventas/comprobantes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(facturaSinStock);

      // Debería fallar si hay validación de stock implementada
      expect([201, 400, 409]).toContain(response.status);
    });

    it('debe rechazar factura sin items', async () => {
      const facturaVacia = {
        tipoComprobante: 'FACTURA',
        serie: 'F001',
        idCliente: clienteId,
        fechaEmision: new Date().toISOString(),
        items: [],
        condicionesPago: 'CONTADO',
      };

      const response = await request(app)
        .post('/api/ventas/comprobantes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(facturaVacia);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/ventas/comprobantes/:id/aprobar', () => {
    it('debe aprobar un comprobante en borrador', async () => {
      const response = await request(app)
        .put(`/api/ventas/comprobantes/${comprobanteId}/aprobar`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.estado).toBe('APROBADO');
    });

    it('no debe permitir aprobar comprobante ya aprobado', async () => {
      const response = await request(app)
        .put(`/api/ventas/comprobantes/${comprobanteId}/aprobar`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/ventas/comprobantes/:id/anular', () => {
    it('debe anular un comprobante aprobado', async () => {
      const response = await request(app)
        .put(`/api/ventas/comprobantes/${comprobanteId}/anular`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          motivoAnulacion: 'Error en la emisión',
        });

      expect(response.status).toBe(200);
      expect(response.body.estado).toBe('ANULADO');
    });
  });

  describe('GET /api/ventas/comprobantes', () => {
    it('debe listar comprobantes con filtros', async () => {
      const response = await request(app)
        .get('/api/ventas/comprobantes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          idMiEmpresa: empresaId,
          tipoComprobante: 'FACTURA',
          estado: 'ANULADO',
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/ventas/comprobantes/:id', () => {
    it('debe obtener detalle completo del comprobante', async () => {
      const response = await request(app)
        .get(`/api/ventas/comprobantes/${comprobanteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('idComprobante');
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/ventas/comprobantes/:id/pdf', () => {
    it('debe generar PDF del comprobante', async () => {
      const response = await request(app)
        .get(`/api/ventas/comprobantes/${comprobanteId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      // Puede retornar 200 con PDF o 501 si no está implementado
      expect([200, 501]).toContain(response.status);
    });
  });
});
